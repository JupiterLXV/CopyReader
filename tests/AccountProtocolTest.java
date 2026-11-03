package app.copyreader.clean;

import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Runs the production Java account protocol against in-memory HTTP responses. */
public final class AccountProtocolTest {
    static int passed;
    static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
    static void pass(String message){passed++;System.out.println("PASS "+message);}
    static final class Fake extends HttpURLConnection {
        final int status;final byte[] response;final ByteArrayOutputStream sent=new ByteArrayOutputStream();boolean closed;
        Fake(URL url,int status,String body){super(url);this.status=status;response=body.getBytes(StandardCharsets.UTF_8);}
        public void connect(){}public boolean usingProxy(){return false;}public void disconnect(){closed=true;}
        public int getResponseCode(){return status;}
        public InputStream getInputStream(){return new ByteArrayInputStream(response);}
        public InputStream getErrorStream(){return new ByteArrayInputStream(response);}
        public OutputStream getOutputStream(){return sent;}
        public String getHeaderField(String key){return key.equals("Location")?"https://other.example/stolen":null;}
    }
    static final class Factory implements AccountProtocol.Connections {
        int count,status=200;String response="{\"code\":200,\"results\":{}}";Fake last;
        public HttpURLConnection open(URL u){count++;return last=new Fake(u,status,response);}
    }
    static Map<String,String> form(Fake c)throws Exception {
        Map<String,String> data=new HashMap<>();for(String pair:new String(c.sent.toByteArray(),StandardCharsets.UTF_8).split("&")){String[] bits=pair.split("=",2);data.put(URLDecoder.decode(bits[0],"UTF-8"),bits.length<2?"":URLDecoder.decode(bits[1],"UTF-8"));}return data;
    }
    public static void main(String[] args)throws Exception {
        Factory f=new Factory();AccountProtocol protocol=new AccountProtocol("https://account.example",f);
        f.response="{\"code\":200,\"results\":{\"token\":\"fixture-native-token\",\"username\":\"reader\"}}";
        String password="Fixture+/&= 密码";
        JSONObject login=protocol.login(" 用户 &+ ",password);Map<String,String> data=form(f.last);
        check(data.get("username").equals("用户 &+"),"username must survive form encoding");
        String decoded=new String(Base64.getDecoder().decode(data.get("password")),StandardCharsets.UTF_8);
        check(decoded.equals(password+"-"+data.get("salt")),"password must survive base64 plus and form encoding");
        check(login.getString("token").equals("fixture-native-token"),"login result");
        check(f.last.getRequestProperty("Authorization")==null,"no previous token on password login");
        check(f.last.getURL().getHost().equals("account.example")&&f.last.getURL().getQuery()==null,"no credentials or obsolete login platform query in URL");
        check(data.size()==3&&!data.containsKey("source")&&!data.containsKey("version")&&!data.containsKey("platform"),"modern login must omit obsolete source and app fields");
        check(f.last.getRequestProperty("User-Agent").equals("COPY/3.0.0")&&f.last.getRequestProperty("version").equals("2025.08.15")&&f.last.getRequestProperty("platform").equals("1"),"modern account headers");
        pass("modern password login uses the current fields and preserves Unicode and form-special characters");
        protocol.call("/api/v3/member/collect/comics?platform=3","GET",null,"native-secret");
        check("Token native-secret".equals(f.last.getRequestProperty("Authorization")),"authorization header");
        check(!f.last.getUseCaches()&&!f.last.getInstanceFollowRedirects(),"no account caching or redirects");
        check(f.last.getDoOutput()==false,"GET must not send a body");pass("account GET uses native Authorization and disables caching and redirects");
        protocol.call("/api/v3/member/collect/comic?platform=3","POST","comic_id=abcd&is_collect=1","secret+/=");
        check(!form(f.last).containsKey("authorization")&&f.last.getRequestProperty("Authorization").equals("Token secret+/="),"modern authorization stays in header");
        check(f.last.getURL().getQuery().equals("platform=1"),"normalize modern account platform query");
        check(form(f.last).get("comic_id").equals("abcd"),"comic UUID preserved");pass("modern cloud writes use account headers and normalize platform");
        AccountProtocol legacy=new AccountProtocol("https://old.example",f,true);legacy.login("reader",password);
        check(form(f.last).get("source").equals("Official")&&form(f.last).get("platform").equals("3")&&f.last.getRequestProperty("version").equals("2024.4.28"),"legacy login fields retained only in explicit legacy mode");
        legacy.call("/api/v3/member/collect/comic?platform=3","POST","comic_id=abcd","secret+/=");check(form(f.last).get("authorization").equals("Token secret+/="),"legacy form authorization encoding");pass("explicit legacy mode preserves old login and collection protocol");
        int before=f.count;f.status=302;
        try{protocol.login("reader",password);throw new AssertionError("redirect accepted");}catch(AccountProtocol.Failure expected){check(!expected.expired,"redirect is not expiration");}
        check(f.count==before+1&&f.last.closed,"never follow redirected credentials");pass("login redirects are rejected without forwarding credentials");
        f.status=210;f.response="{\"code\":210,\"message\":\"账号或密码错误\"}";
        try{protocol.login("reader",password);throw new AssertionError("wrong login accepted");}catch(AccountProtocol.Failure e){check(e.getMessage().equals("账号或密码错误")&&!e.expired,"source login error preserved");}pass("HTTP 210 application errors do not create a successful login");
        f.status=401;f.response="{\"code\":401,\"message\":\"Authentication credentials were not provided.\"}";
        try{protocol.call("/api/v3/member/info?platform=3","GET",null,"expired");throw new AssertionError("401 accepted");}catch(AccountProtocol.Failure e){check(e.expired,"401 must mark expiration");}pass("HTTP 401 is parsed as an expired or missing session");
        f.status=200;f.response="<html>temporary error</html>";
        try{protocol.call("/api/v3/member/info?platform=3","GET",null,"token");throw new AssertionError("HTML accepted");}catch(AccountProtocol.Failure e){check(!e.getMessage().contains("<html>"),"do not expose raw responses");}pass("non-JSON responses produce a bounded user-facing error");
        before=f.count;try{protocol.call("/api/v3/member/info?platform=3","GET",null,"bad\r\nHeader: x");throw new AssertionError("header injection accepted");}catch(AccountProtocol.Failure e){check(e.expired,"invalid token rejected");}check(before==f.count,"no network request for invalid token");pass("malformed tokens cannot inject request headers");
        for(String origin:new String[]{"http://account.example","https://user:pass@account.example","https://account.example/path","https://account.example?token=x","https://account.example#hash"})try{new AccountProtocol(origin,f);throw new AssertionError("invalid origin accepted");}catch(IOException expected){}
        pass("account origin rejects HTTP, userinfo, paths, queries and fragments");
        f.status=210;f.response="{\"code\":210,\"message\":\"該賬戶不存在.\"}";
        try{protocol.login("existing-reader",password);throw new AssertionError("missing account accepted");}catch(AccountProtocol.Failure e){check(e.getMessage().contains("昵称")&&e.getMessage().contains("账号线路")&&!e.expired,"account lookup error must explain username and interface possibilities");}pass("account-not-found error offers username and account-line diagnosis without claiming global deletion");
        f.status=404;f.response="<html>not found</html>";
        try{protocol.call("/api/v3/comic/test/chapter/id?platform=3","GET",null,"token");throw new AssertionError("404 accepted");}catch(AccountProtocol.Failure e){check(e.status==404&&!e.expired,"retain HTTP 404 for public reading fallback");}pass("missing account chapter routes preserve HTTP 404 without expiring the session");
        System.out.println("AccountProtocol checks: "+passed);
    }
}
