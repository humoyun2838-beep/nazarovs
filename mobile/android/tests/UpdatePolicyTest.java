package uz.dmed.mobile;
public class UpdatePolicyTest {
    static final String URL="https://raw.githubusercontent.com/humoyun2838-beep/nazarovs/9fe7f63941cb713efa8a0cbf2d8dff406c60e60e/releases/android/DMED-Mijoz.apk";
    static final String SHA="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    static void check(boolean value){if(!value)throw new AssertionError();}
    public static void main(String[] args){
        UpdatePolicy optional=new UpdatePolicy("1.1.0",2,1,false,URL,SHA,21119,"notes");
        check(optional.available(1));check(!optional.available(2));check(!optional.required(1));
        check(new UpdatePolicy("1.2.0",3,2,false,URL,SHA,21119,"notes").required(1));
        check(new UpdatePolicy("1.1.0",2,1,true,URL,SHA,21119,"notes").required(1));
        check(!new UpdatePolicy("1.1.0",2,1,true,URL,SHA,21119,"notes").required(2));
        for(String bad:new String[]{URL.replace("https:","http:"),URL.replace("raw.githubusercontent.com","evil.example"),URL.replace("9fe7f63941cb713efa8a0cbf2d8dff406c60e60e","main"),URL+"?redirect=x",URL+"#x",URL.replace("DMED-Mijoz.apk","../private.apk"),URL.replace("https://","https://user:pass@"),URL.replace(".com/",".com:443/")})check(!UpdatePolicy.trustedUrl(bad));
        try{new UpdatePolicy("1.1.0",2,3,false,URL,SHA,21119,"notes");throw new AssertionError();}catch(IllegalArgumentException expected){}
        try{new UpdatePolicy("1.1.0",2,1,false,URL,"bad",21119,"notes");throw new AssertionError();}catch(IllegalArgumentException expected){}
        System.out.println("PASS: integer version policy, optional/required, trusted immutable URL, malformed release rejection");
    }
}
