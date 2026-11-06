package app.copyreader.clean;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.json.JSONObject;

public final class ProfileProtocolTest {
    private static final String CURRENT = "{\"code\":200,\"results\":{\"info\":{\"nickname\":\"源站昵称\","
            + "\"avatar\":\"https://images.example/old.jpg\",\"avatar_rp\":\"avatars/old.jpg\",\"gender\":{\"value\":2}}}}";
    private static final String OK = "{\"code\":200}";
    private static final byte[] JPEG = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, 7};
    private static final String TOKEN = "fixture-profile-token";
    private static int passed;

    private static final class Transport implements AccountProtocol.Connections {
        final ArrayDeque<Object> responses = new ArrayDeque<>();
        final List<AccountProtocolTest.Fake> requests = new ArrayList<>();

        Transport(Object... replies) {
            for (Object reply : replies) responses.add(reply);
        }

        @Override public HttpURLConnection open(URL url) throws IOException {
            Object reply = responses.removeFirst();
            if (reply instanceof IOException) throw (IOException) reply;
            AccountProtocolTest.Fake connection = new AccountProtocolTest.Fake(url, 200, (String) reply);
            requests.add(connection);
            return connection;
        }

        ProfileProtocol protocol() throws Exception {
            return new ProfileProtocol(new AccountProtocol("https://saved-account.example", this), TOKEN);
        }
    }

    public static void main(String[] args) throws Exception {
        Transport read = new Transport("{\"code\":200,\"results\":{\"username\":\"reader\",\"avatar\":\"https://images.example/old.jpg\"}}");
        check(read.protocol().member().getString("avatar").endsWith("/old.jpg"), "member reads the account avatar");
        verify(read.requests.get(0), "/api/v3/member/info", "GET");
        pass("member info reads the avatar using the pinned account session");

        Transport relative = new Transport("{\"code\":200,\"results\":{\"username\":\"reader\",\"avatar\":\"avatars/old.jpg\"}}", CURRENT);
        check(relative.protocol().member().getString("avatar").equals("https://images.example/old.jpg"), "relative upload path is resolved using the editable profile");
        verify(relative.requests.get(1), "/api/v3/member/update/info", "GET");
        pass("accounts with a relative avatar path read the source's display URL");

        Transport rename = new Transport(CURRENT, OK);
        rename.protocol().save("中文 & 🙂", null);
        verify(rename.requests.get(0), "/api/v3/member/update/info", "GET");
        verify(rename.requests.get(1), "/api/v3/member/update/info", "POST");
        Map<String, String> form = AccountProtocolTest.form(rename.requests.get(1));
        check(form.size() == 3 && form.get("nickname").equals("中文 & 🙂")
                && form.get("avatar").equals("avatars/old.jpg") && form.get("gender").equals("2"), "nickname writes retain other fields");
        check(!form.containsKey("username"), "the login name is never rewritten as a nickname");
        pass("nickname saves preserve the source avatar path and gender");

        Transport avatar = new Transport(CURRENT, "{\"code\":200,\"results\":\"avatars/new.jpg\"}", OK);
        avatar.protocol().save(null, JPEG);
        AccountProtocolTest.Fake upload = avatar.requests.get(1);
        verify(upload, "/api/v3/upload/image/1", "POST");
        String mime = upload.getRequestProperty("Content-Type");
        String boundary = mime.replace("multipart/form-data; boundary=", "");
        String body = new String(upload.sent.toByteArray(), StandardCharsets.ISO_8859_1);
        check(mime.startsWith("multipart/form-data; boundary=") && body.startsWith("--" + boundary + "\r\n")
                && body.contains("name=\"file\"; filename=\"avatar.jpg\"")
                && body.contains("\r\n\r\n" + new String(JPEG, StandardCharsets.ISO_8859_1))
                && body.endsWith("\r\n--" + boundary + "--\r\n") && !body.contains(TOKEN), "valid multipart upload with credentials confined to headers");
        form = AccountProtocolTest.form(avatar.requests.get(2));
        check(form.get("avatar").equals("avatars/new.jpg") && form.get("nickname").equals("源站昵称"), "avatar-only save uses latest source nickname");
        pass("avatar upload sends the file field and commits the returned path once");

        Transport rejected = new Transport(CURRENT, "{\"code\":400,\"message\":\"图片被拒绝\",\"results\":\"bad.jpg\"}");
        try { rejected.protocol().save("新昵称", JPEG); throw new AssertionError("rejected upload saved"); }
        catch (AccountProtocol.Failure expected) { check(expected.getMessage().equals("图片被拒绝"), "source upload error retained"); }
        check(rejected.requests.size() == 2, "no profile write after failed upload");
        pass("a rejected upload never overwrites account details");

        Transport timeout = new Transport(CURRENT, new SocketTimeoutException());
        try { timeout.protocol().save("新昵称", null); throw new AssertionError("timeout reported as saved"); }
        catch (ProfileProtocol.Unconfirmed expected) { check(timeout.responses.isEmpty(), "timeout recorded without a retry"); }
        check(ProfileProtocol.requestedNickname(new JSONObject().put("nickname", "  😀 ")).equals("😀"), "Unicode nickname survives trimming");
        for (Object invalid : new Object[]{" ", "\u3000", "A\nB", 6}) {
            try { ProfileProtocol.requestedNickname(new JSONObject().put("nickname", invalid)); throw new AssertionError("invalid nickname accepted"); }
            catch (IOException expected) { }
        }
        pass("uncertain writes surface for checking and nickname validation rejects invalid input");
        System.out.println("ProfileProtocol checks: " + passed);
    }

    private static void verify(AccountProtocolTest.Fake request, String path, String method) {
        check(request.getURL().getHost().equals("saved-account.example") && request.getURL().getPath().equals(path)
                && request.getRequestMethod().equals(method) && !request.getInstanceFollowRedirects()
                && ("Token " + TOKEN).equals(request.getRequestProperty("Authorization")), "profile request contract " + path);
    }

    private static void check(boolean value, String message) { if (!value) throw new AssertionError(message); }
    private static void pass(String message) { passed++; System.out.println("PASS " + message); }
}
