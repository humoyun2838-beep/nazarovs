package uz.dmed.mobile;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import java.util.Arrays;

public class MainActivity extends Activity {
    static final String HOST = "nazarovs-production.up.railway.app";
    static final String ORIGIN = "https://" + HOST;
    private WebView web;
    private ProgressBar progress;
    private LinearLayout error;
    private FrameLayout content;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingAudio;
    private View fullVideo;
    private WebChromeClient.CustomViewCallback videoCallback;
    private ApkUpdater updater;
    private OfflineStore offline;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        int color = Color.parseColor(BuildConfig.ROLE_COLOR);
        getWindow().setStatusBarColor(color);
        getWindow().setNavigationBarColor(color);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(color);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setBackgroundColor(color);
        Button back = control("‹", "Orqaga");
        back.setOnClickListener(v -> goBack());
        toolbar.addView(back, new LinearLayout.LayoutParams(dp(52), dp(48)));
        TextView name = new TextView(this);
        name.setText(getString(getApplicationInfo().labelRes));
        name.setTextColor(Color.WHITE); name.setTextSize(18);
        toolbar.addView(name, new LinearLayout.LayoutParams(0, dp(48), 1));
        name.setGravity(Gravity.CENTER_VERTICAL);
        Button home = control("⌂", "Bosh sahifa");
        home.setOnClickListener(v -> loadHome());
        toolbar.addView(home, new LinearLayout.LayoutParams(dp(48), dp(48)));
        Button refresh = control("↻", "Yangilash");
        refresh.setOnClickListener(v -> { error.setVisibility(View.GONE); web.reload(); });
        toolbar.addView(refresh, new LinearLayout.LayoutParams(dp(48), dp(48)));
        if("mijoz".equals(BuildConfig.FLAVOR)) {
            offline=OfflineStore.get(this);
            Button saved=control("↓", "Internetsiz darslar");
            saved.setOnClickListener(v -> web.loadUrl(OfflineStore.HOME));
            toolbar.addView(saved,new LinearLayout.LayoutParams(dp(48),dp(48)));
            updater=new ApkUpdater(this);
            Button updates=control("↑", "Ilova yangilanishlari");
            updates.setOnClickListener(v -> updater.check(true));
            toolbar.addView(updates,new LinearLayout.LayoutParams(dp(48),dp(48)));
        }
        root.addView(toolbar);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        root.addView(progress, new LinearLayout.LayoutParams(-1, dp(3)));
        content = new FrameLayout(this);
        root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));
        web = new WebView(this);
        content.addView(web, new FrameLayout.LayoutParams(-1, -1));
        error = new LinearLayout(this);
        error.setOrientation(LinearLayout.VERTICAL); error.setGravity(Gravity.CENTER);
        error.setPadding(dp(24),dp(24),dp(24),dp(24)); error.setBackgroundColor(Color.rgb(244,248,255));
        TextView message = new TextView(this); message.setText("Sahifa ochilmadi\nInternet aloqasini tekshiring va qayta urinib ko‘ring."); message.setGravity(Gravity.CENTER); message.setTextSize(18);
        error.addView(message);
        Button retry = new Button(this); retry.setText("Qayta urinish"); retry.setOnClickListener(v -> { error.setVisibility(View.GONE); web.reload(); }); error.addView(retry);
        error.setVisibility(View.GONE); content.addView(error,new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false); s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setUserAgentString(s.getUserAgentString() + " DMEDAndroid/" + BuildConfig.VERSION_NAME + " DMEDCode/" + BuildConfig.VERSION_CODE + " " + BuildConfig.FLAVOR);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                Uri url = request.getUrl();
                if(offline!=null&&OfflineStore.isLocal(url)){
                    if(request.isForMainFrame()&&"/download".equals(url.getPath())){if(OfflineStore.isLocal(Uri.parse(web.getUrl()==null?"":web.getUrl())))offline.download(url.getQueryParameter("slug"));return true;}
                    if(request.isForMainFrame()&&"/play".equals(url.getPath())){if(OfflineStore.isLocal(Uri.parse(web.getUrl()==null?"":web.getUrl())))openOfflineVideo(url.getQueryParameter("id"),false);return true;}
                    return false;
                }
                if (trusted(url)) return false;
                if (!request.isForMainFrame()) return true;
                openExternal(url); return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest request){return offline==null?null:offline.serve(request);}
            @Override public void onPageStarted(WebView v, String url, android.graphics.Bitmap icon) { progress.setVisibility(View.VISIBLE); error.setVisibility(View.GONE); }
            @Override public void onPageFinished(WebView v, String url) { CookieManager.getInstance().flush(); progress.setVisibility(View.GONE);
                if(BuildConfig.DEBUG && trusted(Uri.parse(url))) {
                    String word = "mijoz".equals(BuildConfig.FLAVOR) ? "material" : "parol";
                    v.evaluateJavascript("document.querySelector('main') !== null && document.body.innerText.toLowerCase().includes('" + word + "')", value -> android.util.Log.i("DMED_SMOKE", BuildConfig.FLAVOR + ":" + value));
                }
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest request, WebResourceError e) { if(request.isForMainFrame()) { if(BuildConfig.DEBUG) android.util.Log.e("DMED", "Page error " + e.getErrorCode() + ": " + e.getDescription()); showError(); } }
            @Override public void onReceivedHttpError(WebView v, WebResourceRequest request, WebResourceResponse response) { if(request.isForMainFrame() && response.getStatusCode() >= 500) { if(BuildConfig.DEBUG) android.util.Log.e("DMED", "HTTP error " + response.getStatusCode()); showError(); } }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(android.webkit.ConsoleMessage message){if(BuildConfig.DEBUG&&message.message().startsWith("DMED_OFFLINE"))android.util.Log.i("DMED_OFFLINE_TEST",message.message());return false;}
            @Override public void onProgressChanged(WebView v,int value) { progress.setProgress(value); }
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (!trusted(Uri.parse(web.getUrl() == null ? "" : web.getUrl()))) return false;
                if(fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback=callback;
                try { Intent pick = params.createIntent(); pick.addCategory(Intent.CATEGORY_OPENABLE); startActivityForResult(pick,100); }
                catch(ActivityNotFoundException e) { fileCallback.onReceiveValue(null); fileCallback=null; Toast.makeText(MainActivity.this,"Fayl tanlash dasturi topilmadi",Toast.LENGTH_LONG).show(); }
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if(!trusted(request.getOrigin()) || !Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {request.deny();return;}
                    if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED) request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    else { if(pendingAudio!=null) pendingAudio.deny(); pendingAudio=request; requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},101); }
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) { if(pendingAudio==request) pendingAudio=null; }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if(fullVideo!=null) {callback.onCustomViewHidden();return;}
                fullVideo=view; videoCallback=callback; content.addView(view,new FrameLayout.LayoutParams(-1,-1));
            }
            @Override public void onHideCustomView() { hideVideo(); }
        });
        web.setDownloadListener((url, userAgent, disposition, type, length) -> openExternal(Uri.parse(url)));
        if(state==null || web.restoreState(state)==null) loadHome();
        if(BuildConfig.DEBUG && offline!=null && getIntent().getBooleanExtra("offline_test",false)) {
            String slug=getIntent().getStringExtra("offline_lesson");
            web.getSettings().setMediaPlaybackRequiresUserGesture(false);
            if(slug!=null){web.loadUrl(OfflineStore.HOME+"#lesson="+Uri.encode(slug));if(getIntent().getBooleanExtra("offline_download",false))offline.download(slug);}
            if(slug!=null&&getIntent().getBooleanExtra("offline_play",false)){
                try{openOfflineVideo(offline.lessonVideo(slug),true);}catch(Exception e){android.util.Log.e("DMED_OFFLINE_TEST","Offline play failed",e);}
            }
            web.postDelayed(()->web.evaluateJavascript("(async()=>{console.log('DMED_OFFLINE_TEXT:'+document.querySelector('article h2')?.textContent);const image=document.querySelector('img');if(image)console.log('DMED_OFFLINE_IMAGE:'+JSON.stringify({width:image.naturalWidth,complete:image.complete}));const v=document.querySelector('video');if(!v)return JSON.stringify({video:false});v.currentTime=30;await v.play();await new Promise(r=>setTimeout(r,2000));console.log('DMED_OFFLINE_VIDEO:'+JSON.stringify({video:true,time:v.currentTime,duration:v.duration,ready:v.readyState,error:v.error?.code||0}));})()",value->android.util.Log.i("DMED_OFFLINE_TEST",value)),10000);
        }
        if(BuildConfig.DEBUG&&updater!=null&&getIntent().getBooleanExtra("update_preview",false))updater.showPreview(getIntent().getBooleanExtra("update_required",false));
    }
    private void openOfflineVideo(String id,boolean test){
        try{offline.videoFile(id);Intent intent=new Intent(this,OfflineVideoActivity.class).putExtra("media_id",id);if(BuildConfig.DEBUG&&test)intent.putExtra("offline_test",true);startActivity(intent);}catch(Exception e){Toast.makeText(this,"Video hali saqlanmagan. Internet bilan yuklab oling.",Toast.LENGTH_LONG).show();}
    }
    private boolean trusted(Uri uri) { return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && (uri.getPort()==-1 || uri.getPort()==443); }
    private void loadHome() { web.loadUrl(offline!=null&&!offline.online()?OfflineStore.HOME:ORIGIN + BuildConfig.START_PATH); }
    private void showError() { progress.setVisibility(View.GONE); if(offline!=null&&!OfflineStore.isLocal(Uri.parse(web.getUrl()==null?"":web.getUrl()))){web.loadUrl(OfflineStore.HOME);return;}error.setVisibility(View.VISIBLE); }
    private Button control(String text,String label) { Button b=new Button(this);b.setText(text);b.setTextColor(Color.WHITE);b.setTextSize(24);b.setBackgroundColor(Color.TRANSPARENT);b.setContentDescription(label);return b; }
    private int dp(int value) { return Math.round(value*getResources().getDisplayMetrics().density); }
    private void openExternal(Uri url) {
        if(!Arrays.asList("https","tel","mailto").contains(url.getScheme())) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW,url).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch(ActivityNotFoundException e) { Toast.makeText(this,"Bu havolani ochadigan dastur topilmadi",Toast.LENGTH_SHORT).show(); }
    }
    private void hideVideo() { if(fullVideo!=null) {content.removeView(fullVideo);fullVideo=null;if(videoCallback!=null)videoCallback.onCustomViewHidden();videoCallback=null;} }
    private void goBack() { if(fullVideo!=null)hideVideo();else if(web.canGoBack())web.goBack();else finish(); }
    @Override public void onBackPressed() { goBack(); }
    @Override protected void onSaveInstanceState(Bundle state) { web.saveState(state);super.onSaveInstanceState(state); }
    @Override protected void onPause() { if(updater!=null)updater.pause();web.onPause();CookieManager.getInstance().flush();super.onPause(); }
    @Override protected void onResume() { super.onResume();if(web!=null)web.onResume();if(updater!=null)updater.resume();if(offline!=null)offline.syncCatalog(); }
    @Override protected void onActivityResult(int code,int result,Intent data) {
        super.onActivityResult(code,result,data);
        if(code==100 && fileCallback!=null) {
            Uri[] selected=WebChromeClient.FileChooserParams.parseResult(result,data);
            if(selected!=null)for(Uri uri:selected)if(!"content".equals(uri.getScheme())) {selected=null;break;}
            fileCallback.onReceiveValue(selected);fileCallback=null;
        }
    }
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results) {
        super.onRequestPermissionsResult(code,permissions,results);
        if(code==101 && pendingAudio!=null) {
            if(results.length>0 && results[0]==PackageManager.PERMISSION_GRANTED && trusted(pendingAudio.getOrigin())) pendingAudio.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});else pendingAudio.deny();pendingAudio=null;
        }
    }
    @Override protected void onDestroy() { if(updater!=null)updater.destroy();if(pendingAudio!=null)pendingAudio.deny();if(fileCallback!=null)fileCallback.onReceiveValue(null);hideVideo();if(web!=null){((ViewGroup)web.getParent()).removeView(web);web.destroy();}super.onDestroy(); }
}
