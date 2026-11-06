package app.copyreader.clean;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.media.ExifInterface;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/** Decode a bounded source and prepare the same square image for preview and upload. */
final class AvatarImage {
    static byte[] jpeg(byte[] source) throws IOException {
        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(source, 0, source.length, options);
        int longest = Math.max(options.outWidth, options.outHeight);
        if (options.outWidth <= 0 || options.outHeight <= 0 || longest > 24000) {
            throw new IOException("图片无法读取，请选择常见格式的照片");
        }
        options.inJustDecodeBounds = false;
        options.inSampleSize = 1;
        while (longest / options.inSampleSize > 1600) options.inSampleSize *= 2;
        Bitmap image = BitmapFactory.decodeByteArray(source, 0, source.length, options);
        if (image == null) throw new IOException("图片无法读取，请重新选择");

        Bitmap square = null;
        Bitmap opaque = null;
        try {
            int side = Math.min(image.getWidth(), image.getHeight());
            Matrix transform = orientation(source);
            float scale = Math.min(1f, 512f / side);
            transform.postScale(scale, scale);
            square = Bitmap.createBitmap(image, (image.getWidth() - side) / 2,
                    (image.getHeight() - side) / 2, side, side, transform, true);
            opaque = Bitmap.createBitmap(square.getWidth(), square.getHeight(), Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(opaque);
            canvas.drawColor(Color.WHITE);
            canvas.drawBitmap(square, 0, 0, null);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            if (!opaque.compress(Bitmap.CompressFormat.JPEG, 90, out)) throw new IOException("无法生成头像图片");
            return out.toByteArray();
        } finally {
            if (opaque != null) opaque.recycle();
            if (square != null && square != image) square.recycle();
            image.recycle();
        }
    }

    private static Matrix orientation(byte[] source) {
        Matrix matrix = new Matrix();
        int value;
        try {
            ExifInterface exif = new ExifInterface(new ByteArrayInputStream(source));
            value = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
        } catch (IOException | RuntimeException ignored) { return matrix; }
        switch (value) {
            case ExifInterface.ORIENTATION_FLIP_HORIZONTAL: matrix.setScale(-1, 1); break;
            case ExifInterface.ORIENTATION_ROTATE_180: matrix.setRotate(180); break;
            case ExifInterface.ORIENTATION_FLIP_VERTICAL: matrix.setScale(1, -1); break;
            case ExifInterface.ORIENTATION_TRANSPOSE: matrix.setRotate(90); matrix.postScale(-1, 1); break;
            case ExifInterface.ORIENTATION_ROTATE_90: matrix.setRotate(90); break;
            case ExifInterface.ORIENTATION_TRANSVERSE: matrix.setRotate(-90); matrix.postScale(-1, 1); break;
            case ExifInterface.ORIENTATION_ROTATE_270: matrix.setRotate(-90); break;
        }
        return matrix;
    }
}
