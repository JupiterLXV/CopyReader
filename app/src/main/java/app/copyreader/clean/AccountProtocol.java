package app.copyreader.clean;

import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.zip.GZIPInputStream;

/** Account requests never use public-image connections, a disk cache or redirects. */
final class AccountProtocol {
    interface Connections { HttpURLConnection open(URL url) throws IOException; }
    static final class Failure extends IOException {
        final boolean expired;
        final int status;
        Failure(String message, boolean expired) { this(message,expired,0); }
        Failure(String message, boolean expired,int status) { super(message); this.expired=expired;this.status=status; }
    }
    private final String origin;
    private final Connections connections;
    private final boolean legacy;
    AccountProtocol(String origin) throws Exception { this(origin,false); }
    AccountProtocol(String origin,boolean legacy) throws Exception { this(origin,url -> (HttpURLConnection)url.openConnection(),legacy); }
    AccountProtocol(String origin, Connections connections) throws Exception {this(origin,connections,false);}
    AccountProtocol(String origin, Connections connections,boolean legacy) throws Exception {
        URI u=new URI(origin);String host=u.getHost();
        if(!"https".equals(u.getScheme())||host==null||u.getUserInfo()!=null||u.getQuery()!=null||u.getFragment()!=null||(!u.getPath().isEmpty()&&!u.getPath().equals("/"))||(u.getPort()!=-1&&u.getPort()!=443))throw new IOException("账号线路必须是 HTTPS 域名");
        this.origin="https://"+host.toLowerCase(java.util.Locale.ROOT);this.connections=connections;this.legacy=legacy;
    }
    static String enc(String value) throws Exception { return URLEncoder.encode(value,"UTF-8"); }
    JSONObject login(String username,String password) throws Exception {
        if(username==null||username.trim().isEmpty()||password==null||password.isEmpty())throw new Failure("请输入账号和密码",false);
        if(username.length()>200||password.length()>512)throw new Failure("账号或密码长度超出支持范围",false);
        int salt=new SecureRandom().nextInt(10000);
        String encoded=Base64.getEncoder().encodeToString((password+"-"+salt).getBytes(StandardCharsets.UTF_8));
        String body="username="+enc(username.trim())+"&password="+enc(encoded)+"&salt="+salt+(legacy?"&platform=3&version=2024.4.28&source=Official":"");
        JSONObject response;
        try{response=call(legacy?"/api/v3/login?platform=3":"/api/v3/login","POST",body,null);}catch(Failure e){
            String message=e.getMessage();
            if(message.contains("賬戶不存在")||message.contains("账户不存在")||message.contains("帳號不存在")||message.contains("账号不存在"))throw new Failure("当前账号线路未找到该用户名。请使用注册用户名，而不是昵称或UID；若同一用户名在原版可用，请检查账号线路。原始提示："+message,false,e.status);
            throw e;
        }
        JSONObject data=response.optJSONObject("results");
        if(data==null||data.optString("token").isEmpty())throw new Failure("数据源未返回登录凭证，请确认账号或接口版本",false);
        return data;
    }
    JSONObject call(String path,String method,String body,String token) throws Exception {
        if(!path.startsWith("/api/v3/")||path.contains("#")||path.contains("\r")||path.contains("\n"))throw new IOException("无效的账号请求");
        if(token!=null&&(token.isEmpty()||token.length()>8192||token.contains("\r")||token.contains("\n")))throw new Failure("登录凭证格式无效，请重新登录",true);
        if(!legacy)path=path.replaceAll("([?&])platform=3(?=&|$)","$1platform=1");
        HttpURLConnection c=connections.open(new URL(origin+path));
        try {
            c.setRequestMethod(method);c.setInstanceFollowRedirects(false);
            c.setConnectTimeout(8000);c.setReadTimeout(18000);
            c.setUseCaches(false);c.setRequestProperty("Cache-Control","no-store");
            c.setRequestProperty("User-Agent",legacy?"Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/141.0.0.0 Mobile Safari/537.36":"COPY/3.0.0");
            c.setRequestProperty("Accept","application/json");c.setRequestProperty("platform",legacy?"3":"1");c.setRequestProperty("version",legacy?"2024.4.28":"2025.08.15");if(legacy)c.setRequestProperty("source","com.manga2020.app");c.setRequestProperty("region","1");c.setRequestProperty("webp","1");
            if(token!=null)c.setRequestProperty("Authorization","Token "+token);
            if(body!=null){if(token!=null&&legacy)body+="&authorization="+enc("Token "+token);byte[] bytes=body.getBytes(StandardCharsets.UTF_8);c.setRequestProperty("Content-Type","application/x-www-form-urlencoded;charset=utf-8");c.setDoOutput(true);c.setFixedLengthStreamingMode(bytes.length);try(OutputStream out=c.getOutputStream()){out.write(bytes);}}
            int status=c.getResponseCode();
            if(status>=300&&status<400)throw new Failure("账号线路发生跳转，请检查接口地址后重新登录",false,status);
            InputStream stream=status>=400?c.getErrorStream():c.getInputStream();
            if(stream==null)throw new Failure("账号服务器返回 HTTP "+status,status==401,status);
            if("gzip".equalsIgnoreCase(c.getContentEncoding()))stream=new GZIPInputStream(stream);
            String text;
            try(InputStream in=stream;ByteArrayOutputStream out=new ByteArrayOutputStream()) {
                byte[] bytes=new byte[8192];int n,total=0;while((n=in.read(bytes))!=-1){total+=n;if(total>8*1024*1024)throw new IOException("账号响应过大");out.write(bytes,0,n);}text=new String(out.toByteArray(),StandardCharsets.UTF_8);
            }
            JSONObject data;try{data=new JSONObject(text);}catch(Exception e){throw new Failure("账号接口暂时无法解析（HTTP "+status+"），请稍后重试",false,status);}
            int code=data.optInt("code",status);
            if(status<200||status>=300||code!=200){String message=data.optString("message",data.optString("detail","账号请求失败（HTTP "+status+"）"));if(message.length()>350)message=message.substring(0,350);throw new Failure(message,status==401||code==401||code==449,status);}
            return data;
        } finally {c.disconnect();}
    }
}
