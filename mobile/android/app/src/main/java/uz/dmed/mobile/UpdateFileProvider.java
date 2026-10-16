package uz.dmed.mobile;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

/** A read-only, non-exported provider exposing exactly one verified APK. */
public final class UpdateFileProvider extends ContentProvider {
    @Override public boolean onCreate() {return true;}
    private File file(Uri uri) throws FileNotFoundException {
        if(getContext()==null || !(getContext().getPackageName()+".updates").equals(uri.getAuthority()) || !"/update.apk".equals(uri.getPath()) || uri.getQuery()!=null) throw new FileNotFoundException("Unknown file");
        File file=new File(new File(getContext().getCacheDir(),"updates"),"update.apk");
        if(!file.isFile())throw new FileNotFoundException("APK missing");
        return file;
    }
    @Override public String getType(Uri uri) {try {file(uri);return "application/vnd.android.package-archive";}catch(FileNotFoundException e){return null;}}
    @Override public ParcelFileDescriptor openFile(Uri uri,String mode) throws FileNotFoundException {
        if(!"r".equals(mode))throw new FileNotFoundException("Read only");
        return ParcelFileDescriptor.open(file(uri),ParcelFileDescriptor.MODE_READ_ONLY);
    }
    @Override public Cursor query(Uri uri,String[] projection,String selection,String[] args,String order) {
        try {
            File f=file(uri);String[] columns=projection==null?new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE}:projection;
            MatrixCursor cursor=new MatrixCursor(columns);Object[] row=new Object[columns.length];
            for(int i=0;i<columns.length;i++)row[i]=OpenableColumns.DISPLAY_NAME.equals(columns[i])?"DMED-Mijoz.apk":OpenableColumns.SIZE.equals(columns[i])?f.length():null;
            cursor.addRow(row);return cursor;
        } catch(FileNotFoundException e){return null;}
    }
    @Override public Uri insert(Uri uri,ContentValues values){throw new UnsupportedOperationException("Read only");}
    @Override public int update(Uri uri,ContentValues values,String where,String[] args){throw new UnsupportedOperationException("Read only");}
    @Override public int delete(Uri uri,String where,String[] args){throw new UnsupportedOperationException("Read only");}
}
