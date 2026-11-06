package app.copyreader.clean;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.json.JSONObject;

/** Account profile endpoints on the same origin as the active login session. */
final class ProfileProtocol {
    private static final String MEMBER = "/api/v3/member/info?platform=3";
    private static final String EDIT = "/api/v3/member/update/info?platform=3";
    private static final String UPLOAD = "/api/v3/upload/image/1?platform=3";
    private final AccountProtocol transport;
    private final String token;

    ProfileProtocol(AccountProtocol transport, String token) {
        this.transport = transport;
        this.token = token;
    }

    JSONObject member() throws Exception {
        JSONObject member = transport.call(MEMBER, "GET", null, token).optJSONObject("results");
        if (member == null) throw new IOException("账号资料格式不正确");
        if (member.has("is_login") && !member.optBoolean("is_login")) {
            throw new AccountProtocol.Failure("登录状态已过期，请重新登录", true);
        }
        if (!member.optString("avatar", "").startsWith("https://")) {
            // Login and older member responses may give only the upload path.
            try {
                String url = editable().optString("avatar", "");
                if (url.startsWith("https://")) member.put("avatar", url);
            } catch (AccountProtocol.Failure failure) {
                if (failure.expired) throw failure;
            } catch (IOException ignored) { }
        }
        return member;
    }

    static String requestedNickname(JSONObject args) throws IOException {
        if (!args.has("nickname")) return null;
        Object value = args.opt("nickname");
        if (!(value instanceof String)) throw new IOException("请输入昵称");
        String name = ((String) value).trim();
        if (name.isEmpty() || name.codePoints().allMatch(c -> Character.isWhitespace(c) || Character.isSpaceChar(c))) {
            throw new IOException("请输入昵称");
        }
        if (name.codePointCount(0, name.length()) > 64 || name.codePoints().anyMatch(Character::isISOControl)) {
            throw new IOException("昵称最多64个字符，请使用单行文字");
        }
        return name;
    }

    private JSONObject editable() throws Exception {
        JSONObject result = transport.call(EDIT, "GET", null, token).optJSONObject("results");
        JSONObject current = result == null ? null : result.optJSONObject("info");
        if (current == null) throw new IOException("无法读取当前资料，请重试");
        return current;
    }

    void save(String nickname, byte[] avatarJpeg) throws Exception {
        JSONObject current = editable();
        String name = nickname == null ? current.optString("nickname", "") : nickname;
        String avatar = current.isNull("avatar_rp") ? "" : current.optString("avatar_rp", "");
        if (avatar.isEmpty() && !current.isNull("avatar")) avatar = current.optString("avatar", "");
        JSONObject genderObject = current.optJSONObject("gender");
        String gender = genderObject == null
                ? (current.isNull("gender") ? "0" : current.optString("gender", "0"))
                : genderObject.optString("value", "");
        if (!gender.matches("[0-9]{1,3}")) throw new IOException("源站资料格式异常，请刷新后重试");
        if (avatarJpeg != null) avatar = upload(avatarJpeg);

        String body = "nickname=" + AccountProtocol.enc(name)
                + "&avatar=" + AccountProtocol.enc(avatar) + "&gender=" + gender;
        try {
            transport.call(EDIT, "POST", body, token);
        } catch (AccountProtocol.Failure rejection) {
            throw rejection;
        } catch (IOException failure) {
            throw new Unconfirmed(failure);
        }
    }

    private String upload(byte[] jpeg) throws Exception {
        if (jpeg.length < 3 || jpeg.length > 1024 * 1024 || jpeg[0] != (byte) 0xff
                || jpeg[1] != (byte) 0xd8 || jpeg[2] != (byte) 0xff) {
            throw new IOException("头像图片无效，请重新选择");
        }
        String boundary = "CopyReader-" + UUID.randomUUID();
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        String header = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"avatar.jpg\"\r\n"
                + "Content-Type: image/jpeg\r\n\r\n";
        body.write(header.getBytes(StandardCharsets.US_ASCII));
        body.write(jpeg);
        body.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.US_ASCII));
        Object result = transport.call(UPLOAD, "POST", body.toByteArray(),
                "multipart/form-data; boundary=" + boundary, token).opt("results");
        if (!(result instanceof String) || ((String) result).trim().isEmpty() || ((String) result).length() > 2048) {
            throw new IOException("源站未返回头像路径，请重新选择图片");
        }
        return (String) result;
    }

    static final class Unconfirmed extends IOException {
        Unconfirmed(IOException cause) { super("保存结果未确认，请先刷新账号资料", cause); }
    }
}
