package uz.dmed.mobile;

import android.app.Activity;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.pdf.PdfRenderer;
import android.widget.*;
import java.io.*;
import java.util.concurrent.Executors;

/** Local PDF attachments, rendered one page at a time without a network viewer. */
public final class OfflineDocumentActivity extends Activity {
    private PdfRenderer renderer;
    private ImageView image;
    private TextView status;
    private Bitmap bitmap;
    private int page;
    private final java.util.concurrent.ExecutorService worker=Executors.newSingleThreadExecutor();
    @Override public void onCreate(Bundle saved){
        super.onCreate(saved);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(12,40,12,24);root.setBackgroundColor(Color.WHITE);
        Button back=new Button(this);back.setText("‹ Darsga qaytish");back.setOnClickListener(v->finish());root.addView(back);
        status=new TextView(this);status.setText("PDF ochilmoqda… Internet kerak emas.");root.addView(status);
        ScrollView scroll=new ScrollView(this);image=new ImageView(this);image.setAdjustViewBounds(true);scroll.addView(image);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout navigation=new LinearLayout(this);Button previous=new Button(this),next=new Button(this);previous.setText("← Oldingi");next.setText("Keyingi →");navigation.addView(previous);navigation.addView(next);root.addView(navigation);setContentView(root);
        previous.setOnClickListener(v->{if(renderer!=null&&page>0){page--;render();}});next.setOnClickListener(v->{if(renderer!=null&&page+1<renderer.getPageCount()){page++;render();}});
        String id=getIntent().getStringExtra("media_id");
        worker.execute(()->{try{
            if(id==null||!id.matches("[a-f0-9]{64}")||!"application/pdf".equals(OfflineStore.get(this).bundledMime(id)))throw new IOException();
            File file=new File(getCacheDir(),"document-"+id+".pdf");
            File partial=new File(getCacheDir(),"document-"+id+".tmp");
            if(!file.isFile()){try(InputStream in=getAssets().open(OfflineStore.get(this).bundledAsset(id));FileOutputStream out=new FileOutputStream(partial)){byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1)out.write(b,0,n);out.getFD().sync();}if(!partial.renameTo(file))throw new IOException("PDF saqlanmadi");}
            PdfRenderer pdf=new PdfRenderer(ParcelFileDescriptor.open(file,ParcelFileDescriptor.MODE_READ_ONLY));
            runOnUiThread(()->{if(isDestroyed()){pdf.close();return;}renderer=pdf;render();});
        }catch(Exception e){runOnUiThread(()->{if(!isDestroyed())status.setText("PDF ochilmadi.");});}});
    }
    private void render(){
        if(renderer==null)return;
        try(PdfRenderer.Page current=renderer.openPage(page)){
            int width=Math.min(1600,Math.max(640,getResources().getDisplayMetrics().widthPixels));int height=(int)((long)width*current.getHeight()/current.getWidth());
            Bitmap next=Bitmap.createBitmap(width,Math.min(height,4000),Bitmap.Config.ARGB_8888);next.eraseColor(Color.WHITE);current.render(next,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
            image.setImageBitmap(next);if(bitmap!=null)bitmap.recycle();bitmap=next;status.setText("PDF • "+(page+1)+" / "+renderer.getPageCount()+" • Oflayn");if(BuildConfig.DEBUG)android.util.Log.i("DMED_OFFLINE_TEST","DMED_OFFLINE_PDF:"+renderer.getPageCount()+":"+width);
        }catch(Exception e){status.setText("Sahifa ochilmadi.");}
    }
    @Override protected void onDestroy(){worker.shutdown();if(renderer!=null)renderer.close();if(bitmap!=null){image.setImageDrawable(null);bitmap.recycle();}super.onDestroy();}
}
