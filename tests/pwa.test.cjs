// No dependencies or network required: node --test tests/pwa.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const manifest=JSON.parse(read('manifest.json'));

test('Android manifest, real PNG sizes and GitHub Pages-relative URLs',()=>{
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.scope,'./');assert.equal(manifest.id,'./');
 assert.equal(manifest.start_url,'./');assert.ok(manifest.name&&manifest.short_name);
 for(const size of [192,512]){
  const icon=manifest.icons.find(i=>i.sizes===`${size}x${size}`);
  assert.ok(icon);assert.equal(icon.type,'image/png');
  const bytes=fs.readFileSync(path.join(root,icon.src));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);
  assert.equal(new URL(icon.src,'https://example.github.io/workout-app/manifest.json').pathname,`/workout-app/${icon.src}`);
 }
 assert.ok(manifest.icons.some(i=>i.purpose.includes('maskable')));
 assert.ok(fs.existsSync(path.join(root,'.nojekyll')));
 assert.match(read('index.html'),/width=device-width,initial-scale=1/);
 assert.match(read('style.css'),/min-height:48px/);
 assert.match(read('app.js'),/const key='clay-training-v1'/);
});

function worker(scope='https://example.github.io/workout-app/'){
 const listeners={},stores=new Map(),downloads=[],network=[],deleted=[];
 let offline=false,failInstall=false,claimed=false;
 const cacheFor=name=>{
  if(!stores.has(name))stores.set(name,new Map());
  const entries=stores.get(name);
  return {
   async addAll(requests){
    if(failInstall)throw new Error('Download interrupted');
    for(const request of requests){
     assert.equal(request.cache,'reload');
     downloads.push(request.url);entries.set(request.url,new Response('cached:'+request.url));
    }
   },
   async match(request){return entries.get(typeof request==='string'?request:request.url)?.clone();}
  };
 };
 const context=vm.createContext({URL,Request,Response,self:{registration:{scope},location:{origin:new URL(scope).origin},clients:{async claim(){claimed=true;}},addEventListener:(name,fn)=>listeners[name]=fn},caches:{async open(name){return cacheFor(name);},async keys(){return [...stores.keys()];},async delete(name){deleted.push(name);return stores.delete(name);}},fetch:async request=>{network.push(request.url);if(offline)throw new Error('Offline');return new Response('network');}});
 vm.runInContext(read('sw.js'),context);
 return {listeners,stores,downloads,network,deleted,setOffline(){offline=true;},failInstall(){failInstall=true;},get claimed(){return claimed;},async lifecycle(name){let pending;listeners[name]({waitUntil:p=>pending=p});await pending;},async fetch(url,mode='cors',method='GET'){let result;listeners.fetch({request:{url,mode,method},respondWith:p=>result=p});return result?await result:undefined;}};
}

test('Offline shell, icons, explicit index and query launch work under a repository path',async()=>{
 const w=worker();await w.lifecycle('install');await w.lifecycle('activate');assert.ok(w.claimed);
 assert.equal(w.downloads.length,8);
 for(const url of w.downloads){
  const pathname=new URL(url).pathname.replace('/workout-app/','');
  assert.ok(fs.existsSync(path.join(root,pathname||'index.html')));
 }
 w.setOffline();
 for(const url of w.downloads)assert.match(await (await w.fetch(url)).text(),/^cached:/);
 for(const suffix of ['', 'index.html', '?source=home']){
  assert.equal(await (await w.fetch('https://example.github.io/workout-app/'+suffix,'navigate')).text(),'cached:https://example.github.io/workout-app/');
 }
 assert.equal(w.network.length,0);
});

test('Only this app cache is cleaned; interrupted installation leaves prior release intact',async()=>{
 const w=worker();
 const prefix='clay-training:https://example.github.io/workout-app/:';
 w.stores.set(prefix+'old',new Map());
 w.stores.set('clay-training:https://example.github.io/other/:v1',new Map());
 w.stores.set('unrelated-cache',new Map());
 await w.lifecycle('install');await w.lifecycle('activate');
 assert.deepEqual(w.deleted,[prefix+'old']);
 const failed=worker();failed.stores.set(prefix+'working',new Map());failed.failInstall();
 await assert.rejects(failed.lifecycle('install'),/interrupted/);
 assert.ok(failed.stores.has(prefix+'working'));assert.equal(failed.claimed,false);
 // Waiting for old clients prevents mixing old JS with new HTML mid-workout.
 assert.doesNotMatch(read('sw.js'),/self\.skipWaiting\(/);
});

test('Does not intercept another Pages project, cross-origin traffic or writes',async()=>{
 const w=worker();await w.lifecycle('install');
 assert.equal(await w.fetch('https://example.github.io/other/app.js'),undefined);
 assert.equal(await w.fetch('https://another.example/app.js'),undefined);
 assert.equal(await w.fetch('https://example.github.io/workout-app/data','cors','POST'),undefined);
 assert.equal(await (await w.fetch('https://example.github.io/workout-app/extra.json')).text(),'network');
});

test('Root-domain deployment also works',async()=>{
 const w=worker('https://example.com/');await w.lifecycle('install');w.setOffline();
 assert.match(await (await w.fetch('https://example.com/?launch=1','navigate')).text(),/^cached:/);
});
