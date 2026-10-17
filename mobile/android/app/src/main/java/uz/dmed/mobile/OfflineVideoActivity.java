package uz.dmed.mobile;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.*;
import java.io.File;

/** A private local file goes directly to Android's player, without WebView/network. */
public final class OfflineVideoActivity extends Activity {
    private VideoView video;
    private TextView status;
    private int position;
    private boolean resume;
    private boolean failed;
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(13,31,58));getWindow().setNavigationBarColor(Color.rgb(13,31,58));
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(13,31,58));
        root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets.consumeSystemWindowInsets();});
        Button back=new Button(this);back.setText("‹ Darsga qaytish");back.setTextColor(Color.WHITE);back.setBackgroundColor(Color.rgb(13,31,58));back.setOnClickListener(v->finish());root.addView(back);
        FrameLayout stage=new FrameLayout(this);video=new VideoView(this);FrameLayout.LayoutParams layout=new FrameLayout.LayoutParams(-1,-1,Gravity.CENTER);stage.addView(video,layout);root.addView(stage,new LinearLayout.LayoutParams(-1,0,1));
        status=new TextView(this);status.setText("Saqlangan video ochilmoqda… Internet kerak emas.");status.setTextColor(Color.WHITE);status.setPadding(24,24,24,24);root.addView(status);setContentView(root);
        try{
            File file=OfflineStore.get(this).videoFile(getIntent().getStringExtra("media_id"));
            if(state!=null)position=state.getInt("position",0);
            MediaController controls=new MediaController(this);controls.setAnchorView(video);video.setMediaController(controls);
            video.setOnErrorListener((player,what,extra)->{failed=true;status.setText("Video ochilmadi. Darsga qaytib videoni qayta yuklab oling.");if(BuildConfig.DEBUG)android.util.Log.e("DMED_OFFLINE_TEST","Native video error "+what+":"+extra);return true;});
            video.setOnPreparedListener(player->{
                status.setText("✓ Oflayn video • Telefon xotirasidan");
                boolean test=BuildConfig.DEBUG&&getIntent().getBooleanExtra("offline_test",false);
                if(test)position=30000;
                if(position>0)video.seekTo(position);video.start();controls.show(3000);
                if(test)video.postDelayed(()->{try{org.json.JSONObject result=new org.json.JSONObject();result.put("video",true);result.put("time",video.getCurrentPosition()/1000.0);result.put("duration",video.getDuration()/1000.0);result.put("ready",video.isPlaying()?4:1);result.put("error",failed?1:0);android.util.Log.i("DMED_OFFLINE_TEST","DMED_OFFLINE_VIDEO:"+result);}catch(Exception ignored){}},3500);
            });
            video.setVideoPath(file.getAbsolutePath());
        }catch(Exception e){failed=true;status.setText("Video hali saqlanmagan. Darsga qaytib internet bilan yuklab oling.");}
    }
    @Override protected void onPause(){resume=video!=null&&video.isPlaying();if(video!=null){position=video.getCurrentPosition();video.pause();}super.onPause();}
    @Override protected void onResume(){super.onResume();if(resume&&video!=null&&!failed){video.seekTo(position);video.start();}}
    @Override protected void onSaveInstanceState(Bundle state){if(video!=null)state.putInt("position",video.getCurrentPosition());super.onSaveInstanceState(state);}
    @Override protected void onDestroy(){if(video!=null)video.stopPlayback();super.onDestroy();}
}
