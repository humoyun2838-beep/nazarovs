package uz.dmed.mobile;

import java.net.URI;

/** No version-name string ordering: Android's monotonically increasing code wins. */
public final class UpdatePolicy {
    public final String version, url, sha256, notes;
    public final int code, minimum;
    public final boolean force;
    public final long size;
    public UpdatePolicy(String version, int code, int minimum, boolean force, String url, String sha256, long size, String notes) {
        if(version==null || !version.matches("[0-9]{1,5}\\.[0-9]{1,5}\\.[0-9]{1,5}") || code<1 || code>2100000000 || minimum<1 || minimum>code) throw new IllegalArgumentException("Versiya ma’lumotlari noto‘g‘ri.");
        if(!trustedUrl(url) || sha256==null || !sha256.matches("[a-fA-F0-9]{64}") || size<1 || size>134217728L || notes==null || notes.length()>4000) throw new IllegalArgumentException("APK manbasi yoki yaxlitlik ma’lumotlari noto‘g‘ri.");
        this.version=version;this.code=code;this.minimum=minimum;this.force=force;this.url=url;this.sha256=sha256.toLowerCase(java.util.Locale.ROOT);this.size=size;this.notes=notes;
    }
    public static boolean trustedUrl(String raw) {
        try {
            URI u=new URI(raw);
            return "https".equals(u.getScheme()) && "raw.githubusercontent.com".equals(u.getHost()) && u.getPort()==-1 && u.getUserInfo()==null && u.getQuery()==null && u.getFragment()==null &&
                u.getRawPath().matches("/humoyun2838-beep/nazarovs/[a-f0-9]{40}/releases/android/DMED-Mijoz\\.apk");
        } catch(Exception e) {return false;}
    }
    public boolean available(int installed) { return code>installed; }
    public boolean required(int installed) { return installed<minimum || (force && available(installed)); }
}
