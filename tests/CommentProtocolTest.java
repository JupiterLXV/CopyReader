package app.copyreader.clean;

import java.io.IOException;
import org.json.JSONObject;

/** Exercises production comment requests with in-memory HTTP responses. */
public final class CommentProtocolTest {
    static int passed;
    static void check(boolean value, String message) { if (!value) throw new AssertionError(message); }
    static void pass(String message) { passed++; System.out.println("PASS " + message); }
    static JSONObject args(String scope, String target, long offset) throws Exception {
        return new JSONObject().put("scope", scope).put("target", target).put("offset", offset);
    }
    public static void main(String[] ignored) throws Exception {
        AccountProtocolTest.Factory factory = new AccountProtocolTest.Factory();
        factory.response = "{\"code\":200,\"results\":{\"list\":[],\"total\":0,\"offset\":0,\"limit\":20}}";
        CommentProtocol protocol = new CommentProtocol(new AccountProtocol("https://comments.example", factory));
        protocol.list(args("comic", "aaaaaaaa-1111-1111-1111-111111111111", 0));
        check(factory.last.getURL().getPath().equals("/api/v3/comments"), "comic route");
        check(factory.last.getURL().getQuery().equals("comic_id=aaaaaaaa-1111-1111-1111-111111111111&limit=20&offset=0&platform=1"), "comic query and modern platform");
        check(factory.last.getRequestMethod().equals("GET") && !factory.last.getDoOutput(), "read only request");
        check(factory.last.getRequestProperty("Authorization") == null, "no account token on public reads");
        check(!factory.last.getUseCaches() && !factory.last.getInstanceFollowRedirects(), "no disk cache or redirects");
        pass("comic comments use anonymous GET with the comic UUID and bounded page size");

        protocol.list(args("chapter", "bbbbbbbb-1111-1111-1111-111111111111", 20));
        check(factory.last.getURL().getPath().equals("/api/v3/roasts"), "chapter route");
        check(factory.last.getURL().getQuery().equals("chapter_id=bbbbbbbb-1111-1111-1111-111111111111&limit=20&offset=20&platform=1"), "chapter scope stays separate");
        pass("chapter comments use the chapter UUID and requested pagination offset");

        protocol.list(args("comic", "valid-id", -20));
        check(factory.last.getURL().getQuery().contains("offset=0&"), "negative offsets");
        protocol.list(args("comic", "valid-id", Long.MAX_VALUE));
        check(factory.last.getURL().getQuery().contains("offset=1000000&"), "large offsets");
        pass("pagination offsets are bounded before building the request");

        int before = factory.count;
        for (String target : new String[]{"", "uuid&comic_id=other", "../other", "id\r\nHeader: x"}) {
            try { protocol.list(args("comic", target, 0)); throw new AssertionError("invalid target accepted"); }
            catch (IOException expected) { }
        }
        try { protocol.list(args("member/info", "valid-id", 0)); throw new AssertionError("unknown scope accepted"); }
        catch (IOException expected) { }
        check(factory.count == before, "invalid input must not reach the network");
        pass("invalid targets and unsupported scopes cannot change the endpoint or query");

        factory.response = "{\"code\":200,\"results\":{\"list\":null}}";
        try { protocol.list(args("comic", "valid-id", 0)); throw new AssertionError("malformed list accepted"); }
        catch (IOException expected) { check(expected.getMessage().contains("数据格式"), "useful malformed response error"); }
        pass("missing comment lists produce a retryable data-format error");

        factory.status = 401; factory.response = "{\"code\":401,\"message\":\"需要登录\"}";
        try { protocol.list(args("chapter", "valid-id", 0)); throw new AssertionError("HTTP 401 accepted"); }
        catch (AccountProtocol.Failure expected) { check(!expected.expired && expected.status == 401, "anonymous failures must not invalidate the saved account"); }
        pass("anonymous permission failures never expire the user's account session");

        factory.status = 302;
        before = factory.count;
        try { protocol.list(args("comic", "valid-id", 0)); throw new AssertionError("redirect accepted"); }
        catch (AccountProtocol.Failure expected) { check(!expected.expired && expected.status == 302, "redirect rejection"); }
        check(factory.count == before + 1 && factory.last.closed, "one request, connection closed");
        pass("comment reads reject redirects and release their connection");

        factory.status = 200; factory.response = "{\"code\":200,\"results\":{}}";
        String text = "符号 & += /\n🙂<>";
        CommentProtocol.Post comicPost = CommentProtocol.preparePost(args("comic", "comic-uuid", 0).put("text", text));
        AccountProtocol writer = new AccountProtocol("https://saved-account.example", factory);
        writer.call(comicPost.path, "POST", comicPost.body, "fixture-private-token");
        java.util.Map<String, String> form = AccountProtocolTest.form(factory.last);
        check(factory.last.getURL().getPath().equals("/api/v3/member/comment"), "comic write route");
        check(form.size() == 2 && form.get("comic_id").equals("comic-uuid") && form.get("comment").equals(text), "comic fields and UTF-8 form encoding");
        check(!form.containsKey("roast") && !form.containsKey("token") && !form.containsKey("authorization"), "no wrong-scope field or form credentials");
        check(factory.last.getRequestProperty("Authorization").equals("Token fixture-private-token"), "credential stays in native header");
        check(factory.last.getURL().getHost().equals("saved-account.example") && factory.last.getURL().getQuery().equals("platform=1"), "saved origin and protocol");
        pass("comic writes preserve Unicode and form-special characters using the saved account origin");

        CommentProtocol.Post reply = CommentProtocol.preparePost(args("comic", "comic-uuid", 0)
                .put("replyId", "4321").put("text", text));
        writer.call(reply.path, "POST", reply.body, "fixture-private-token");
        form = AccountProtocolTest.form(factory.last);
        check(form.size() == 3 && form.get("reply_id").equals("4321") && form.get("comment").equals(text), "reply sends target comment ID with its text");
        factory.response = "{\"code\":200,\"results\":{\"list\":[]}}";
        protocol.list(args("comic", "comic-uuid", 20).put("replyId", "4321"));
        check(factory.last.getURL().getQuery().endsWith("&reply_id=4321&_update=true"), "thread reads use the source's reply query");
        check(factory.last.getRequestProperty("Authorization") == null, "thread read remains anonymous");
        pass("comic reply writes and thread reads use reply_id with their respective authentication");

        before = factory.count;
        for (String invalid : new String[]{"", "0", "1&reply_id=2", "-42"}) {
            JSONObject bad = args("comic", "comic-uuid", 0).put("replyId", invalid).put("text", text);
            try { CommentProtocol.preparePost(bad); throw new AssertionError("bad reply write accepted"); }
            catch (IOException expected) { }
            try { protocol.list(bad); throw new AssertionError("bad thread read accepted"); }
            catch (IOException expected) { }
        }
        try { CommentProtocol.preparePost(args("chapter", "chapter-uuid", 0).put("replyId", "12").put("text", text)); throw new AssertionError("chapter reply accepted"); }
        catch (IOException expected) { }
        check(factory.count == before, "unsupported replies never reach the network");
        pass("invalid reply IDs and chapter replies are rejected before transport");

        CommentProtocol.Post chapterPost = CommentProtocol.preparePost(args("chapter", "chapter-uuid", 0).put("text", text));
        writer.call(chapterPost.path, "POST", chapterPost.body, "fixture-private-token");
        form = AccountProtocolTest.form(factory.last);
        check(factory.last.getURL().getPath().equals("/api/v3/member/roast"), "chapter write route");
        check(form.size() == 2 && form.get("chapter_id").equals("chapter-uuid") && form.get("roast").equals(text), "chapter uses roast field");
        check(!form.containsKey("comment") && !form.containsKey("comic_id"), "no mixed discussion fields");
        pass("chapter writes use chapter_id and roast rather than the comic-comment fields");

        before = factory.count;
        for (Object value : new Object[]{"", " \t\n", "\u3000\u00a0", 42, JSONObject.NULL}) {
            try { CommentProtocol.preparePost(args("comic", "valid-id", 0).put("text", value)); throw new AssertionError("empty or non-text comment accepted"); }
            catch (IOException expected) { }
        }
        for (String target : new String[]{"", "uuid&other=1", "../other"}) {
            try { CommentProtocol.preparePost(args("comic", target, 0).put("text", "test")); throw new AssertionError("bad target accepted"); }
            catch (IOException expected) { }
        }
        try { CommentProtocol.preparePost(args("unsupported", "valid-id", 0).put("text", "test")); throw new AssertionError("bad scope accepted"); }
        catch (IOException expected) { }
        check(factory.count == before, "invalid posts never reach transport");
        pass("empty, non-text and invalid-target comments are rejected before any network call");

        StringBuilder emoji = new StringBuilder(); for (int i = 0; i < 1000; i++) emoji.append("🙂");
        CommentProtocol.preparePost(args("comic", "valid-id", 0).put("text", emoji.toString()));
        try { CommentProtocol.preparePost(args("comic", "valid-id", 0).put("text", emoji.append("🙂").toString())); throw new AssertionError("overlong comment accepted"); }
        catch (IOException expected) { check(expected.getMessage().contains("1000"), "length message"); }
        pass("the comment limit counts Unicode code points consistently with the editor");

        factory.status = 500; factory.response = "{\"code\":500,\"message\":\"服务暂不可用\"}"; before = factory.count;
        try { writer.call(comicPost.path, "POST", comicPost.body, "fixture-private-token"); throw new AssertionError("failed write accepted"); }
        catch (AccountProtocol.Failure expected) { check(!expected.expired, "server error does not expire account"); }
        check(factory.count == before + 1, "writes must not automatically retry");
        pass("failed comment writes return the source error without an automatic repost");
        System.out.println("CommentProtocol checks: " + passed);
    }
}
