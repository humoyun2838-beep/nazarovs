package uz.dmed.mobile;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.URL;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;

/** Bundled public catalog and private, complete media files. No Javascript bridge. */
final class OfflineStore {
    static final String HOST="offline.dmed.invalid";
    static final String HOME="https://"+HOST+"/index.html";
    private final Context context;
    private final File directory;
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private volatile JSONObject index;
    private volatile String status="Dars matnlari internetsiz tayyor. Rasm va videolarni bir marta yuklab oling.";
    private volatile boolean busy;
    private volatile boolean syncing;
    private volatile boolean catalogCached;
    private volatile String catalogVersion="2026-10-16";
    private long lastSync;
    private static OfflineStore instance;
    static synchronized OfflineStore get(Context context){if(instance==null)instance=new OfflineStore(context);return instance;}
    private OfflineStore(Context context) {
        this.context=context.getApplicationContext();directory=new File(context.getFilesDir(),"offline-media");
        if(!directory.isDirectory()&&!directory.mkdirs())throw new IllegalStateException("Saqlash xotirasi ochilmadi");
        try{File cached=new File(directory,"catalog.json");if(cached.isFile()){JSONObject data=new JSONObject(read(new FileInputStream(cached),20000000));catalogVersion=data.getString("version");catalogCached=true;}}catch(Exception ignored){catalogVersion="2026-10-16";}
        try{index=new JSONObject(read(new FileInputStream(new File(directory,"index.json")),2000000));}catch(Exception e){index=new JSONObject();}
    }
    static boolean isLocal(Uri uri){return "https".equals(uri.getScheme())&&HOST.equals(uri.getHost())&&(uri.getPort()==-1||uri.getPort()==443);}
    boolean online(){ConnectivityManager cm=(ConnectivityManager)context.getSystemService(Context.CONNECTIVITY_SERVICE);NetworkCapabilities caps=cm==null?null:cm.getNetworkCapabilities(cm.getActiveNetwork());return caps!=null&&caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);}
    private InputStream catalog() throws IOException {File latest=new File(directory,"catalog.json");return catalogCached&&latest.isFile()?new FileInputStream(latest):context.getAssets().open("offline/catalog.json");}
    WebResourceResponse serve(WebResourceRequest request){
        if(!isLocal(request.getUrl()))return null;
        try {
            String path=request.getUrl().getPath();
            if(!"GET".equals(request.getMethod()))return response(405,"text/plain",new byte[0]);
            if("/index.html".equals(path)||"/".equals(path))return response("text/html",context.getAssets().open("offline/index.html"));
            if("/catalog.json".equals(path))return response("application/json",catalog());
            if("/state.json".equals(path)) {
                JSONObject state=new JSONObject();state.put("busy",busy);state.put("status",status);state.put("files",index);state.put("online",online());state.put("catalogVersion",catalogVersion);
                return response(200,"application/json",state.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
            if(path!=null&&path.matches("/media/[a-f0-9]{64}")) {
                String key=path.substring(7);JSONObject meta=index.optJSONObject(key);File file=new File(directory,key);
                if(meta==null||!file.isFile()||file.length()!=meta.optLong("size"))return response(404,"text/plain",new byte[0]);
                String mime=meta.optString("mime","application/octet-stream");long size=file.length(),start=0,end=size-1;
                String range=request.getRequestHeaders().get("Range");if(range==null)range=request.getRequestHeaders().get("range");
                Map<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-store");headers.put("Accept-Ranges","bytes");
                if(range!=null) {
                    java.util.regex.Matcher match=java.util.regex.Pattern.compile("bytes=(\\d*)-(\\d*)").matcher(range);
                    if(!match.matches()||(match.group(1).isEmpty()&&match.group(2).isEmpty()))return rangeError(size);
                    if(match.group(1).isEmpty())start=Math.max(0,size-Long.parseLong(match.group(2)));
                    else {start=Long.parseLong(match.group(1));if(!match.group(2).isEmpty())end=Math.min(end,Long.parseLong(match.group(2)));}
                    if(start>end||start>=size)return rangeError(size);
                    headers.put("Content-Range","bytes "+start+"-"+end+"/"+size);
                }
                headers.put("Content-Length",String.valueOf(end-start+1));
                final RandomAccessFile input=new RandomAccessFile(file,"r");input.seek(start);final long length=end-start+1;
                InputStream limited=new InputStream(){long remaining=length;public int read()throws IOException{if(remaining==0)return -1;int value=input.read();if(value>=0)remaining--;return value;}public int read(byte[] b,int off,int len)throws IOException{if(remaining==0)return -1;int n=input.read(b,off,(int)Math.min(len,remaining));if(n>0)remaining-=n;return n;}public void close()throws IOException{input.close();}};
                return new WebResourceResponse(mime,null,range==null?200:206,range==null?"OK":"Partial Content",headers,limited);
            }
            return response(404,"text/plain",new byte[0]);
        }catch(Exception e){return response(500,"text/plain","Saqlangan fayl ochilmadi".getBytes(java.nio.charset.StandardCharsets.UTF_8));}
    }
    private WebResourceResponse rangeError(long size){return new WebResourceResponse("text/plain",null,416,"Range Not Satisfiable",Collections.singletonMap("Content-Range","bytes */"+size),new ByteArrayInputStream(new byte[0]));}
    private WebResourceResponse response(String mime,InputStream stream){Map<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-store");headers.put("Content-Security-Policy","default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; media-src 'self'; frame-src 'none'; base-uri 'none'; form-action 'none'");return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,stream);}
    private WebResourceResponse response(int code,String mime,byte[] bytes){return new WebResourceResponse(mime,"UTF-8",code,code==200?"OK":"Unavailable",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream(bytes));}
    static String key(String value)throws Exception{byte[] digest=MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));StringBuilder out=new StringBuilder();for(byte b:digest)out.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return out.toString();}
    static String mediaUrl(String raw)throws Exception {
        if(raw.startsWith("notion:")) {
            String[] parts=raw.substring(7).split("\\|",3);if(parts.length!=3)throw new IOException("Rasm/video havolasi noto‘g‘ri");
            return MainActivity.ORIGIN+"/api/media/notion?b="+Uri.encode(parts[0])+"&f="+Uri.encode(parts[1])+"&n="+Uri.encode(parts[2])+"&proxy=1&download=1";
        }
        if(raw.startsWith("/")&&!raw.startsWith("//")) {
            if(raw.startsWith("/api/media"))return MainActivity.ORIGIN+raw+"&proxy=1&download=1";
            if(raw.startsWith("/media/")||raw.startsWith("/art/")||raw.startsWith("/stickers/"))return MainActivity.ORIGIN+raw;
        }
        if(raw.startsWith("https://"))return MainActivity.ORIGIN+"/api/media?u="+Uri.encode(raw)+"&proxy=1&download=1";
        throw new IOException("Qo‘llanmaydigan fayl manzili");
    }
    synchronized void download(String slug) {
        if(slug==null||slug.length()>300){status="Dars topilmadi";return;}
        if(busy){status="Yuklash davom etmoqda. Tugashini kuting.";return;}
        if(!online()){status="Rasm va video yuklash uchun internetni yoqing. Matnlar oflayn ochiladi.";return;}
        busy=true;status="Fayllar tayyorlanmoqda…";
        io.execute(()->{
            try {
                JSONObject data=new JSONObject(read(catalog(),20000000));JSONArray materials=data.getJSONArray("materials");JSONObject lesson=null;
                for(int i=0;i<materials.length();i++){JSONObject item=materials.getJSONObject(i);if(slug.equals(item.getString("slug"))){lesson=item;break;}}
                if(lesson==null)throw new IOException("Dars topilmadi");
                LinkedHashSet<String> urls=new LinkedHashSet<>();String cover=lesson.optString("imageUrl");if(!cover.isEmpty())urls.add(cover);
                java.util.regex.Matcher marker=java.util.regex.Pattern.compile("(?m)^(?:IMAGE|VIDEO)::(.+)$").matcher(lesson.getString("content"));while(marker.find())urls.add(marker.group(1).trim());
                java.util.regex.Matcher md=java.util.regex.Pattern.compile("!\\[[^\\]]*\\]\\(([^)]+)\\)|\\[[^\\]]*\\]\\((https://[^)]+\\.mp4(?:\\?[^)]*)?)\\)").matcher(lesson.getString("content"));while(md.find())urls.add(md.group(1)!=null?md.group(1):md.group(2));
                int number=0;for(String raw:urls){String id=key(raw);File file=new File(directory,id);JSONObject existing=index.optJSONObject(id);number++;if(existing!=null&&file.isFile()&&file.length()==existing.optLong("size"))continue;downloadFile(raw,id,number,urls.size());}
                status="Tayyor! Darsdagi "+urls.size()+" ta rasm/video internetsiz ochiladi.";
            }catch(Exception e){status=e instanceof IOException?e.getMessage():"Yuklash uzildi. Internet va bo‘sh joyni tekshirib qayta urining.";}
            finally{busy=false;}
        });
    }
    
    synchronized void syncCatalog(){
        if(syncing||!online()||System.currentTimeMillis()-lastSync<60000)return;syncing=true;lastSync=System.currentTimeMillis();
        io.execute(()->{HttpsURLConnection connection=null;try{
            connection=(HttpsURLConnection)new URL(MainActivity.ORIGIN+"/api/offline-catalog").openConnection();connection.setInstanceFollowRedirects(false);connection.setUseCaches(false);connection.setConnectTimeout(10000);connection.setReadTimeout(25000);
            android.content.SharedPreferences prefs=context.getSharedPreferences("offline-catalog",Context.MODE_PRIVATE);String etag=prefs.getString("etag","");File current=new File(directory,"catalog.json");if(catalogCached&&current.isFile()&&!etag.isEmpty())connection.setRequestProperty("If-None-Match",etag);
            int code=connection.getResponseCode();if(code==304)return;if(code!=200)return;
            String raw=read(connection.getInputStream(),20000000);JSONObject data=new JSONObject(raw);JSONArray categories=data.getJSONArray("categories"),materials=data.getJSONArray("materials");if(categories.length()==0||categories.length()>10000||materials.length()==0||materials.length()>20000)return;
            for(int i=0;i<categories.length();i++){categories.getJSONObject(i).getInt("id");categories.getJSONObject(i).getString("title");}
            for(int i=0;i<materials.length();i++){JSONObject m=materials.getJSONObject(i);m.getString("slug");m.getString("title");m.getString("content");m.getInt("categoryId");}
            File temp=new File(directory,"catalog.tmp");try(FileOutputStream out=new FileOutputStream(temp)){out.write(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));out.getFD().sync();}if(!temp.renameTo(current))return;
            catalogCached=true;catalogVersion=data.getString("version");prefs.edit().putString("etag",connection.getHeaderField("ETag")).putString("version",catalogVersion).apply();
        }catch(Exception ignored){/* The last valid catalog and bundled data remain available. */}finally{if(connection!=null)connection.disconnect();syncing=false;}});
    }
    private void downloadFile(String raw,String id,int number,int count)throws Exception {
        File part=new File(directory,id+".part");HttpsURLConnection connection=(HttpsURLConnection)new URL(mediaUrl(raw)).openConnection();
        connection.setInstanceFollowRedirects(false);connection.setUseCaches(false);connection.setConnectTimeout(20000);connection.setReadTimeout(60000);connection.setRequestProperty("Accept-Encoding","identity");
        try {
            if(connection.getResponseCode()!=200)throw new IOException("Fayl ochilmadi. Internet bilan qayta urinib ko‘ring.");
            String mime=connection.getContentType();if(mime==null||!(mime.startsWith("video/")||mime.startsWith("image/")||mime.startsWith("application/octet-stream")))throw new IOException("Video/rasm manbasi ochilmadi.");
            long expected=connection.getContentLengthLong();if(expected>0&&directory.getUsableSpace()<expected+16000000)throw new IOException("Telefonda bo‘sh joy yetarli emas.");
            long size=0,last=0;try(InputStream input=connection.getInputStream();FileOutputStream output=new FileOutputStream(part)) {
                byte[] buffer=new byte[65536];int n;while((n=input.read(buffer))!=-1){size+=n;if(size>1073741824L||directory.getUsableSpace()<8000000)throw new IOException("Fayl uchun bo‘sh joy yetarli emas.");output.write(buffer,0,n);if(System.currentTimeMillis()-last>500){last=System.currentTimeMillis();status=String.format(java.util.Locale.ROOT,"Fayl %d/%d · %.1f MB%s. Ilovani ochiq qoldiring.",number,count,size/1048576.0,expected>0?String.format(java.util.Locale.ROOT," / %.1f MB",expected/1048576.0):"");}}output.getFD().sync();
            }
            if(size==0||(expected>0&&expected!=size))throw new IOException("Fayl to‘liq yuklanmadi. Qayta urining.");
            File target=new File(directory,id);if(!part.renameTo(target))throw new IOException("Fayl saqlanmadi.");
            JSONObject next=new JSONObject(index.toString()),meta=new JSONObject();meta.put("size",size);meta.put("mime",mime);next.put(id,meta);
            File temp=new File(directory,"index.tmp");try(FileOutputStream output=new FileOutputStream(temp)){output.write(next.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));output.getFD().sync();}if(!temp.renameTo(new File(directory,"index.json")))throw new IOException("Ro‘yxat saqlanmadi.");index=next;
        }finally{connection.disconnect();if(part.exists())part.delete();}
    }
    private static String read(InputStream input,int max)throws IOException{try(InputStream in=input;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(out.size()+n>max)throw new IOException("Ma’lumot juda katta");out.write(b,0,n);}return out.toString("UTF-8");}}
}
