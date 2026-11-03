package app.copyreader.clean;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.JSONObject;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Passwords are never stored. Only a native encrypted session is persisted. */
final class SessionVault {
    private static final String KEY="CopyReader.account.v1";
    private final SharedPreferences disk;
    private JSONObject cached;
    private boolean loaded;
    SessionVault(Context context){disk=context.getSharedPreferences("account",Context.MODE_PRIVATE);}
    private SecretKey key(boolean create) throws Exception {
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
        if(ks.containsAlias(KEY))return (SecretKey)ks.getKey(KEY,null);
        if(!create)throw new IOException("登录密钥已失效");
        KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        gen.init(new KeyGenParameterSpec.Builder(KEY,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setRandomizedEncryptionRequired(true).build());
        return gen.generateKey();
    }
    synchronized JSONObject read() throws Exception {
        if(!loaded){
            String raw=disk.getString("session","");
            if(!raw.isEmpty())try{
                JSONObject box=new JSONObject(raw);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");
                c.init(Cipher.DECRYPT_MODE,key(false),new GCMParameterSpec(128,Base64.decode(box.getString("iv"),Base64.NO_WRAP)));
                cached=new JSONObject(new String(c.doFinal(Base64.decode(box.getString("data"),Base64.NO_WRAP)),StandardCharsets.UTF_8));
            }catch(Exception e){clear();throw new IOException("本机登录状态已失效，请重新登录");}
            loaded=true;
        }
        return cached==null?null:new JSONObject(cached.toString());
    }
    synchronized void write(JSONObject session) throws Exception {
        Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key(true));
        JSONObject box=new JSONObject().put("iv",Base64.encodeToString(c.getIV(),Base64.NO_WRAP)).put("data",Base64.encodeToString(c.doFinal(session.toString().getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP));
        if(!disk.edit().putString("session",box.toString()).commit())throw new IOException("无法保存登录状态，请检查手机存储空间");
        cached=new JSONObject(session.toString());loaded=true;
    }
    synchronized void clear(){disk.edit().remove("session").commit();cached=null;loaded=true;}
}
