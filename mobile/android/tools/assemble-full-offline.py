import hashlib, importlib.util, json, os, pathlib, shutil
path=pathlib.Path(__file__).with_name('prepare-full-offline.py')
spec=importlib.util.spec_from_file_location('prepare',path);prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)
root=pathlib.Path(os.environ.get('DMED_MEDIA_DEST','media-output'))
assets=prepare.ASSETS;media=assets/'media';media.mkdir(exist_ok=True)
index={};failures=[]
for raw,kind in prepare.sources.items():
    key=hashlib.sha256(raw.encode()).hexdigest();file=root/key;meta=root/(key+'.json')
    try:
        item=json.loads(meta.read_text())
        assert file.stat().st_size==item['size'] and hashlib.sha256(file.read_bytes()).hexdigest()==item['sha256']
        assert item['kind']==kind
        shutil.copyfile(file,media/(key+'.bin'));index[key]=item
    except Exception as error:failures.append(dict(id=key,kind=kind,error=str(error)))
size=sum(x['size'] for x in index.values())
report=dict(expected=len(prepare.sources),included=len(index),media_bytes=size,missing=failures)
pathlib.Path('media-completeness.json').write_text(json.dumps(report,indent=2))
assert not failures, f'{len(failures)} media files missing; refusing incomplete APK'
assert size<3700000000, 'Media exceeds safe single-APK budget'
(assets/'media-index.json').write_text(json.dumps(index,separators=(',',':')))
print(json.dumps({k:v for k,v in report.items() if k!='missing'}))
