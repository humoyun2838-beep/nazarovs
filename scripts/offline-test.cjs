const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ts=require('typescript');
const compiled=ts.transpileModule(fs.readFileSync('src/components/material-body.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
const parsedExports={};vm.runInNewContext(compiled,{exports:parsedExports,require:()=>({}),URL});
const parsed=parsedExports.parseContent('IMAGE::notion:28d60b77-fbf5-8101-9e9c-d4be6b897340|c5080cda-6fc9-486f-b512-d0da4bbf080f|image.png\nVIDEO::/media/example.mp4\nText',{});
assert.equal(parsed.filter(block=>block.type==='image').length,1,'keep IMAGE marker ending in .png');
assert.equal(parsed.filter(block=>block.type==='video').length,1);
const listeners={},maps=new Map();const caches={open:async name=>({match:async key=>maps.get(name)?.get(typeof key==='string'?key:key.url)?.clone(),put:async(key,value)=>{if(!maps.has(name))maps.set(name,new Map());maps.get(name).set(key,value.clone());},add:async()=>{}})};
vm.runInNewContext(fs.readFileSync('public/dmed-offline-sw.js','utf8'),{self:{location:{origin:'https://dmed.test'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(type,fn)=>listeners[type]=fn},caches,URL,Response,fetch:async()=>{throw Error('offline')}});
async function request(path,range,method='GET',mode='cors'){let promise;listeners.fetch({request:{url:'https://dmed.test'+path,headers:new Headers(range?{range}:{}),method,mode},respondWith:p=>promise=p});return promise;}
(async()=>{
const media=await caches.open('dmed-offline-media-v1');await media.put('/offline-media/test',new Response('0123456789',{headers:{'content-type':'video/mp4'}}));
for(const [range,status,body] of [[null,200,'0123456789'],['bytes=2-4',206,'234'],['bytes=7-',206,'789'],['bytes=-3',206,'789'],['bytes=20-',416,''],['bytes=8-2',416,''],['bytes=0-0,4-5',416,'']]){const res=await request('/offline-media/test',range);assert.equal(res.status,status);assert.equal(await res.text(),body);}
assert.equal((await request('/offline-media/missing')).status,404);
const shell=await caches.open('dmed-offline-shell-v1');await shell.put('/offline.html',new Response('offline reader'));
for(const path of ['/m/example','/b/shifokor','/nazarov'])assert.equal(await(await request(path,null,'GET','navigate')).text(),'offline reader');
for(const path of ['/admin','/operator','/api/chat','/api/admin/chat','/api/mobile-release'])assert.equal(await request(path,null,'GET','navigate'),undefined);
assert.equal(await request('/api/chat',null,'POST'),undefined);
console.log('PASS: full video, seek, suffix, invalid ranges, missing assets, offline navigation; admin/operator/chat remain network-only');
})();
