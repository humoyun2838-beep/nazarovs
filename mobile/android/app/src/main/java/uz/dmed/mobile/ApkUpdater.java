package uz.dmed.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.res.Configuration;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;

public final class ApkUpdater {
    private final Activity activity;
    private final SharedPreferences preferences;
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private final Handler main=new Handler(Looper.getMainLooper());
    private volatile boolean destroyed=false, cancelled=false;
    private volatile HttpsURLConnection connection;
    private boolean active=false,checking=false,working=false,waitingPermission=false;
    private AlertDialog dialog;
    private UpdatePolicy shown;
    private ProgressBar progress;
    private TextView status;
    private Button update,later;
    private final Runnable timer=new Runnable(){@Override public void run(){if(active){check(false);main.postDelayed(this,60000);}}};
    public ApkUpdater(Activity activity){this.activity=activity;preferences=activity.getSharedPreferences("dmed_updates",0);}
    private void ui(Runnable action){main.post(()->{if(!destroyed&&!activity.isFinishing())action.run();});}
    private int dp(int value){return Math.round(value*activity.getResources().getDisplayMetrics().density);}
    public void resume(){
        active=true;main.removeCallbacks(timer);main.post(timer);
        if(waitingPermission){waitingPermission=false;if(activity.getPackageManager().canRequestPackageInstalls())verifyAndInstall();else showError("O‘rnatishga ruxsat berilmadi. Qayta urinishingiz mumkin.");}
        String cached=preferences.getString("manifest","");
        if(dialog==null&&!cached.isEmpty())try{offer(parse(new JSONObject(cached)),false);}catch(Exception ignored){}
    }
    public void pause(){active=false;main.removeCallbacks(timer);}
    public void destroy(){destroyed=true;pause();cancelled=true;if(connection!=null)connection.disconnect();io.shutdownNow();if(dialog!=null)dialog.dismiss();}
    public void check(boolean manual){
        if(checking||working||destroyed)return;checking=true;
        io.execute(()->{
            try {
                HttpsURLConnection c=(HttpsURLConnection)new URL(MainActivity.ORIGIN+"/api/mobile-release").openConnection();connection=c;
                c.setInstanceFollowRedirects(false);c.setConnectTimeout(10000);c.setReadTimeout(10000);c.setRequestProperty("Cache-Control","no-cache");
                String json;
                try {if(c.getResponseCode()!=200)throw new Exception("Server javob bermadi.");try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[2048];int n;while((n=in.read(b))!=-1){if(out.size()+n>16000)throw new Exception("Javob juda katta.");out.write(b,0,n);}json=out.toString("UTF-8");}}
                finally {c.disconnect();connection=null;}
                UpdatePolicy release=parse(new JSONObject(json));
                ui(()->{checking=false;preferences.edit().putString("manifest",json).apply();offer(release,manual);});
            }catch(Exception e){ui(()->{checking=false;if(manual||dialog!=null)showError("Internet yoki server bilan aloqa yo‘q. Qayta urinib ko‘ring.");});}
        });
    }
    public void showPreview(boolean required){
        if(!BuildConfig.DEBUG)return;
        ui(()->offer(new UpdatePolicy("1.2.0",3,required?3:1,required,
            "https://raw.githubusercontent.com/humoyun2838-beep/nazarovs/9fe7f63941cb713efa8a0cbf2d8dff406c60e60e/releases/android/DMED-Mijoz.apk",
            "5f6245874ca1ca87538e656396593d24c54b3ea9814ef9da95b709ded0d2fb82",21119,
            "Xavfsiz APK yangilash\nYuklash foizi\nMajburiy va ixtiyoriy yangilanish"),true));
    }
    private UpdatePolicy parse(JSONObject json)throws Exception {
        if(!activity.getPackageName().equals(json.getString("package_name")))throw new Exception("Package mismatch");
        long code=json.getLong("version_code"),minimum=json.getLong("minimum_version");
        if(code>2100000000L||minimum>2100000000L||code<1||minimum<1)throw new Exception("Code out of range");
        return new UpdatePolicy(json.getString("latest_version"),(int)code,(int)minimum,json.getBoolean("force_update"),json.getString("apk_url"),json.getString("sha256"),json.getLong("apk_size"),json.getString("release_notes"));
    }
    private void offer(UpdatePolicy release,boolean manual){
        if(!active||working)return;
        if(!release.available(BuildConfig.VERSION_CODE)){if(manual)Toast.makeText(activity,"Ilovangiz eng yangi versiyada: "+BuildConfig.VERSION_NAME,Toast.LENGTH_LONG).show();return;}
        boolean required=release.required(BuildConfig.VERSION_CODE);
        if(!manual&&!required&&preferences.getInt("later_code",0)==release.code&&preferences.getLong("later_until",0)>System.currentTimeMillis())return;
        if(dialog!=null&&dialog.isShowing()&&shown!=null&&shown.code==release.code&&shown.force==release.force&&shown.minimum==release.minimum)return;
        if(dialog!=null)dialog.dismiss();shown=release;showDialog(required);
    }
    private GradientDrawable rounded(int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));return d;}
    private TextView text(String value,int size,int color){TextView t=new TextView(activity);t.setText(value);t.setTextSize(size);t.setTextColor(color);t.setPadding(0,dp(5),0,dp(5));return t;}
    private void showDialog(boolean required){
        boolean dark=(activity.getResources().getConfiguration().uiMode&Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES;
        int foreground=dark?Color.rgb(239,245,255):Color.rgb(14,33,67),muted=dark?Color.rgb(179,195,218):Color.rgb(87,105,135),blue=Color.rgb(34,103,232);
        LinearLayout box=new LinearLayout(activity);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(dp(24),dp(20),dp(24),dp(20));box.setBackground(rounded(dark?Color.rgb(19,31,52):Color.WHITE,28));
        TextView icon=text("↑",38,blue);icon.setGravity(Gravity.CENTER);icon.setBackground(rounded(dark?Color.rgb(31,52,85):Color.rgb(233,241,255),22));box.addView(icon,new LinearLayout.LayoutParams(dp(64),dp(64)));icon.animate().alpha(1).setDuration(350).start();
        box.addView(text(required?"Yangilash zarur":"Yangi versiya tayyor",24,foreground));
        box.addView(text("DMED Mijoz · "+BuildConfig.VERSION_NAME+" → "+shown.version,14,blue));
        box.addView(text(required?"Davom etish uchun yangi versiyani o‘rnating.":"Yangiliklarni qulayroq va xavfsizroq ilovada sinab ko‘ring.",14,muted));
        box.addView(text("YANGILIKLAR",11,blue));
        TextView notes=text(shown.notes,14,foreground);ScrollView notesScroll=new ScrollView(activity);notesScroll.addView(notes);box.addView(notesScroll,new LinearLayout.LayoutParams(-1,dp(140)));
        progress=new ProgressBar(activity,null,android.R.attr.progressBarStyleHorizontal);progress.setMax(100);progress.setProgressTintList(ColorStateList.valueOf(blue));progress.setVisibility(View.GONE);box.addView(progress,new LinearLayout.LayoutParams(-1,dp(7)));
        status=text(String.format(java.util.Locale.ROOT,"%.1f MB · SHA-256 va imzo tekshiriladi",shown.size/1048576.0),12,muted);box.addView(status);
        update=new Button(activity);update.setText("Hozir yangilash");update.setAllCaps(false);update.setTextColor(Color.WHITE);update.setTextSize(16);update.setBackground(rounded(blue,16));LinearLayout.LayoutParams button=new LinearLayout.LayoutParams(-1,dp(52));button.topMargin=dp(12);box.addView(update,button);update.setOnClickListener(v->{try{File ready=readyFile();if(ready.isFile())verifyAndInstall();else download();}catch(Exception e){showError("Telefonda bo‘sh joyni tekshiring.");}});
        later=new Button(activity);later.setText("Keyinroq");later.setAllCaps(false);later.setTextColor(muted);later.setBackgroundColor(Color.TRANSPARENT);later.setVisibility(required?View.GONE:View.VISIBLE);box.addView(later,new LinearLayout.LayoutParams(-1,dp(44)));later.setOnClickListener(v->{cancelled=true;if(connection!=null)connection.disconnect();preferences.edit().putInt("later_code",shown.code).putLong("later_until",System.currentTimeMillis()+86400000L).apply();dialog.dismiss();dialog=null;});
        dialog=new AlertDialog.Builder(activity).setView(box).create();dialog.setCancelable(false);dialog.setCanceledOnTouchOutside(false);dialog.show();
        if(dialog.getWindow()!=null){dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);dialog.getWindow().setLayout(Math.min(activity.getResources().getDisplayMetrics().widthPixels-dp(32),dp(420)),ViewGroup.LayoutParams.WRAP_CONTENT);}
        box.setAlpha(0);box.setTranslationY(dp(12));box.animate().alpha(1).translationY(0).setDuration(240).start();
    }
    private File readyFile(){File dir=new File(activity.getCacheDir(),"updates");if(!dir.isDirectory()&&!dir.mkdirs())throw new IllegalStateException("Storage unavailable");return new File(dir,"update.apk");}
    private void showError(String message){
        working=false;
        if(dialog!=null&&dialog.isShowing()){status.setText(message);status.setTextColor(Color.rgb(213,67,76));update.setEnabled(true);update.setText("Qayta urinish");later.setEnabled(true);progress.setVisibility(View.GONE);}
        else Toast.makeText(activity,message,Toast.LENGTH_LONG).show();
    }
    private void download(){
        if(working||shown==null)return;working=true;cancelled=false;update.setEnabled(false);later.setEnabled(false);progress.setVisibility(View.VISIBLE);progress.setProgress(0);status.setText("APK yuklanmoqda… 0%");
        UpdatePolicy release=shown;
        io.execute(()->{
            File part=new File(new File(activity.getCacheDir(),"updates"),"update.part");
            try {
                readyFile();
                if(!UpdatePolicy.trustedUrl(release.url))throw new Exception("Ishonchsiz APK manbasi.");
                HttpsURLConnection c=(HttpsURLConnection)new URL(release.url).openConnection();connection=c;c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(20000);
                long total=0;int last=-1;
                try {
                    if(c.getResponseCode()!=200)throw new Exception("APK yuklanmadi. Havolani tekshiring.");
                    long length=c.getContentLengthLong();if(length!=-1&&length!=release.size)throw new Exception("APK hajmi mos emas.");
                    try(InputStream in=c.getInputStream();FileOutputStream out=new FileOutputStream(part)){
                        byte[] buffer=new byte[32768];int n;
                        while((n=in.read(buffer))!=-1){if(cancelled||destroyed||Thread.currentThread().isInterrupted())throw new Exception("Yuklash bekor qilindi.");total+=n;if(total>release.size)throw new Exception("APK hajmi mos emas.");out.write(buffer,0,n);int percent=(int)(total*100/release.size);if(percent!=last){last=percent;ui(()->{progress.setProgress(percent);status.setText("APK yuklanmoqda… "+percent+"%");});}}
                        out.getFD().sync();
                    }
                }finally{c.disconnect();connection=null;}
                verifyFile(part,release);
                Files.move(part.toPath(),readyFile().toPath(),StandardCopyOption.REPLACE_EXISTING);
                ui(()->{working=false;update.setEnabled(true);later.setEnabled(true);update.setText("O‘rnatish");status.setText("APK tekshirildi. O‘rnatishni telefonda tasdiqlang.");install();});
            }catch(Exception e){part.delete();ui(()->{if(!cancelled)showError(e.getMessage()==null?"Yuklash tugamadi. Internetni tekshiring.":e.getMessage());else working=false;});}
        });
    }
    private static byte[] digest(File file)throws Exception {MessageDigest digest=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(file)){byte[] b=new byte[32768];int n;while((n=in.read(b))!=-1)digest.update(b,0,n);}return digest.digest();}
    private static String hex(byte[] bytes){StringBuilder out=new StringBuilder();for(byte b:bytes)out.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return out.toString();}
    @SuppressWarnings("deprecation") private void verifyFile(File file,UpdatePolicy release)throws Exception {
        if(file.length()!=release.size||!hex(digest(file)).equals(release.sha256))throw new Exception("APK yaxlitligi mos emas. Qayta yuklang.");
        PackageManager pm=activity.getPackageManager();int flags=Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;
        PackageInfo apk=pm.getPackageArchiveInfo(file.getAbsolutePath(),flags),current=pm.getPackageInfo(activity.getPackageName(),flags);
        if(apk==null||!activity.getPackageName().equals(apk.packageName)||!release.version.equals(apk.versionName)||(Build.VERSION.SDK_INT>=28?apk.getLongVersionCode():apk.versionCode)!=release.code)throw new Exception("APK paketi yoki versiyasi mos emas.");
        if(apk.applicationInfo==null||(apk.applicationInfo.flags&android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0)throw new Exception("Debug APK o‘rnatilmaydi.");
        Signature[] downloaded=Build.VERSION.SDK_INT>=28?apk.signingInfo.getApkContentsSigners():apk.signatures;
        Signature[] installed=Build.VERSION.SDK_INT>=28?current.signingInfo.getApkContentsSigners():current.signatures;
        if(downloaded==null||installed==null||downloaded.length!=1||installed.length!=1||!Arrays.equals(downloaded[0].toByteArray(),installed[0].toByteArray()))throw new Exception("APK imzosi mos emas. O‘rnatish to‘xtatildi.");
    }
    private void verifyAndInstall(){
        if(working||shown==null)return;working=true;update.setEnabled(false);status.setText("APK qayta tekshirilmoqda…");UpdatePolicy release=shown;
        io.execute(()->{try{verifyFile(readyFile(),release);ui(()->{working=false;update.setEnabled(true);install();});}catch(Exception e){readyFile().delete();ui(()->showError("APK tekshiruvi o‘tmadi. Qayta yuklash uchun tugmani bosing."));}});
    }
    private void install(){
        try {
            if(!activity.getPackageManager().canRequestPackageInstalls()){
                waitingPermission=true;status.setText("Sozlamalarda shu ilovadan o‘rnatishga ruxsat bering, so‘ng qayting.");
                activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.getPackageName())));return;
            }
            Uri uri=Uri.parse("content://"+activity.getPackageName()+".updates/update.apk");
            Intent intent=new Intent(Intent.ACTION_VIEW);intent.setDataAndType(uri,"application/vnd.android.package-archive");intent.setClipData(ClipData.newRawUri("DMED update",uri));intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            status.setText("Android oynasida o‘rnatishni tasdiqlang. Bekor qilsangiz, qayta urinishingiz mumkin.");activity.startActivity(intent);
        }catch(Exception e){waitingPermission=false;showError("O‘rnatish oynasi ochilmadi. Qayta urinib ko‘ring.");}
    }
}
