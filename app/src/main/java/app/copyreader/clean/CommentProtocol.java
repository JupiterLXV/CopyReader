package app.copyreader.clean;

import java.io.IOException;
import org.json.JSONObject;

/** Public reads are anonymous; prepared writes are sent by the pinned account session. */
final class CommentProtocol {
    static final class Post {
        final String path, body;
        Post(String path, String body) { this.path = path; this.body = body; }
    }
    private final AccountProtocol transport;

    CommentProtocol(String origin, boolean legacy) throws Exception {
        this(new AccountProtocol(origin, legacy));
    }

    CommentProtocol(AccountProtocol transport) { this.transport = transport; }

    private static String replyId(JSONObject args, String scope) throws IOException {
        if (!args.has("replyId")) return "";
        Object value = args.opt("replyId");
        if (!scope.equals("comic") || !(value instanceof String)
                || !((String) value).matches("[1-9][0-9]{0,19}")) {
            throw new IOException("无效的回复对象");
        }
        return (String) value;
    }

    static Post preparePost(JSONObject args) throws Exception {
        String scope = args.optString("scope");
        if (!scope.equals("comic") && !scope.equals("chapter")) throw new IOException("无效的评论类型");
        String target = args.optString("target");
        if (!target.matches("[A-Za-z0-9_-]{1,200}")) throw new IOException("未取得评论对象，请返回后重试");
        Object value = args.opt("text");
        if (!(value instanceof String)) throw new IOException("请输入评论内容");
        String text = ((String) value).trim();
        if (text.isEmpty() || text.codePoints().allMatch(c -> Character.isWhitespace(c) || Character.isSpaceChar(c))) throw new IOException("请输入评论内容");
        if (text.codePointCount(0, text.length()) > 1000) throw new IOException("评论最多1000字");
        boolean chapter = scope.equals("chapter");
        String path = chapter ? "/api/v3/member/roast?platform=3" : "/api/v3/member/comment?platform=3";
        String body = (chapter ? "chapter_id=" : "comic_id=") + AccountProtocol.enc(target)
                + (chapter ? "&roast=" : "&comment=") + AccountProtocol.enc(text);
        String reply = replyId(args, scope);
        if (!reply.isEmpty()) body += "&reply_id=" + reply;
        return new Post(path, body);
    }

    JSONObject list(JSONObject args) throws Exception {
        String scope = args.optString("scope");
        if (!scope.equals("comic") && !scope.equals("chapter")) throw new IOException("无效的评论类型");
        String target = args.optString("target");
        if (!target.matches("[A-Za-z0-9_-]{1,200}")) throw new IOException("未取得评论对象，请返回后重试");
        long offset = Math.max(0, Math.min(1000000, args.optLong("offset", 0)));
        String path = scope.equals("comic") ? "/api/v3/comments?comic_id=" : "/api/v3/roasts?chapter_id=";
        path += target + "&limit=20&offset=" + offset + "&platform=3";
        String reply = replyId(args, scope);
        if (!reply.isEmpty()) path += "&reply_id=" + reply + "&_update=true";
        JSONObject data;
        try {
            data = transport.call(path, "GET", null, null);
        } catch (AccountProtocol.Failure e) {
            // An anonymous comment failure must not expire the user's saved account.
            throw new AccountProtocol.Failure("评论加载失败：" + e.getMessage(), false, e.status);
        }
        JSONObject results = data.optJSONObject("results");
        if (results == null || results.optJSONArray("list") == null) throw new IOException("评论数据格式暂不支持，请稍后重试");
        return data;
    }
}
