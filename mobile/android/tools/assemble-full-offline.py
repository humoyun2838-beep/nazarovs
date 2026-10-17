import collections, concurrent.futures, hashlib, importlib.util, json, os, pathlib, shutil
path=pathlib.Path(__file__).with_name('prepare-full-offline.py')
spec=importlib.util.spec_from_file_location('prepare',path);prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)
root=pathlib.Path(os.environ.get('DMED_MEDIA_DEST','media-output'))
assets=prepare.ASSETS;media=assets/'media';media.mkdir(exist_ok=True)
index={};failures=[];recovered=0;unique={}
allowed=json.loads((assets/'unavailable-media.json').read_text()) if (assets/'unavailable-media.json').exists() else {}
by_file={}
for raw in prepare.sources:
    if raw.startswith('notion:'):
        by_file.setdefault(raw.split('|')[1],[]).append(raw)
pending=[];repair_errors={}
for raw,kind in prepare.sources.items():
    key=hashlib.sha256(raw.encode()).hexdigest();file=root/key;meta=root/(key+'.json')
    if key in allowed or file.exists() and meta.exists():continue
    for alias in by_file.get(raw.split('|')[1] if raw.startswith('notion:') else '',[]):
        other=hashlib.sha256(alias.encode()).hexdigest()
        if (root/other).exists() and (root/(other+'.json')).exists():
            shutil.copyfile(root/other,file);shutil.copyfile(root/(other+'.json'),meta);recovered+=1;break
    else:pending.append((raw,kind))
print(json.dumps(dict(recovered_aliases=recovered,retry_sources=len(pending))),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for number,(key,result) in enumerate(pool.map(prepare.prepare,pending),1):
        if 'error' not in result:recovered+=1
        elif result['kind']=='IMAGE' and 'HTTP Error 404' in result['error']:
            # The user chose to package available files. Keep an explicit
            # placeholder for permanently missing images after all retries.
            allowed[key]=dict(kind='IMAGE',unavailable=True,reason='Rasm manbasi mavjud emas',source_error=404)
        else:repair_errors[key]=result['error']
        print(json.dumps(dict(retried=number,total=len(pending),unavailable=len(allowed),errors=len(repair_errors))),flush=True)
for raw,kind in prepare.sources.items():
    key=hashlib.sha256(raw.encode()).hexdigest();file=root/key;meta=root/(key+'.json')
    try:
        if key in allowed:
            assert allowed[key].get('approved') and kind=='VIDEO' or kind=='IMAGE' and allowed[key].get('source_error')==404
            index[key]=allowed[key];continue
        if key in repair_errors:raise ValueError(repair_errors[key])
        item=json.loads(meta.read_text())
        assert file.stat().st_size==item['size'] and hashlib.sha256(file.read_bytes()).hexdigest()==item['sha256']
        assert item['kind']==kind
        asset=item['sha256'];item['asset']=asset
        if asset not in unique:shutil.copyfile(file,media/(asset+'.bin'));unique[asset]=item['size']
        index[key]=item
    except Exception as error:failures.append(dict(id=key,kind=kind,error=str(error)))
sections=[]
section_dir=assets/'sections';section_dir.mkdir(exist_ok=True)
for category in prepare.catalog['categories']:
    slug=category['slug'];last_error=''
    for folder in ['ai-color-v4','ai-notion-v6']:
        try:
            with prepare.request(prepare.ORIGIN+'/art/'+folder+'/'+slug+'.webp') as response:data=response.read()
            with prepare.Image.open(prepare.io.BytesIO(data)) as image:image.verify()
            (section_dir/(slug+'.webp')).write_bytes(data);sections.append(dict(slug=slug,size=len(data),sha256=hashlib.sha256(data).hexdigest()));break
        except Exception as error:last_error=str(error)
    else:failures.append(dict(section=slug,error=last_error))
size=sum(unique.values())
report=dict(expected=len(prepare.sources),included=len(index)-len(allowed),approved_unavailable=allowed,unique_files=len(unique),kinds=dict(collections.Counter(x['kind'] for x in index.values() if not x.get('unavailable'))),section_images=sections,recovered=recovered,media_bytes=size,missing=failures)
pathlib.Path('media-completeness.json').write_text(json.dumps(report,indent=2))
assert not failures, f'{len(failures)} media files missing; refusing incomplete APK'
assert size<3700000000, 'Media exceeds safe single-APK budget'
(assets/'media-index.json').write_text(json.dumps(index,separators=(',',':')))
print(json.dumps({k:v for k,v in report.items() if k!='missing'}))
