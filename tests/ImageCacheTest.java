package app.copyreader.clean;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public final class ImageCacheTest {
    private static final int MB = 1024 * 1024;

    private static final class Source extends InputStream {
        private int remaining;
        private boolean closed;
        Source(int bytes) { remaining = bytes; }
        @Override public int read() { return remaining-- > 0 ? 0x47 : -1; }
        @Override public int read(byte[] buffer, int offset, int count) {
            if (remaining <= 0) return -1;
            int size = Math.min(remaining, count);
            Arrays.fill(buffer, offset, offset + size, (byte) 0x47);
            remaining -= size;
            return size;
        }
        @Override public void close() { closed = true; }
    }

    private static void check(boolean passed, String message) {
        if (!passed) throw new AssertionError(message);
    }

    public static void main(String[] args) throws Exception {
        File directory = Files.createTempDirectory("copyreader-image-cache-test").toFile();
        ExecutorService workers = Executors.newFixedThreadPool(3);
        try {
            @SuppressWarnings("unchecked") Future<Void>[] pending = new Future[3];
            for (int i = 0; i < pending.length; i++) {
                File target = new File(directory, "image-" + i + ".img");
                pending[i] = workers.submit(() -> {
                    Source input = new Source(19 * MB);
                    ImageCache.write(target, input);
                    check(input.closed && target.length() == 19L * MB, "large stream wasn't cached or closed");
                    return null;
                });
            }
            for (Future<Void> job : pending) job.get();
            System.out.println("PASS three concurrent 19 MiB images stream under a small heap");

            File target = new File(directory, "image-0.img");
            for (int size : new int[]{11, 20 * MB + 1}) {
                Source input = new Source(size);
                try {
                    ImageCache.write(target, input);
                    throw new AssertionError("invalid image size accepted: " + size);
                } catch (IOException expected) {
                    check(input.closed && target.length() == 19L * MB, "partial write replaced the valid cache");
                }
            }
            check(directory.list((dir, name) -> name.endsWith(".part")).length == 0, "partial files leaked");
            System.out.println("PASS incomplete and oversized streams leave the existing cache intact");
        } finally {
            workers.shutdownNow();
            for (File file : directory.listFiles()) file.delete();
            directory.delete();
        }
    }
}
