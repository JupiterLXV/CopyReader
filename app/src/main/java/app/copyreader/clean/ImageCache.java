package app.copyreader.clean;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

final class ImageCache {
    private static final int MAX_BYTES = 20 * 1024 * 1024;

    static void write(File target, InputStream source) throws IOException {
        try (InputStream input = source) {
            File partial = File.createTempFile("image-", ".part", target.getParentFile());
            try {
                int total = 0;
                try (FileOutputStream output = new FileOutputStream(partial)) {
                    byte[] buffer = new byte[32 * 1024];
                    int size;
                    while ((size = input.read(buffer)) != -1) {
                        if (Thread.currentThread().isInterrupted()) throw new IOException("图片下载已取消");
                        total += size;
                        if (total > MAX_BYTES) throw new IOException("图片超过缓存大小限制");
                        output.write(buffer, 0, size);
                    }
                }
                if (total < 12) throw new IOException("图片响应不完整");
                if (!partial.renameTo(target)) throw new IOException("写入图片缓存失败");
            } finally {
                partial.delete();
            }
        }
    }
}
