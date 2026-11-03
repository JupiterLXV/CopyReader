package app.copyreader.clean;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;

public final class LocalImageProtocolTest {
    private static int passed;
    private static final String PREFIX="data:image/png;base64,";
    private static final String PNG=PREFIX+"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZV8AAAAASUVORK5CYII=";
    private static void check(boolean result,String name){if(!result)throw new AssertionError(name);passed++;System.out.println("PASS "+name);}
    private static String data(byte[] bytes){return PREFIX+Base64.getEncoder().encodeToString(bytes);}
    public static void main(String[] args)throws Exception {
        byte[] valid=Base64.getDecoder().decode(PNG.substring(PREFIX.length()));
        check(Arrays.equals(valid,LocalImageProtocol.png(PNG)),"local PNG bytes survive without alteration");
        check(LocalImageProtocol.png(null)==null && LocalImageProtocol.png("")==null,"missing URLs are rejected");
        check(LocalImageProtocol.png("https://fixture.example/shadow.png")==null,"remote URLs remain outside the local image path");
        check(LocalImageProtocol.png("data:image/svg+xml;base64,PHN2Zy8+")==null && LocalImageProtocol.png("data:text/html;base64,PGh0bWwvPg==")==null,"active data types are rejected");
        check(LocalImageProtocol.png(PREFIX+"not-base64!")==null && LocalImageProtocol.png(PNG+"\n")==null,"invalid and noncanonical base64 is rejected");
        check(LocalImageProtocol.png(data(new byte[32]))==null && LocalImageProtocol.png(data(new byte[70]))==null,"truncated or disguised non-PNG content is rejected");
        byte[] changed=valid.clone();changed[12]='X';check(LocalImageProtocol.png(data(changed))==null,"PNG must begin with an IHDR chunk");
        changed=valid.clone();changed[11]=12;check(LocalImageProtocol.png(data(changed))==null,"IHDR size must be thirteen bytes");
        changed=valid.clone();changed[19]=0;check(LocalImageProtocol.png(data(changed))==null,"zero dimensions are rejected");
        changed=valid.clone();changed[18]=4;changed[19]=1;check(LocalImageProtocol.png(data(changed))==null,"oversized dimensions are rejected before decoding pixels");
        changed=valid.clone();changed[16]=(byte)128;check(LocalImageProtocol.png(data(changed))==null,"unsigned oversized dimensions cannot overflow the limit");
        check(LocalImageProtocol.png(data(Arrays.copyOf(valid,256*1024+1)))==null,"oversized payloads are rejected");
        for(String file:args){int count=0;for(String url:Files.readAllLines(Paths.get(file),StandardCharsets.UTF_8)){if(url.isEmpty())continue;if(LocalImageProtocol.png(url)==null)throw new AssertionError("production shelf PNG rejected");count++;}check(count>0,"production canvas PNG accepted: "+count+" sprite(s)");}
        System.out.println("LocalImageProtocol checks: "+passed);
    }
}
