package app.copyreader.clean;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.GZIPInputStream;

/** All code is local. No third-party scripts, SDKs or remote HTML enter this WebView. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
    private static final String DEFAULT_API = "https://api.2024manga.com";
    private static final String DEFAULT_ACCOUNT_API = "https://api.copy202601.com";
    private final ExecutorService io = Executors.newFixedThreadPool(4);
    private final ExecutorService accountIo = Executors.newSingleThreadExecutor();
    private final Semaphore images = new Semaphore(3);
    private final List<String> discovered = new CopyOnWriteArrayList<>();
    private WebView web;
    private SharedPreferences prefs;
    private SessionVault vault;
    private final Object accountLock = new Object();
    private File imageDir, apiDir;
    private volatile boolean reading, volume = true, destroyed;
    private volatile String exportText = "";
    private FrameLayout root;
    private View statusBarFill, navigationBarFill;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences("reader", MODE_PRIVATE);
        vault = new SessionVault(this);
        imageDir = new File(getCacheDir(), "images"); imageDir.mkdirs();
        apiDir = new File(getCacheDir(), "api"); apiDir.mkdirs();
        root = new FrameLayout(this);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(247,246,242));
        root.addView(web, new FrameLayout.LayoutParams(-1,-1));
        statusBarFill=new View(this);navigationBarFill=new View(this);
        root.addView(statusBarFill,new FrameLayout.LayoutParams(-1,0,Gravity.TOP));
        root.addView(navigationBarFill,new FrameLayout.LayoutParams(-1,0,Gravity.BOTTOM));
        setContentView(root);
        if (android.os.Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int top = insets.getSystemWindowInsetTop(), bottom = insets.getSystemWindowInsetBottom();
            FrameLayout.LayoutParams content=(FrameLayout.LayoutParams)web.getLayoutParams();
            content.setMargins(insets.getSystemWindowInsetLeft(),top,insets.getSystemWindowInsetRight(),bottom);web.setLayoutParams(content);
            FrameLayout.LayoutParams status=(FrameLayout.LayoutParams)statusBarFill.getLayoutParams();status.height=top;statusBarFill.setLayoutParams(status);
            FrameLayout.LayoutParams navigation=(FrameLayout.LayoutParams)navigationBarFill.getLayoutParams();navigation.height=bottom;navigationBarFill.setLayoutParams(navigation);
            return insets;
        });
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false); s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false); s.setAllowUniversalAccessFromFileURLs(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false); s.setSupportMultipleWindows(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportZoom(true); s.setBuiltInZoomControls(true); s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setUserAgentString(UA);
        android.webkit.CookieManager.getInstance().setAcceptCookie(false);
        web.addJavascriptInterface(new Bridge(), "ReaderNative");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return true; // Navigation stays in the local application. No ad/deep-link popups.
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("data".equals(u.getScheme())) {
                    if (req.isForMainFrame() || !"GET".equals(req.getMethod())) return empty(403);
                    byte[] png=LocalImageProtocol.png(u.toString());
                    return png==null?empty(403):new WebResourceResponse("image/png",null,200,"OK",headers(),new ByteArrayInputStream(png));
                }
                if (!"appassets.androidplatform.net".equals(u.getHost()) || !"https".equals(u.getScheme())) return empty(403);
                String path=u.getPath();
                try {
                    if ("/image".equals(path)) return loadImage(u.getQueryParameter("url"));
                    if (path != null && path.startsWith("/assets/") && !path.contains("..")) {
                        String name=path.substring(8);
                        String mime=name.endsWith(".css")?"text/css":name.endsWith(".js")?"application/javascript":name.endsWith(".svg")?"image/svg+xml":"text/html";
                        return new WebResourceResponse(mime,"UTF-8",200,"OK",headers(),getAssets().open(name));
                    }
                } catch(Exception e) { return empty(404); }
                return empty(404);
            }
            @Override public void onPageFinished(WebView view, String url) {
                applyChrome(prefs.getBoolean("dark",false),false);
            }
        });
        applyChrome(prefs.getBoolean("dark",false),false);
        web.loadUrl(ORIGIN+"/assets/index.html");
        io.execute(() -> { pruneImages(); discoverHosts(); });
    }

    private Map<String,String> headers() {
        Map<String,String> h=new HashMap<>();
        h.put("Cache-Control","no-store"); h.put("X-Content-Type-Options","nosniff");
        h.put("Content-Security-Policy","default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'");
        return h;
    }
    private WebResourceResponse empty(int status) {
        return new WebResourceResponse("text/plain","UTF-8",status,"Blocked",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
    }
    private static String hash(String s) throws Exception {
        byte[] b=MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
        StringBuilder out=new StringBuilder();for(byte v:b)out.append(String.format(Locale.ROOT,"%02x",v & 255));return out.toString();
    }
    private static byte[] readBytes(InputStream in, int max) throws IOException {
        try(InputStream input=in; ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            byte[] buffer=new byte[16384];int n,total=0;
            while((n=input.read(buffer))!=-1){total+=n;if(total>max)throw new IOException("返回内容过大");out.write(buffer,0,n);}return out.toByteArray();
        }
    }
    private static void writeFile(File file, byte[] data) throws IOException {
        File tmp=File.createTempFile("write-",".tmp",file.getParentFile());
        try(FileOutputStream out=new FileOutputStream(tmp)){out.write(data);}
        if(!tmp.renameTo(file)) { tmp.delete(); throw new IOException("写入缓存失败"); }
    }
    private static String safeHttps(String value) throws Exception {
        URL u=new URL(value); String h=u.getHost().toLowerCase(Locale.ROOT);
        if(!"https".equals(u.getProtocol()) || u.getUserInfo()!=null || (u.getPort()!=-1 && u.getPort()!=443) || h.isEmpty() || h.equals("localhost") || h.endsWith(".local") || h.contains(":") || h.matches("[0-9.]+") || !h.matches("[a-z0-9.-]+")) throw new IOException("请使用有效的 HTTPS 网址");
        return u.toExternalForm();
    }
    private HttpURLConnection connect(String address, boolean image) throws Exception {
        String target=safeHttps(address);
        for(int i=0;i<4;i++) {
            HttpURLConnection c=(HttpURLConnection)new URL(target).openConnection();
            c.setConnectTimeout(6500);c.setReadTimeout(image?18000:14000);c.setInstanceFollowRedirects(false);
            c.setRequestProperty("User-Agent",UA);
            c.setRequestProperty("Accept",image?"image/avif,image/webp,image/*,*/*;q=0.8":"application/json");
            if(image) c.setRequestProperty("Referer","https://www.manga2026.xyz/");
            else {c.setRequestProperty("platform","3");c.setRequestProperty("version","2024.4.28");c.setRequestProperty("source","com.manga2020.app");c.setRequestProperty("region","1");c.setRequestProperty("webp","1");}
            int code=c.getResponseCode();
            if(code>=300 && code<400){String next=c.getHeaderField("Location");c.disconnect();if(next==null)throw new IOException("无效重定向");target=safeHttps(new URL(new URL(target),next).toString());continue;}
            if(code!=200){c.disconnect();throw new IOException("服务器返回 HTTP "+code);} return c;
        }
        throw new IOException("重定向过多");
    }
    private JSONObject fetchJson(String address) throws Exception {
        HttpURLConnection c=connect(address,false);
        try {
            InputStream in=c.getInputStream();if("gzip".equalsIgnoreCase(c.getContentEncoding()))in=new GZIPInputStream(in);
            return new JSONObject(new String(readBytes(in,8*1024*1024),StandardCharsets.UTF_8));
        } finally { c.disconnect(); }
    }
    private void discoverHosts() {
        try {
            JSONObject obj=fetchJson(DEFAULT_API+"/api/v3/system/network2?platform=3");
            JSONArray groups=obj.getJSONObject("results").optJSONArray("api");
            if(groups==null)return;
            for(int i=0;i<groups.length();i++){JSONArray group=groups.optJSONArray(i);if(group==null)continue;
                for(int j=0;j<group.length();j++){String host=group.optString(j);if(host.matches("[a-zA-Z0-9.-]+"))discovered.add("https://"+host);}}
        } catch(Exception ignored) { /* The primary endpoint remains usable. */ }
    }
    private JSONObject api(String path, boolean refresh) throws Exception {
        String chosen=prefs.getString("api",DEFAULT_API), key=hash(chosen+path);
        File cache=new File(apiDir,key+".json");
        if(!refresh && cache.exists() && System.currentTimeMillis()-cache.lastModified()<120000) return new JSONObject(new String(readBytes(new FileInputStream(cache),8*1024*1024),StandardCharsets.UTF_8));
        LinkedHashSet<String> hosts=new LinkedHashSet<>(); hosts.add(chosen);
        if(chosen.equals(DEFAULT_API)) {String last=prefs.getString("last_api","");if(!last.isEmpty())hosts.add(last);hosts.addAll(discovered);}
        Exception failure=null;int attempts=0;
        for(String host:hosts){ if(attempts++>=3)break;
            try {
                JSONObject data=fetchJson(host+path);int code=data.optInt("code",0);
                if(code!=200)throw new IOException(data.optString("message","数据源暂时不可用")+"（"+code+"）");
                try { writeFile(cache,data.toString().getBytes(StandardCharsets.UTF_8)); } catch(IOException ignored) {}
                if(chosen.equals(DEFAULT_API))prefs.edit().putString("last_api",host).apply();return data;
            }catch(Exception e){failure=e;}
        }
        if(cache.exists()) {JSONObject old=new JSONObject(new String(readBytes(new FileInputStream(cache),8*1024*1024),StandardCharsets.UTF_8));old.put("_stale",true);return old;}
        throw failure==null?new IOException("暂无可用线路"):failure;
    }
    private String enc(String s) throws Exception {return URLEncoder.encode(s,"UTF-8");}
    private JSONObject safeProfile(JSONObject source) throws Exception {
        JSONObject p=new JSONObject();for(String key:new String[]{"user_id","username","nickname","avatar"}){String value=source.optString(key,"");if(!value.equals("null"))p.put(key,value.length()>2048?value.substring(0,2048):value);}return p;
    }
    private JSONObject accountState() throws Exception {
        JSONObject s=vault.read();return s==null?new JSONObject().put("loggedIn",false):new JSONObject().put("loggedIn",true).put("profile",s.getJSONObject("profile")).put("host",s.getString("host"));
    }
    private JSONObject signed(String path,String method,String body) throws Exception {
        JSONObject session=vault.read();if(session==null)throw new AccountProtocol.Failure("请先登录拷贝漫画账号",true);
        String token=session.getString("token");
        try {
            JSONObject response=new AccountProtocol(session.getString("host"),session.optString("protocol","legacy").equals("legacy")).call(path,method,body,token);
            JSONObject data=response.optJSONObject("results");if(data!=null&&data.has("is_login")&&!data.optBoolean("is_login"))throw new AccountProtocol.Failure("登录状态已过期，请重新登录",true);
            synchronized(accountLock){JSONObject current=vault.read();if(current==null||!token.equals(current.optString("token")))throw new AccountProtocol.Failure("账号已切换，请重新加载",true);}
            return response;
        }catch(AccountProtocol.Failure e){
            if(e.expired)synchronized(accountLock){JSONObject current=vault.read();if(current!=null&&token.equals(current.optString("token")))vault.clear();}
            throw e;
        }
    }
    private JSONObject accountLogin(JSONObject a) throws Exception {
        synchronized(accountLock){
            String host=prefs.getString("account_api",DEFAULT_ACCOUNT_API),protocol=prefs.getString("account_protocol","modern"),username=a.optString("username"),password=a.optString("password");
            JSONObject data;
            try{data=new AccountProtocol(host,protocol.equals("legacy")).login(username,password);}catch(AccountProtocol.Failure e){throw new AccountProtocol.Failure(e.getMessage(),false,e.status);}
            JSONObject profile=safeProfile(data);if(profile.optString("username").isEmpty())profile.put("username",username);
            vault.write(new JSONObject().put("token",data.getString("token")).put("host",host).put("profile",profile).put("protocol",protocol));
            return accountState();
        }
    }
    private JSONObject signedOrPublic(String path,boolean refresh) throws Exception {
        if(vault.read()!=null)try{return signed(path,"GET",null);}catch(AccountProtocol.Failure e){if(e.expired||e.status!=404)throw e;}
        return api(path,refresh);
    }
    private String word(JSONObject args,String key) throws Exception {String v=args.getString(key);if(!v.matches("[A-Za-z0-9_-]{1,200}"))throw new IOException("无效的漫画或章节标识");return v;}
    private JSONObject perform(String method,JSONObject a) throws Exception {
        int offset=Math.max(0,a.optInt("offset",0));String path;
        switch(method){
            case "comments":return new CommentProtocol(prefs.getString("account_api",DEFAULT_ACCOUNT_API),prefs.getString("account_protocol","modern").equals("legacy")).list(a);
            case "postComment":CommentProtocol.Post post;try{post=CommentProtocol.preparePost(a);}catch(IOException e){throw new AccountProtocol.Failure(e.getMessage(),false,400);}return signed(post.path,"POST",post.body);
            case "account":return accountState();
            case "login":return accountLogin(a);
            case "logout":synchronized(accountLock){vault.clear();}return new JSONObject().put("loggedIn",false);
            case "cloudShelf":return signed("/api/v3/member/collect/comics?limit=30&offset="+offset+"&free_type=1&ordering=-datetime_updated&platform=3","GET",null);
            case "cloudStatus":return signed("/api/v3/comic2/"+word(a,"comic")+"/query?platform=3","GET",null);
            case "cloudAdd":return signed("/api/v3/member/collect/comic?platform=3","POST","comic_id="+enc(word(a,"comicId"))+"&is_collect=1");
            case "cloudRemove":long shelfId=a.optLong("shelfId",0);if(shelfId<=0)throw new IOException("未取得账号书架记录，请刷新后重试");return signed("/api/v3/member/collect/comics?platform=3","DELETE","ids="+shelfId);
            case "list":
                String mode=a.optString("mode","latest"),theme=a.optString("theme","");
                path="/api/v3/comics?limit=24&offset="+offset+"&ordering="+(mode.equals("popular")?"-popular":"-datetime_updated")+"&platform=3";
                if(!theme.isEmpty())path+="&theme="+enc(theme);return api(path,a.optBoolean("refresh"));
            case "search":return api("/api/v3/search/comic?limit=24&offset="+offset+"&q="+enc(a.optString("q",""))+"&q_type=&platform=3",a.optBoolean("refresh"));
            case "detail":return signedOrPublic("/api/v3/comic2/"+word(a,"comic")+"?platform=3",a.optBoolean("refresh"));
            case "chapters":return api("/api/v3/comic/"+word(a,"comic")+"/group/"+word(a,"group")+"/chapters?limit=100&offset="+offset+"&platform=3",a.optBoolean("refresh"));
            case "chapter":
                path="/api/v3/comic/"+word(a,"comic")+"/chapter/"+word(a,"chapter")+"?platform=3";
                JSONObject original=signedOrPublic(path,a.optBoolean("refresh"));
                Object payload=original.opt("results");
                if(!(payload instanceof JSONObject) || !((JSONObject)payload).has("chapter"))throw new IOException("当前章节数据格式暂不支持");
                return original;
            case "ping":JSONObject ping=api("/api/v3/comics?limit=1&offset=0&platform=3",true);if(ping.optBoolean("_stale"))throw new IOException("当前线路连接失败，正在保留之前的缓存");return ping;
            case "cache":JSONObject c=new JSONObject();long bytes=0;File[] fs=imageDir.listFiles();if(fs!=null)for(File f:fs)bytes+=f.length();return c.put("bytes",bytes);
            case "clearCache":for(File dir:new File[]{imageDir,apiDir}){File[] files=dir.listFiles();if(files!=null)for(File f:files)f.delete();}return new JSONObject();
            default:throw new IOException("不支持的操作");
        }
    }
    private WebResourceResponse loadImage(String address) {
        boolean acquired=false;
        try {
            safeHttps(address);File f=new File(imageDir,hash(address)+".img");
            if(!f.exists()) {
                images.acquire();acquired=true;
                if(!f.exists()){
                    HttpURLConnection c=connect(address,true);
                    try {
                        String type=c.getContentType();if(type!=null && !type.startsWith("image/") && !type.contains("octet-stream"))throw new IOException("图片响应无效");
                        byte[] data=readBytes(c.getInputStream(),20*1024*1024);
                        if(data.length<12)throw new IOException("图片为空");
                        writeFile(f,data);
                    } finally {c.disconnect();}
                }
            }
            f.setLastModified(System.currentTimeMillis());
            FileInputStream stream=new FileInputStream(f);byte[] head=new byte[12];stream.read(head);stream.close();
            String mime=head[0]==(byte)0x89?"image/png":head[0]==(byte)0xff?"image/jpeg":head[0]=='G'?"image/gif":head[8]=='W'?"image/webp":"image/avif";
            Map<String,String> h=new HashMap<>();h.put("Cache-Control","public, max-age=86400");h.put("X-Content-Type-Options","nosniff");
            if(imageDir.list()!=null && imageDir.list().length%30==0)io.execute(() -> pruneImages());
            return new WebResourceResponse(mime,null,200,"OK",h,new FileInputStream(f));
        } catch(Exception e) {return empty(502);} finally {if(acquired)images.release();}
    }
    private synchronized void pruneImages() {
        File[] files=imageDir.listFiles();if(files==null)return;
        Arrays.sort(files,Comparator.comparingLong(File::lastModified));long total=0;for(File f:files)total+=f.length();
        for(File f:files){if(total<=120L*1024*1024)break;long size=f.length();if(f.delete())total-=size;}
    }
    private void js(String code){runOnUiThread(() -> {if(!destroyed && web!=null)web.evaluateJavascript(code,null);});}
    private void applyChrome(boolean dark, boolean reader) {
        int background=reader?Color.rgb(20,20,20):dark?Color.rgb(25,25,25):Color.rgb(247,246,242);
        int status=background;
        root.setBackgroundColor(background);if(web!=null)web.setBackgroundColor(background);
        statusBarFill.setBackgroundColor(status);navigationBarFill.setBackgroundColor(background);
        getWindow().setStatusBarColor(status);getWindow().setNavigationBarColor(background);
        if(android.os.Build.VERSION.SDK_INT>=29){getWindow().setNavigationBarContrastEnforced(false);getWindow().setStatusBarContrastEnforced(false);}
        getWindow().getDecorView().setSystemUiVisibility(!dark&&!reader?View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR|View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR:0);
    }
    public final class Bridge {
        @JavascriptInterface public String readState(){return prefs.getString("state","{}");}
        @JavascriptInterface public boolean saveState(String state){if(state==null||state.length()>=3000000)return false;try{new JSONObject(state);prefs.edit().putString("state",state).apply();return true;}catch(Exception ignored){return false;}}
        @JavascriptInterface public String getApi(){return prefs.getString("api",DEFAULT_API);}
        @JavascriptInterface public String getAccountApi(){return prefs.getString("account_api",DEFAULT_ACCOUNT_API);}
        @JavascriptInterface public String getAccountProtocol(){return prefs.getString("account_protocol","modern");}
        @JavascriptInterface public String setAccountApi(String value,String protocol){try{String u=safeHttps(value.trim());URL v=new URL(u);if((!"".equals(v.getPath())&&!"/".equals(v.getPath()))||v.getQuery()!=null||v.getRef()!=null)return "只填写账号接口域名，不包含路径或参数";if(!protocol.equals("modern")&&!protocol.equals("legacy"))return "请选择新版或旧版协议";prefs.edit().putString("account_api",u.replaceAll("/+$","")).putString("account_protocol",protocol).apply();return "";}catch(Exception e){return "请填写有效的 HTTPS 账号接口域名";}}
        @JavascriptInterface public String setApi(String value){try{String u=safeHttps(value.trim());URL v=new URL(u);if((!"".equals(v.getPath())&&!"/".equals(v.getPath()))||v.getQuery()!=null||v.getRef()!=null)return "只填写域名，不包含路径或参数";prefs.edit().putString("api",u.replaceAll("/+$","")).apply();return "";}catch(Exception e){return "请填写有效的 HTTPS 域名";}}
        @JavascriptInterface public void call(String id,String method,String args){
            if(id==null||!id.matches("[0-9]{1,12}"))return;
            ExecutorService executor=(method.equals("login")||method.equals("logout")||method.equals("account")||method.equals("postComment"))?accountIo:io;
            executor.execute(() -> {JSONObject result=new JSONObject();try{result.put("ok",true);result.put("data",perform(method,new JSONObject(args)));}catch(Exception e){try{String msg=e.getMessage();if(method.equals("postComment")&&e instanceof IOException&&!(e instanceof AccountProtocol.Failure)){msg="发送结果未确认，请先刷新评论检查后再决定是否重发";result.put("code","COMMENT_UNCONFIRMED");}else{if(e instanceof SocketTimeoutException)msg="连接超时，请重试或切换线路";if(e instanceof UnknownHostException)msg="无法解析数据源，请检查网络或更换线路";}if(e instanceof AccountProtocol.Failure&&((AccountProtocol.Failure)e).expired)result.put("code","AUTH_EXPIRED");result.put("ok",false).put("error",msg==null?"网络请求失败，请稍后重试":msg);}catch(Exception ignored){}}js("window.NativeResult&&window.NativeResult("+JSONObject.quote(id)+","+result+")");});
        }
        @JavascriptInterface public void chrome(boolean dark,boolean active,boolean useVolume){reading=active;volume=useVolume;prefs.edit().putBoolean("dark",dark).apply();runOnUiThread(() -> {applyChrome(dark,active);if(active)getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);});}
        @JavascriptInterface public void exportData(String data){
            if(data==null||data.length()>3000000)return;exportText=data;
            runOnUiThread(() -> {Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,"CopyReader-backup.json");startActivityForResult(i,101);});
        }
        @JavascriptInterface public void importData(){runOnUiThread(() -> {Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");startActivityForResult(i,102);});}
        @JavascriptInterface public void exit(){runOnUiThread(() -> finish());}
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);if(result!=RESULT_OK||data==null||data.getData()==null)return;Uri uri=data.getData();
        io.execute(() -> {try {
            if(request==101){try(OutputStream out=getContentResolver().openOutputStream(uri)){if(out==null)throw new IOException();out.write(exportText.getBytes(StandardCharsets.UTF_8));}exportText="";js("window.NativeNotice&&window.NativeNotice('备份已导出')");}
            if(request==102){String value=new String(readBytes(getContentResolver().openInputStream(uri),4000000),StandardCharsets.UTF_8);new JSONObject(value);js("window.onImported&&window.onImported("+JSONObject.quote(value)+")");}
        }catch(Exception e){js("window.NativeNotice&&window.NativeNotice('文件操作失败，请检查文件格式或保存位置')");}});
    }
    @Override public void onBackPressed(){js("window.AppBack&&window.AppBack()");}
    @Override public boolean onKeyDown(int code,KeyEvent event){if(reading&&volume&&(code==KeyEvent.KEYCODE_VOLUME_UP||code==KeyEvent.KEYCODE_VOLUME_DOWN)){js("window.ReaderStep&&window.ReaderStep("+(code==KeyEvent.KEYCODE_VOLUME_DOWN?1:-1)+")");return true;}return super.onKeyDown(code,event);}
    @Override public boolean onKeyUp(int code,KeyEvent event){if(reading&&volume&&(code==KeyEvent.KEYCODE_VOLUME_UP||code==KeyEvent.KEYCODE_VOLUME_DOWN))return true;return super.onKeyUp(code,event);}
    @Override protected void onPause(){js("window.persistReading&&window.persistReading()");super.onPause();if(web!=null)web.onPause();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){destroyed=true;io.shutdownNow();accountIo.shutdownNow();if(web!=null){web.removeJavascriptInterface("ReaderNative");root.removeView(web);web.destroy();web=null;}super.onDestroy();}
}
