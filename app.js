const key='clay-training-v1';
const exercise=(name,sets,target,weight,equipment='Dumbbells',measure='reps',note='')=>({id:crypto.randomUUID(),name,sets,target,weight,equipment,measure,note});
const defaults={days:[
{name:'Push',exercises:[exercise('Kettlebell halos',2,8,14,'Kettlebell'),exercise('Bench press',3,6,32),exercise('Incline bench press',3,6,29),exercise('Standing shoulder press',3,10,20),exercise('Lateral raises',3,10,11),exercise('Skull crushers',2,20,11),exercise('Press-ups',2,20,0,'Bodyweight')]},
{name:'Pull',exercises:[exercise('Swings',3,15,24),exercise('One-arm row',4,10,29),exercise('Chest-supported row',3,10,22),exercise('Romanian deadlift',4,10,25),exercise('Rear delt fly',3,10,11),exercise('Supinated curl',6,10,13)]},
{name:'Legs & core',exercises:[exercise('Romanian deadlift',4,10,25),exercise('Glute bridge / hip thrust',3,10,25),exercise('Box squat to bench',3,10,15),exercise('Calf raises',4,15,18),exercise('Farmer’s carries',4,60,15,'Dumbbells','sec'),exercise('Weighted sit-ups',3,10,14),exercise('Goblet squat',3,10,24,'Kettlebell')]}],history:[],active:null};

// Retain the original storage key and legacy records for backups.
const original=localStorage.getItem(key);
let state;
try { state=original ? JSON.parse(original) : structuredClone(defaults); }
catch { throw new Error('Saved workout data could not be read. It has not been overwritten.'); }
function save(){
 try { localStorage.setItem(key,JSON.stringify(state)); return true; }
 catch { alert('Could not save. Export a backup before closing this page.'); return false; }
}
if(state.schemaVersion!==2){
 // Do not migrate unless the original can be backed up first.
 if(original) localStorage.setItem(key+'-before-checklist',original);
 for(const d of state.days){
  for(const e of d.exercises){
   const legacy=state.active?.exercises?.find(x=>x.id===e.id);
   e.completed=Number.isInteger(e.completed) ? Math.max(0,e.completed) : (legacy?.log?.filter(x=>x.done).length || 0);
  }
 }
 state.schemaVersion=2;
 save();
}
// Apply confirmed routine corrections once; preserve progress and legacy records.
if(!state.confirmedRoutineSettings){
 const corrections=[
  ['Push','Skull crushers',2,20,11,'Dumbbells','Check target — board appears to say 26 reps.'],
  ['Pull','Swings',3,15,24,'Dumbbells','Equipment assumed from “29 DB” on board.'],
  ['Legs & core','Goblet squat',3,10,24,'Kettlebell','Assumed 3 × 10 — no sets or reps on board.']
 ];
 for(const [dayName,name,sets,target,weight,equipment,note] of corrections){
  const e=state.days.find(d=>d.name.toLowerCase()===dayName.toLowerCase())?.exercises.find(e=>e.name===name);
  if(e){
   Object.assign(e,{sets,target,weight,equipment,measure:'reps'});
   if(e.note===note)e.note='';
  }
 }
 state.confirmedRoutineSettings=true;
 save();
}
function applyTheme(){
 const dark=state.theme==='dark';
 document.documentElement.dataset.theme=dark?'dark':'light';
 document.querySelector('meta[name="theme-color"]').content=dark?'#111b16':'#17271f';
}
applyTheme();
let day=null,editingId=null,editingDay=false;
const app=document.querySelector('#app');
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const weightLabel=e=>e.equipment==='Bodyweight'?'0 kg · Bodyweight':e.weight+' kg'+(e.equipment==='Dumbbells'?' / hand':'');
function options(max,step,current){
 const values=Array.from({length:Math.round(max/step)+1},(_,i)=>i*step);
 if(!values.includes(Number(current)))values.push(Number(current));
 return values.sort((a,b)=>a-b).map(n=>'<option value="'+n+'" '+(n===Number(current)?'selected':'')+'>'+n+'</option>').join('');
}
function dayProgress(d){
 const total=d.exercises.reduce((n,e)=>n+e.sets,0);
 const completed=d.exercises.reduce((n,e)=>n+Math.min(e.sets,e.completed),0);
 return '<section class="day-progress" aria-label="Day progress"><p>'+completed+' of '+total+' sets completed</p><progress aria-label="Completed sets" max="'+(total||1)+'" value="'+completed+'">'+completed+' of '+total+'</progress></section>';
}
function dayRestControls(d){
 const duration=d.restSeconds??180;
 const values=Array.from({length:40},(_,i)=>(i+1)*15);
 if(!values.includes(duration))values.push(duration);
 return '<section class="day-rest" aria-label="Rest timer controls"><button class="primary" data-action="startRest">Start rest · '+formatTime(duration)+'</button><label>Rest duration<select id="dayRestDuration">'+values.sort((a,b)=>a-b).map(n=>'<option value="'+n+'" '+(n===duration?'selected':'')+'>'+formatTime(n)+'</option>').join('')+'</select></label></section>';
}
function exerciseCard(e,i){
 const remaining=Math.max(0,e.sets-e.completed);
 return '<article class="card"><h2>'+escapeHtml(e.name)+'</h2><p>'+escapeHtml(weightLabel(e))+' · '+e.sets+' sets × '+e.target+' '+(e.measure==='sec'?'seconds':'reps')+'</p>'+
 '<label>'+(e.measure==='sec'?'Seconds completed':'Reps completed')+'<select data-field="actualSelection" data-i="'+i+'" aria-label="'+escapeHtml(e.name)+' '+(e.measure==='sec'?'seconds':'reps')+' completed" '+(!remaining?'disabled':'')+'>'+options(e.measure==='sec'?3600:30,1,selectedActual(e)).replace('<option value="0" >0</option>','')+'</select></label>'+
 (e.note?'<p class="notice">'+escapeHtml(e.note)+'</p>':'')+
 '<button class="counter '+(!remaining?'complete':'')+'" data-action="count" data-i="'+i+'" '+(!remaining?'disabled':'')+' aria-label="'+escapeHtml(e.name)+': '+(remaining?remaining+' sets remaining. Log '+selectedActual(e)+' '+(e.measure==='sec'?'seconds':'reps')+' and complete one set':'Done')+'"><strong>'+(remaining||'✓ Done')+'</strong><span>'+(remaining?(remaining===1?'set remaining':'sets remaining'):'All sets complete')+'</span></button>'+
 '<div class="actions"><button data-action="undo" data-i="'+i+'" '+(!e.completed?'disabled':'')+'>Undo last set</button>'+(editingDay?'<button data-action="edit" data-i="'+i+'">Edit exercise</button><button class="danger" data-action="remove" data-i="'+i+'">Remove</button><button data-action="up" data-i="'+i+'" '+(!i?'disabled':'')+' aria-label="Move '+escapeHtml(e.name)+' up">↑ Move up</button><button data-action="down" data-i="'+i+'" '+(i===state.days[day].exercises.length-1?'disabled':'')+' aria-label="Move '+escapeHtml(e.name)+' down">↓ Move down</button>':'')+'</div></article>';
}
function render(){
 if(progressionOpen){renderProgression();return;}
 if(day===null){
  app.innerHTML='<button class="theme-toggle" data-action="theme" aria-pressed="'+(state.theme==='dark')+'">Dark mode: '+(state.theme==='dark'?'On':'Off')+'</button><div class="hero"><span class="badge">YOUR ROUTINE</span><h1>Make every set count.</h1><p class="muted">Choose a day. Your checklist is saved automatically.</p></div><button class="wide" data-action="progression">View progression →</button>'+state.days.map((d,i)=>'<button class="card day day-button wide" data-action="open" data-day="'+i+'"><span class="number">0'+(i+1)+'</span><span class="grow"><strong>'+escapeHtml(d.name==='Legs & core'?'Legs & Core':d.name)+'</strong><small>'+d.exercises.length+' exercises · '+d.exercises.reduce((n,e)=>n+Math.max(0,e.sets-e.completed),0)+' sets remaining</small></span><span aria-hidden="true">→</span></button>').join('');
  return;
 }
 const d=state.days[day];
 app.innerHTML='<div class="day-toolbar"><button data-action="back">← All days</button><button data-action="editDay" aria-pressed="'+editingDay+'">'+(editingDay?'Done Editing':'Edit Day')+'</button></div><h1>'+escapeHtml(d.name==='Legs & core'?'Legs & Core':d.name)+'</h1><p class="muted">Choose your completed reps or seconds, then tap the big number to record each set. Your workout stays open across days until you complete it.</p>'+dayProgress(d)+workoutControls(d)+dayRestControls(d)+(d.resetUndo?'<div class="notice">Day reset. <button data-action="undoReset">Undo Reset Day</button></div>':'')+d.exercises.map(exerciseCard).join('')+(!d.exercises.length?'<p>No exercises yet. '+(editingDay?'Add one below.':'Tap Edit Day to add one.')+'</p>':'')+(editingDay?'<button class="primary wide" data-action="add">+ Add exercise</button>':'')+'<button class="wide danger reset" data-action="reset">Reset Day</button>';
}
app.onclick=event=>{
 const b=event.target.closest('button');if(!b||b.disabled)return;
 const a=b.dataset.action;
 if(progressionClick(b))return;
 if(a==='theme'){state.theme=state.theme==='dark'?'light':'dark';applyTheme();save();render();return;}
 if(a==='open'){editingDay=false;day=Number(b.dataset.day);render();window.scrollTo(0,0);return;}
 if(a==='back'){progressionOpen=false;editingDay=false;day=null;render();window.scrollTo(0,0);return;}
 if(a==='editDay'){editingDay=!editingDay;render();return;}
 const d=state.days[day],e=d.exercises[Number(b.dataset.i)];
 if(a==='startRest'){state.restTimer={endsAt:Date.now()+(d.restSeconds??180)*1000,name:d.name};save();renderTimer();}
 if(a==='completeWorkout'){
  const incomplete=d.exercises.some(x=>x.completed<x.sets);
  if(workoutHasProgress(d)&&confirm('Complete '+d.name+' workout'+(incomplete?' with some sets unfinished':'')+'? This saves the workout to progression and clears its counters for next time.')){completeWorkout(d);renderTimer();}
 }
 if(a==='undoCompletion'){undoWorkoutCompletion(d);renderTimer();}
 if(a==='count'){recordSelectedSet(d,e);}
 if(a==='undo'){clearResetRecovery(d);undoChecklistSet(e);save();}
 if(a==='reset'&&confirm('Reset completed sets for '+d.name+'? This only resets counters; it does not complete the workout. Recorded results and exercise settings stay saved.')){delete d.completionUndo;d.resetUndo=Object.fromEntries(d.exercises.map(x=>[x.id,x.completed]));d.resetUndoSetIds=Object.fromEntries(d.exercises.map(x=>[x.id,x.progressionSetIds?.slice()??[]]));d.exercises.forEach(x=>{x.completed=0;x.progressionSetIds=[];});delete state.restTimer;save();renderTimer();}
 if(a==='undoReset'&&d.resetUndo){d.exercises.forEach(x=>{x.completed=d.resetUndo[x.id]??x.completed;x.progressionSetIds=d.resetUndoSetIds?.[x.id]??[];});clearResetRecovery(d);save();}
 if(a==='up'||a==='down'){const i=Number(b.dataset.i),j=i+(a==='up'?-1:1);if(j>=0&&j<d.exercises.length){[d.exercises[i],d.exercises[j]]=[d.exercises[j],d.exercises[i]];save();}}
 if(a==='remove'&&confirm('Remove '+e.name+' from this day?')){d.exercises.splice(Number(b.dataset.i),1);save();}
 if(a==='add'||a==='edit'){
  editingId=a==='edit'?e.id:null;
  const f=document.querySelector('#exerciseForm');f.reset();
  if(editingId)for(const field of ['name','equipment','sets','target','measure','weight']){
   const control=f.elements[field];
   if(control.tagName==='SELECT'&&!Array.from(control.options).some(o=>o.value===String(e[field]??0)))control.add(new Option(e[field]??0,e[field]??0));
   control.value=e[field]??0;
  }
  document.querySelector('#formTitle').textContent=editingId?'Edit exercise':'Add exercise';
  document.querySelector('#editor').showModal();return;
 }
 render();
};
app.onchange=event=>{
 if(event.target.dataset?.field==='actualSelection'&&day!==null){
  const e=state.days[day].exercises[Number(event.target.dataset.i)];
  const actual=Number(event.target.value);
  if(!e||!Number.isInteger(actual)||actual<1||actual>(e.measure==='sec'?3600:30))return;
  const previous=structuredClone(state);e.actualSelection=actual;
  if(!save())state=previous;
  render();return;
 }

 if(event.target.id==='progressionMetric'){progressionMetric=event.target.value;render();return;}
 if(event.target.id==='progressionExercise'){progressionSelection=event.target.value;render();return;}
 if(event.target.id!=='dayRestDuration'||day===null)return;
 const seconds=Number(event.target.value);
 if(!Number.isInteger(seconds)||seconds<15||seconds>1800)return;
 state.days[day].restSeconds=seconds;save();render();
};
document.querySelector('#cancelEdit').onclick=()=>document.querySelector('#editor').close();
document.querySelector('#exerciseForm').onsubmit=event=>{
 event.preventDefault();const f=event.target;const data=Object.fromEntries(new FormData(f));
 if(!data.name.trim())return;
 const list=state.days[day].exercises,previous=list.find(x=>x.id===editingId);
 const e={...previous,id:editingId||crypto.randomUUID(),name:data.name.trim(),equipment:data.equipment,sets:Number(data.sets),target:Number(data.target),weight:data.equipment==='Bodyweight'?0:Number(data.weight),measure:data.measure,note:previous?.note||'',completed:previous?.completed||0};
 if(previous&&(previous.target!==e.target||previous.measure!==e.measure))delete e.actualSelection;
 if(editingId)list[list.findIndex(x=>x.id===editingId)]=e;else list.push(e);
 save();document.querySelector('#editor').close();render();
};
document.querySelector('#export').onclick=()=>{
 const backup={...state};
 const beforeImport=localStorage.getItem(key+'-before-import');
 if(beforeImport)backup.beforeImport=JSON.parse(beforeImport);
 const legacy=state.beforeChecklist?JSON.stringify(state.beforeChecklist):localStorage.getItem(key+'-before-checklist');
 if(legacy)backup.beforeChecklist=JSON.parse(legacy);
 const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='clay-workouts.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function formatTime(seconds){return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
function renderTimer(){
 const panel=document.querySelector('#restTimer');
 const timer=state.restTimer;
 if(!timer){panel.hidden=true;return;}
 panel.hidden=false;
 const remaining=Math.max(0,Math.ceil((timer.endsAt-Date.now())/1000));
 if(!panel.querySelector('#restTime'))panel.innerHTML='<strong id="restTime" role="timer"></strong><span id="restName"></span><button id="stopRest"></button>';
 panel.querySelector('#restTime').textContent=remaining?'Rest · '+formatTime(remaining):'Rest complete';
 panel.querySelector('#restName').textContent=timer.name;
 document.querySelector('#stopRest').textContent=remaining?'Skip rest':'Dismiss';
 document.querySelector('#stopRest').onclick=()=>{delete state.restTimer;save();renderTimer();};
}
setInterval(renderTimer,1000);
renderTimer();
// Validate before touching storage. Legacy session backups are supported too.
function validateBackup(input){
 if(!input||typeof input!=='object'||!Array.isArray(input.days)||input.days.length!==3)throw new Error('Expected a workout backup with three days.');
 if(input.schemaVersion!==undefined&&input.schemaVersion!==2)throw new Error('Unsupported backup version.');
 const candidate=structuredClone(input);
 const ids=new Set();
 if(candidate.setRecords===undefined)candidate.setRecords=[];
 if(!Array.isArray(candidate.setRecords))throw new Error('Invalid progression records.');
 const recordIds=new Set();
 for(const r of candidate.setRecords){if(!validSetRecord(r)||recordIds.has(r.id))throw new Error('Invalid progression record.');recordIds.add(r.id);}
 for(const d of candidate.days){
  if(!d||typeof d.name!=='string'||!Array.isArray(d.exercises))throw new Error('Invalid workout day.');
  if(d.restSeconds!==undefined&&(!Number.isInteger(d.restSeconds)||d.restSeconds<15||d.restSeconds>1800))throw new Error('Invalid day rest duration.');
  for(const e of d.exercises){
   if(!e||typeof e.id!=='string'||!e.id||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim()||!['Dumbbells','Kettlebell','Bodyweight'].includes(e.equipment)||!['reps','sec'].includes(e.measure)||!Number.isInteger(e.sets)||e.sets<1||e.sets>30||!Number.isInteger(e.target)||e.target<1||e.target>3600||!Number.isFinite(e.weight)||e.weight<0||e.weight>10000)throw new Error('Invalid exercise settings.');
   ids.add(e.id);
   if(e.completed===undefined){
    const logs=candidate.active?.exercises?.find(x=>x.id===e.id)?.log;
    e.completed=Array.isArray(logs)?logs.filter(x=>x?.done).length:0;
   }
   if(!Number.isInteger(e.completed)||e.completed<0||e.completed>100000|| (e.restSeconds!==undefined&&(!Number.isInteger(e.restSeconds)||e.restSeconds<0||e.restSeconds>1800)))throw new Error('Invalid progress or rest duration.');
   if(e.actualSelection!==undefined&&(!Number.isInteger(e.actualSelection)||e.actualSelection<1||e.actualSelection>(e.measure==='sec'?3600:30)))throw new Error('Invalid selected reps or seconds.');
   if(e.progressionSetIds!==undefined&&(!Array.isArray(e.progressionSetIds)||e.progressionSetIds.length>100000||e.progressionSetIds.some(id=>id!==null&&typeof id!=='string')))throw new Error('Invalid set links.');
   if(e.note!==undefined&&typeof e.note!=='string')throw new Error('Invalid exercise note.');
  }
  delete d.resetUndo;delete d.resetUndoSetIds;
 }
 validateWorkouts(candidate);
 delete candidate.restTimer;
 candidate.schemaVersion=2;
 candidate.confirmedRoutineSettings=true;
 return candidate;
}
document.querySelector('#import').onclick=()=>document.querySelector('#importFile').click();
document.querySelector('#importFile').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 try{
  if(file.size>10*1024*1024)throw new Error('Backup is too large (maximum 10 MB).');
  const candidate=validateBackup(JSON.parse(await file.text()));
  if(!confirm('Replace your current routines, settings and progress with this backup? A copy of the current data will be saved on this device.'))return;
  // If either write fails, leave the running app and current primary data intact.
  localStorage.setItem(key+'-before-import',JSON.stringify(state));
  localStorage.setItem(key,JSON.stringify(candidate));
  state=candidate;day=null;editingDay=false;progressionOpen=false;progressionSelection='';applyTheme();render();renderTimer();
  alert('Backup restored. Your previous data is saved on this device.');
 }catch(error){alert('Could not import backup: '+error.message);}
 finally{event.target.value='';}
};
for(const [name,max,step,value] of [['weight',200,.5,0],['sets',30,1,3],['target',3600,1,10]]){
 const old=document.querySelector('#exerciseForm [name="'+name+'"]');
 const select=document.createElement('select');select.name=name;
 select.innerHTML=options(max,step,value);
 if(name!=='weight')select.querySelector('[value="0"]').remove();
 old.replaceWith(select);
}
setupProgression();
render();
// Leave data in localStorage; worker updates touch only cached application files.
if('serviceWorker' in navigator){
 navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(registration=>{
  document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='visible')registration.update().catch(()=>{});
  });
 }).catch(error=>console.warn('Offline support could not be enabled:',error));
}
// Best effort only: Android Chrome decides whether storage can be persistent.
if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});

