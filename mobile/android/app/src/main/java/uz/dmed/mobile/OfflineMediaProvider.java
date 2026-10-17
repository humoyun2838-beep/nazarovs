package uz.dmed.mobile;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.net.Uri;
import java.io.FileNotFoundException;

/** Private, seekable APK assets for Android's native media player. */
public final class OfflineMediaProvider extends ContentProvider {
    @Override public boolean onCreate(){return true;}
    @Override public AssetFileDescriptor openAssetFile(Uri uri,String mode)throws FileNotFoundException {
        if(!"r".equals(mode)||uri.getPathSegments().size()!=1)throw new FileNotFoundException();
        String id=uri.getLastPathSegment();
        if(id==null||!id.matches("[a-f0-9]{64}")||getContext()==null)throw new FileNotFoundException();
        try{return getContext().getAssets().openFd(OfflineStore.get(getContext()).bundledAsset(id));}
        catch(java.io.IOException e){throw new FileNotFoundException("Bundled media unavailable");}
    }
    @Override public String getType(Uri uri){return getContext()==null?null:OfflineStore.get(getContext()).bundledMime(uri.getLastPathSegment());}
    @Override public Cursor query(Uri u,String[] p,String s,String[] a,String o){return null;}
    @Override public Uri insert(Uri u,ContentValues v){throw new UnsupportedOperationException();}
    @Override public int update(Uri u,ContentValues v,String s,String[] a){throw new UnsupportedOperationException();}
    @Override public int delete(Uri u,String s,String[] a){throw new UnsupportedOperationException();}
}
