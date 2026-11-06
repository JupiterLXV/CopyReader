package app.copyreader.clean;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

final class CoverThumbnail {
    private static final int EDGE = 640;

    static boolean write(File source, File target) throws IOException {
        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(source.getPath(), options);
        int edge = Math.max(options.outWidth, options.outHeight);
        if (edge <= EDGE) return false;

        options.inJustDecodeBounds = false;
        options.inSampleSize = 1;
        while (edge / options.inSampleSize >= EDGE * 2) options.inSampleSize *= 2;
        Bitmap decoded = BitmapFactory.decodeFile(source.getPath(), options);
        if (decoded == null) return false;

        Bitmap thumbnail = decoded;
        try {
            float scale = (float) EDGE / Math.max(decoded.getWidth(), decoded.getHeight());
            if (scale < 1) {
                int width = Math.max(1, Math.round(decoded.getWidth() * scale));
                int height = Math.max(1, Math.round(decoded.getHeight() * scale));
                thumbnail = Bitmap.createScaledBitmap(decoded, width, height, true);
            }
            File partial = File.createTempFile("cover-", ".part", target.getParentFile());
            try {
                try (FileOutputStream output = new FileOutputStream(partial)) {
                    if (!thumbnail.compress(Bitmap.CompressFormat.WEBP, 87, output)) return false;
                }
                if (!partial.renameTo(target)) throw new IOException("写入封面缓存失败");
                return true;
            } finally {
                partial.delete();
            }
        } finally {
            if (thumbnail != decoded) thumbnail.recycle();
            decoded.recycle();
        }
    }
}
