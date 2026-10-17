"""Resume-safe public lesson media preparation; refuses to package missing files."""
import concurrent.futures, gzip, hashlib, io, json, os, pathlib, re, ssl, subprocess, sys, tempfile, time, urllib.parse, urllib.request, zipfile
ROOT=pathlib.Path(os.environ.get('DMED_PROJECT_ROOT',pathlib.Path(__file__).resolve().parent.parent))
sys.path.insert(0,str(ROOT/'.mobile-tools/media-runtime'))
from PIL import Image, ImageOps
import imageio_ffmpeg
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
ORIGIN='https://nazarovs-production.up.railway.app'
ASSETS=pathlib.Path(os.environ.get('DMED_ASSETS',ROOT/'mobile-delivery/android/app/src/mijoz/assets/offline'))
DEST=pathlib.Path(os.environ.get('DMED_MEDIA_DEST',ROOT/'.mobile-tools/full-offline-media'));DEST.mkdir(exist_ok=True)
SSL=ssl.create_default_context(cafile='/etc/ssl/cert.pem' if pathlib.Path('/etc/ssl/cert.pem').exists() else None)
catalog=json.loads(gzip.decompress((ASSETS/'catalog.json.gz').read_bytes()))
sources={}
for lesson in catalog['materials']:
    if lesson.get('imageUrl'):sources[lesson['imageUrl']]='IMAGE'
    for kind,raw in re.findall(r'(?m)^(IMAGE|VIDEO|FILE)::([^\r\n]+)',lesson['content']):sources[raw.strip()]=kind
    for raw in re.findall(r'!\[[^\]]*\]\(([^)]+)\)',lesson['content']):sources[raw]='IMAGE'
    for raw in re.findall(r'\[[^\]]*\]\((https://[^)]+\.mp4(?:\?[^)]*)?)\)',lesson['content']):sources[raw]='VIDEO'
for raw in sources:
    if urllib.parse.unquote(raw).split('?',1)[0].lower().endswith(('.pdf','.docx')):sources[raw]='FILE'

def request(url):
    p=urllib.parse.urlsplit(url)
    url=urllib.parse.urlunsplit((p.scheme,p.netloc,urllib.parse.quote(p.path,safe='/%:@'),urllib.parse.quote(p.query,safe='=&%:+/?'),''))
    return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'DMED-Offline-Pack/1.3'}),timeout=90,context=SSL)

def prepare(pair):
    raw,kind=pair;key=hashlib.sha256(raw.encode()).hexdigest();target=DEST/key;metadata=DEST/(key+'.json')
    if target.exists() and metadata.exists():
        item=json.loads(metadata.read_text())
        if target.stat().st_size==item['size'] and hashlib.sha256(target.read_bytes()).hexdigest()==item['sha256']:return key,item
    error=''
    for attempt in range(3):
        source=DEST/(key+'.source');partial=DEST/(key+'.partial.mp4')
        try:
            if raw.startswith('notion:'):
                b,f,n=raw[7:].split('|',2)
                with request(ORIGIN+'/api/media/notion?'+urllib.parse.urlencode(dict(b=b,f=f,n=n,fmt='json'))) as response:url=json.load(response)['url']
            else:
                url=urllib.parse.urljoin(ORIGIN,raw)
                parsed=urllib.parse.urlsplit(url)
                if parsed.hostname in ('www.notion.so','notion.so') and parsed.path.startswith('/image/'):
                    direct=urllib.parse.unquote(parsed.path[len('/image/'):])
                    if direct.startswith('https://'):url=direct
            with request(url) as response,source.open('wb') as output:
                mime=response.headers.get('Content-Type','').split(';')[0];expected=int(response.headers.get('Content-Length',0));count=0
                while chunk:=response.read(1024*1024):output.write(chunk);count+=len(chunk)
                if not count or expected and expected!=count:raise ValueError('Incomplete source download')
            if kind=='VIDEO':
                command=[FFMPEG,'-nostdin','-v','error','-y','-i',str(source),'-map','0:v:0','-map','0:a:0?','-vf',"scale='min(640,iw)':'min(360,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",'-c:v','libx264','-threads','2','-preset','fast','-crf','32','-maxrate','240k','-bufsize','480k','-pix_fmt','yuv420p','-c:a','aac','-b:a','32k','-ac','1','-movflags','+faststart',str(partial)]
                result=subprocess.run(command,capture_output=True,text=True,timeout=3600)
                if result.returncode:raise ValueError(result.stderr[-800:])
                check=subprocess.run([FFMPEG,'-v','error','-i',str(partial),'-f','null','-'],capture_output=True,text=True,timeout=900)
                if check.returncode:raise ValueError('Converted video decode failed: '+check.stderr[-300:])
                mime='video/mp4'
            elif kind=='IMAGE':
                with Image.open(source) as image:
                    image=ImageOps.exif_transpose(image);image.thumbnail((1600,1600));image.save(partial,format='WEBP',quality=82,method=5)
                with Image.open(partial) as image:image.verify()
                mime='image/webp'
            else:
                if not source.read_bytes().startswith(b'%PDF-'):
                    if not zipfile.is_zipfile(source):raise ValueError('Unsupported lesson document')
                    with zipfile.ZipFile(source) as archive:
                        if 'word/document.xml' not in archive.namelist():raise ValueError('Invalid Word document')
                    with tempfile.TemporaryDirectory(prefix='dmed-docx-',dir=DEST) as temp:
                        folder=pathlib.Path(temp).resolve();document=folder/'lesson.docx';source.replace(document)
                        result=subprocess.run(['libreoffice','-env:UserInstallation='+ (folder/'profile').as_uri(),'--headless','--convert-to','pdf','--outdir',str(folder),str(document)],capture_output=True,text=True,timeout=180)
                        converted=folder/'lesson.pdf'
                        if result.returncode or not converted.exists() or not converted.read_bytes().startswith(b'%PDF-'):raise ValueError('Word to PDF conversion failed')
                        converted.replace(source)
                source.replace(partial);mime='application/pdf'
            partial.replace(target)
            item=dict(size=target.stat().st_size,mime=mime,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),kind=kind)
            metadata.write_text(json.dumps(item));source.unlink(missing_ok=True)
            return key,item
        except Exception as exc:
            error=str(exc);source.unlink(missing_ok=True);partial.unlink(missing_ok=True);time.sleep(2*(attempt+1))
    return key,dict(kind=kind,error=error)

if __name__=='__main__':
    results={};started=time.time()
    # Videos first: establish whether the complete package can fit before processing images.
    selected=sorted(sources.items(),key=lambda pair:(pair[1]!='VIDEO',pair[0]))
    shards=int(os.environ.get('DMED_SHARDS','1'));shard=int(os.environ.get('DMED_SHARD','0'))
    selected=[item for i,item in enumerate(selected) if i%shards==shard]
    limit=int(os.environ.get('DMED_MEDIA_LIMIT','0'))
    if limit:selected=selected[:limit]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for number,(key,item) in enumerate(pool.map(prepare,selected),1):
            results[key]=item
            report=dict(checked=number,total=len(selected),bytes=sum(x.get('size',0) for x in results.values()),errors=sum('error' in x for x in results.values()),seconds=round(time.time()-started))
            (DEST/'progress.json').write_text(json.dumps(report));(DEST/'results.json').write_text(json.dumps(results))
            print(json.dumps(report),flush=True)
    missing=[key for key,item in results.items() if 'error' in item]
    if shards>1:sys.exit(0)
    if missing or limit:sys.exit('Not ready for packaging: incomplete collection or sample run')
    if shards>1:sys.exit(0)
    if sum(x['size'] for x in results.values())>3700000000:sys.exit('Not ready: exceeds safe single-APK media budget')
    (DEST/'index.json').write_text(json.dumps(results,separators=(',',':')))
    print('ALL MEDIA VERIFIED; ready for APK packaging',flush=True)
