// Run directly: node tests/progression.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=['progression.js','app.js'].map(name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8')).join('\n');
function boot(saved){
 const storage=new Map(saved||[]),nodes={},alerts=[];
 const control=()=>({value:'',disabled:false,tagName:'INPUT',options:[],add(option){this.options.push(option);}});
 const form=()=>({elements:Object.fromEntries(['name','equipment','sets','target','measure','weight','actual','performedAt'].map(n=>[n,control()])),reset(){},onsubmit:null});
 for(const id of ['exerciseForm','recordForm'])nodes['#'+id]=form();
 for(const id of ['editor','recordDialog'])nodes['#'+id]={open:false,showModal(){this.open=true;},close(){this.open=false;}};
 const element=()=>({innerHTML:'',textContent:'',content:'',hidden:false,value:'',querySelector:selector=>get(selector),replaceWith(){}});
 function get(selector){return nodes[selector]??=element();}
 let failSave=false;
 const context=vm.createContext({crypto:require('node:crypto').webcrypto,structuredClone,document:{documentElement:{dataset:{}},querySelector:get,createElement:()=>({querySelector:()=>({remove(){}})})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(failSave&&k==='clay-training-v1')throw Error('Full');storage.set(k,v);}},navigator:{},window:{scrollTo(){}},confirm:()=>context.accept,accept:true,alert:message=>alerts.push(message),setInterval(){},setTimeout(){},Option:function(value){this.value=value;},FormData:class{constructor(){return Object.entries(context.formData);}}});
 vm.runInContext(source,context);
 return {storage,nodes,alerts,context,failSave(){failSave=true;},run:code=>vm.runInContext(code,context),click:(action,i=0,extra={})=>get('#app').onclick({target:{closest:()=>({dataset:{action,i:String(i),day:String(i),...extra}})}}),result:(actual=6,weight=32)=>{context.formData={actual:String(actual),weight:String(weight),performedAt:new Date().toISOString()};get('#recordForm').onsubmit({preventDefault(){},target:get('#recordForm')});}};
}
function choose(a,i,actual){a.run(`app.onchange({target:{value:${JSON.stringify(String(actual))},dataset:{field:'actualSelection',i:'${i}'}}})`);}
function logBench(a,actual=6){a.click('open');choose(a,1,actual);a.click('count',1);}
const stateOf=a=>JSON.parse(a.run('JSON.stringify(state)'));

test('Reps use a native scrolling 1–30 picker and there is no Log set button',()=>{
 const a=boot();a.click('open');
 const picker=a.nodes['#app'].innerHTML.match(/<select data-field="actualSelection" data-i="1"[^>]*>(.*?)<\/select>/)[1];
 const values=[...picker.matchAll(/<option value="(\d+)"/g)].map(m=>Number(m[1]));
 assert.deepEqual(values,Array.from({length:30},(_,i)=>i+1));
 assert.match(picker,/<option value="6" selected>/);
 assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-action="logSet"/);
});

test('Changing the picker saves a draft without completing or recording a set',()=>{
 const a=boot();a.click('open');choose(a,1,5);
 assert.equal(a.run('state.days[0].exercises[1].actualSelection'),5);
 assert.equal(a.run('state.days[0].exercises[1].completed'),0);
 assert.equal(a.run('state.setRecords.length'),0);
 const b=boot(a.storage);b.click('open');
 assert.equal(b.run('selectedActual(state.days[0].exercises[1])'),5);
 assert.match(b.nodes['#app'].innerHTML,/Log 5 reps and complete one set/);
});

test('Counter records selected reps at the saved weight exactly once without a dialog',()=>{
 let a=boot();logBench(a,5);
 assert.equal(a.run('state.setRecords[0].actual'),5);
 assert.equal(a.run('state.setRecords[0].weight'),32);
 assert.equal(a.run('state.days[0].exercises[1].completed'),1);
 assert.equal(a.run('state.days[0].exercises[1].target'),6);
 assert.equal(a.nodes['#recordDialog'].open,false);
 a=boot(a.storage);
 assert.equal(a.run('state.setRecords[0].actual'),5);
 a.click('open');choose(a,1,4);a.click('count',1);
 assert.equal(a.run('state.setRecords.length'),2);
 assert.equal(a.run('state.setRecords[1].actual'),4);
 assert.equal(a.run('state.setRecords[0].actual'),5);
});

test('Changing next workout weight never rewrites earlier results',()=>{
 const a=boot();logBench(a,5);a.click('reset');
 a.run('state.days[0].exercises[1].weight=34;save()');choose(a,1,6);a.click('count',1);
 assert.equal(a.run('state.setRecords[0].weight'),32);
 assert.equal(a.run('state.setRecords[1].weight'),34);
 a.click('back');a.click('progression');a.run('progressionSelection=resultKey(state.days[0].exercises[1]);render()');
 assert.match(a.nodes['#app'].innerHTML,/First in period: 32 kg \/ hand × 5 reps/);
 assert.match(a.nodes['#app'].innerHTML,/Latest: 34 kg \/ hand × 6 reps/);
});

test('Undo reverses the most recent logged set and preserves its picker value',()=>{
 const a=boot();logBench(a,5);choose(a,1,4);a.click('count',1);a.click('undo',1);
 assert.equal(a.run('state.setRecords.length'),1);
 assert.equal(a.run('state.setRecords[0].actual'),5);
 assert.equal(a.run('state.days[0].exercises[1].completed'),1);
 assert.equal(a.run('state.days[0].exercises[1].actualSelection'),4);
});

test('Existing completed counters do not become fake records or break Undo',()=>{
 const a=boot();const old=stateOf(a);delete old.setRecords;
 old.days[0].exercises[1].completed=1;
 const b=boot([['clay-training-v1',JSON.stringify(old)]]);
 assert.equal(b.run('state.setRecords.length'),0);
 logBench(b,5);b.click('undo',1);
 assert.equal(b.run('state.setRecords.length'),0);
 assert.equal(b.run('state.days[0].exercises[1].completed'),1);
 b.click('undo',1);assert.equal(b.run('state.days[0].exercises[1].completed'),0);
});

test('Reset/Undo Reset keep history, picker settings and logged-set undo links',()=>{
 let a=boot();logBench(a,5);const id=a.run('state.setRecords[0].id');
 a.click('reset');assert.equal(a.run('state.setRecords.length'),1);
 assert.equal(a.run('state.days[0].exercises[1].completed'),0);
 assert.equal(a.run('state.days[0].exercises[1].actualSelection'),5);
 a=boot(a.storage);a.click('open');a.click('undoReset');
 assert.equal(a.run('state.days[0].exercises[1].progressionSetIds[0]'),id);
 a.click('undo',1);assert.equal(a.run('state.setRecords.length'),0);
});

test('A completed exercise cannot record extra sets',()=>{
 const a=boot();logBench(a,5);a.click('count',1);a.click('count',1);a.click('count',1);
 assert.equal(a.run('state.setRecords.length'),3);
 assert.equal(a.run('state.days[0].exercises[1].completed'),3);
 assert.match(a.nodes['#app'].innerHTML,/✓ Done/);
});

test('Picker rejects invalid reps and supports both 1 and 30',()=>{
 const a=boot();a.click('open');
 for(const invalid of [0,31,-1,1.5,'','no'])choose(a,1,invalid);
 assert.equal(a.run('state.days[0].exercises[1].actualSelection'),undefined);
 choose(a,1,1);a.click('count',1);choose(a,1,30);a.click('count',1);
 assert.equal(a.run('state.setRecords[0].actual'),1);
 assert.equal(a.run('state.setRecords[1].actual'),30);
});

test('Failed storage writes roll back recording and count together',()=>{
 const a=boot();a.click('open');choose(a,1,5);a.failSave();a.click('count',1);
 assert.equal(a.run('state.setRecords.length'),0);
 assert.equal(a.run('state.days[0].exercises[1].completed'),0);
 assert.equal(a.run('state.days[0].exercises[1].actualSelection'),5);
});

test('Bodyweight is recorded at zero kg and timed carries retain seconds above 30',()=>{
 const a=boot();a.click('open');choose(a,6,18);a.click('count',6);
 assert.equal(a.run('state.setRecords[0].weight'),0);
 a.click('back');a.click('open',2);
 assert.equal(a.run('selectedActual(state.days[2].exercises[4])'),60);
 choose(a,4,55);a.click('count',4);
 assert.equal(a.run('state.setRecords[1].measure'),'sec');
 assert.equal(a.run('state.setRecords[1].actual'),55);
});

test('Past sets and result edits stay available without changing counters',()=>{
 const a=boot();logBench(a,5);a.click('back');a.click('progression');
 a.run('progressionSelection=resultKey(state.days[0].exercises[1])');a.click('addPastSet');a.result(7,32);
 assert.equal(a.run('state.days[0].exercises[1].completed'),1);
 const id=a.run('state.setRecords[1].id');a.click('editRecord',0,{id});a.result(8,32);
 assert.equal(a.run('state.setRecords[1].actual'),8);
 a.click('deleteRecord',0,{id});assert.equal(a.run('state.setRecords.length'),1);
 assert.equal(a.run('state.days[0].exercises[1].completed'),1);
});

test('Reordering and removal retain exercise identity, picker values and records',()=>{
 const a=boot();logBench(a,5);const id=a.run('state.setRecords[0].exerciseId');
 a.click('up',1);assert.equal(a.run('state.days[0].exercises[0].id'),id);
 assert.equal(a.run('state.days[0].exercises[0].actualSelection'),5);
 a.click('remove',0);assert.equal(a.run('state.setRecords.length'),1);
 assert.equal(a.run('progressionChoices().find(e=>e.exerciseId===state.setRecords[0].exerciseId).archived'),true);
});

test('Changing target reps resets the next picker default without changing history',()=>{
 const a=boot();logBench(a,5);
 a.run('editingId=state.days[0].exercises[1].id');
 a.context.formData={name:'Bench press',equipment:'Dumbbells',sets:'3',target:'8',weight:'32',measure:'reps'};
 a.nodes['#exerciseForm'].onsubmit({preventDefault(){},target:a.nodes['#exerciseForm']});
 assert.equal(a.run('selectedActual(state.days[0].exercises[1])'),8);
 assert.equal(a.run('state.setRecords[0].actual'),5);
});

test('Week, month, year and all-time filters use local calendar boundaries',()=>{
 const a=boot();logBench(a);a.context.now=new Date(2026,10,16,12);
 a.run(`const template=state.setRecords[0];state.setRecords=[0,6,7,29,30,364,365].map((days,i)=>{const d=new Date(now);d.setDate(d.getDate()-days);d.setHours(0,0,0,0);return {...template,id:'test-'+i,performedAt:d.toISOString()};});`);
 for(const [range,count] of [['week',2],['month',4],['year',6],['all',7]])assert.equal(a.run(`progressionRecords(resultKey(state.setRecords[0]),'${range}',now).length`),count);
});

test('Rep charts and archived equipment/measurement series remain independent',()=>{
 const a=boot();logBench(a,5);choose(a,1,7);a.click('count',1);
 a.click('back');a.click('progression');a.run('progressionSelection=resultKey(state.setRecords[0]);render()');
 a.run("app.onchange({target:{id:'progressionMetric',value:'actual'}})");
 assert.match(a.nodes['#app'].innerHTML,/Most reps per set each day/);
 assert.match(a.nodes['#app'].innerHTML,/: 7/);
 a.run("state.setRecords.push({...state.setRecords[0],id:'kb',equipment:'Kettlebell'})");
 assert.equal(a.run("progressionRecords(resultKey(state.setRecords[0]),'all').length"),2);
});

test('Backups validate actual picker values and progression records',()=>{
 const a=boot();logBench(a,5);a.run('const restored=validateBackup(structuredClone(state))');
 assert.equal(a.run('restored.setRecords[0].actual'),5);
 assert.equal(a.run('restored.days[0].exercises[1].actualSelection'),5);
 assert.throws(()=>a.run('const bad=structuredClone(state);bad.days[0].exercises[1].actualSelection=31;validateBackup(bad)'));
 assert.throws(()=>a.run('const bad2=structuredClone(state);bad2.setRecords[0].actual=-1;validateBackup(bad2)'));
 assert.throws(()=>a.run('const bad3=structuredClone(state);bad3.setRecords.push(bad3.setRecords[0]);validateBackup(bad3)'));
});

test('Import restores results and picker choices',async()=>{
 const a=boot();logBench(a,5);const backup=stateOf(a);a.run('state.setRecords=[];save()');
 await a.nodes['#importFile'].onchange({target:{files:[{size:100,text:async()=>JSON.stringify(backup)}],value:'backup'}});
 assert.equal(a.run('state.setRecords[0].actual'),5);
 assert.equal(a.run('state.days[0].exercises[1].actualSelection'),5);
 assert.equal(a.run('state.days[0].exercises[1].completed'),1);
});
