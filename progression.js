// Actual set results are independent of routine targets and checklist resets.
let progressionOpen=false,progressionSelection='',progressionRange='last10';
let recordContext=null,progressionMetric='weight';
const resultKey=e=>JSON.stringify([e.exerciseId??e.id,e.equipment,e.measure]);

function selectedActual(e){
 const max=e.measure==='sec'?3600:30;
 const selected=e.actualSelection??e.target;
 return Number.isInteger(selected)?Math.max(1,Math.min(max,selected)):1;
}
function recordSelectedSet(d,e){
 if(e.completed>=e.sets)return false;
 const actual=selectedActual(e);
 const record={id:crypto.randomUUID(),exerciseId:e.id,name:e.name,dayName:d.name,equipment:e.equipment,measure:e.measure,weight:e.equipment==='Bodyweight'?0:e.weight,actual,performedAt:new Date().toISOString()};
 if(!validSetRecord(record)){alert('Check this exercise’s weight and settings before recording a set.');return false;}
 const previous=structuredClone(state);
 record.sessionId=ensureWorkout(d).id;
 delete d.completionUndo;
 state.setRecords.push(record);
 completeChecklistSet(e,record.id);
 clearResetRecovery(d);
 if(!save()){state=previous;return false;}
 return true;
}
function completeChecklistSet(e,recordId=null){
 if(e.completed>=e.sets)return false;
 e.progressionSetIds=Array.from({length:e.completed},(_,i)=>e.progressionSetIds?.[i]??null);
 e.progressionSetIds.push(recordId);
 e.completed++;
 return true;
}
function undoChecklistSet(e){
 if(!e.completed)return;
 const id=e.progressionSetIds?.[e.completed-1];
 if(id)state.setRecords=state.setRecords.filter(r=>r.id!==id);
 e.completed--;
 if(e.progressionSetIds)e.progressionSetIds.length=Math.min(e.progressionSetIds.length,e.completed);
}
function clearResetRecovery(d){delete d.resetUndo;delete d.resetUndoSetIds;}
function progressionChoices(){
 const choices=new Map();
 // Retain removed exercises and old equipment/measurement combinations.
 for(const r of state.setRecords)choices.set(resultKey(r),{...r,id:r.exerciseId,archived:true});
 for(const d of state.days)for(const e of d.exercises)choices.set(resultKey(e),{...e,exerciseId:e.id,dayName:d.name,archived:false});
 return [...choices.entries()].map(([key,e])=>({key,...e}));
}
function selectedProgressionExercise(){
 const choices=progressionChoices();
 const selected=choices.find(e=>e.key===progressionSelection)||choices[0];
 if(selected)progressionSelection=selected.key;
 return selected;
}
function completedWorkouts(dayId,range=progressionRange){
 const sessions=state.workoutSessions.filter(s=>s.dayId===dayId&&s.completedAt).sort((a,b)=>a.number-b.number);
 return range==='last10'?sessions.slice(-10):sessions;
}
function progressionRecords(selection,range){
 const records=state.setRecords.filter(r=>resultKey(r)===selection);
 if(range==='legacy')return records.filter(r=>!r.sessionId).sort((a,b)=>Date.parse(a.performedAt)-Date.parse(b.performedAt));
 const choice=progressionChoices().find(e=>e.key===selection);
 const dayId=state.days.find(d=>d.exercises.some(e=>e.id===choice?.exerciseId))?.id
  ??state.workoutSessions.find(s=>records.some(r=>r.sessionId===s.id))?.dayId;
 const sessions=completedWorkouts(dayId,range),order=new Map(sessions.map((s,i)=>[s.id,i]));
 return records.filter(r=>order.has(r.sessionId)).sort((a,b)=>order.get(a.sessionId)-order.get(b.sessionId)||Date.parse(a.performedAt)-Date.parse(b.performedAt));
}
function sessionLabel(id){
 const s=state.workoutSessions.find(s=>s.id===id);
 return s?s.dayName+' workout #'+s.number:'Earlier results';
}
const dateLabel=date=>new Date(date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
function resultLabel(r){
 return (r.equipment==='Bodyweight'?'Bodyweight':r.weight+' kg'+(r.equipment==='Dumbbells'?' / hand':''))+' × '+r.actual+' '+(r.measure==='sec'?'seconds':'reps');
}
function localDateKey(date){
 const d=new Date(date);
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function progressionChart(records,e){
 if(!records.length)return '';
 const showActual=e.equipment==='Bodyweight'||progressionMetric==='actual';
 const label=(showActual?(e.measure==='sec'?'Most seconds per set':'Most reps per set'):'Heaviest recorded set · kg'+(e.equipment==='Dumbbells'?' / hand':''))+(progressionRange==='legacy'?' · earlier results by date':' per completed workout');
 const groups=new Map();
 for(const r of records){
  const key=r.sessionId??localDateKey(r.performedAt),value=showActual?r.actual:r.weight;
  const title=r.sessionId?sessionLabel(r.sessionId):dateLabel(r.performedAt);
  groups.set(key,{label:title,value:Math.max(groups.get(key)?.value??0,value)});
 }
 const points=[...groups.values()],max=Math.max(1,...points.map(p=>p.value));
 const xy=points.map((p,i)=>({...p,x:points.length===1?180:48+i/(points.length-1)*272,y:132-p.value/max*108}));
 const description=label+'. '+points.map(p=>p.label+': '+p.value).join('; ');
 return '<figure class="progression-chart"><figcaption>'+escapeHtml(label)+'</figcaption><svg viewBox="0 0 360 180" role="img" aria-label="'+escapeHtml(description)+'"><path class="chart-axis" d="M48 24V132H320"/><text x="38" y="28" text-anchor="end">'+max+'</text><text x="38" y="136" text-anchor="end">0</text><polyline class="chart-line" points="'+xy.map(p=>p.x+','+p.y).join(' ')+'"/>'+xy.map(p=>'<circle class="chart-point" cx="'+p.x+'" cy="'+p.y+'" r="4"><title>'+escapeHtml(p.label+': '+p.value)+'</title></circle>').join('')+'<text x="48" y="160">'+escapeHtml(records[0].sessionId?'#'+state.workoutSessions.find(s=>s.id===records[0].sessionId).number:dateLabel(records[0].performedAt))+'</text><text x="320" y="160" text-anchor="end">'+(points.length>1?escapeHtml(records.at(-1).sessionId?'#'+state.workoutSessions.find(s=>s.id===records.at(-1).sessionId).number:dateLabel(records.at(-1).performedAt)):'')+'</text></svg></figure>';
}
function renderProgression(){
 const choices=progressionChoices(),selected=selectedProgressionExercise();
 const records=selected?progressionRecords(selected.key,progressionRange):[];
 let content='<button data-action="back">← All days</button><h1>Your progression</h1><p class="muted">Compare completed workouts, even when one workout spans several days. Open workouts appear here after you complete them.</p>';
 if(!selected){app.innerHTML=content+'<p>Add an exercise to start recording results.</p>';return;}
 content+='<label>Exercise<select id="progressionExercise">'+choices.map(e=>'<option value="'+escapeHtml(e.key)+'" '+(e.key===selected.key?'selected':'')+'>'+escapeHtml(e.dayName+' · '+e.name+' · '+e.equipment+' · '+(e.measure==='sec'?'seconds':'reps')+(e.archived?' (archived)':''))+'</option>').join('')+'</select></label>';
 content+='<div class="range-tabs" aria-label="Progression workouts">'+[['last10','Last 10 workouts'],['all','All workouts'],['legacy','Earlier results']].map(([key,label])=>'<button data-action="range" data-range="'+key+'" aria-pressed="'+(progressionRange===key)+'">'+label+'</button>').join('')+'</div><p class="muted">'+(progressionRange==='legacy'?'Results without a known workout session. These are preserved separately.':'One chart point per completed workout; calendar days do not split a workout.')+'</p>';
 if(records.length){
  const first=records[0],latest=records.at(-1);
  const best=records.reduce((a,b)=>(selected.equipment==='Bodyweight'?b.actual>a.actual:b.weight>a.weight||(b.weight===a.weight&&b.actual>a.actual))?b:a);
  content+='<div class="card"><p><strong>'+records.length+' sets recorded</strong></p><p>First: '+escapeHtml(resultLabel(first))+'<br>Latest: '+escapeHtml(resultLabel(latest))+'</p><p>'+(selected.equipment==='Bodyweight'?'Best recorded set':'Heaviest recorded set')+': <strong>'+escapeHtml(resultLabel(best))+'</strong></p></div>';
  if(selected.equipment!=='Bodyweight')content+='<label>Chart<select id="progressionMetric"><option value="weight" '+(progressionMetric==='weight'?'selected':'')+'>Weight (kg)</option><option value="actual" '+(progressionMetric==='actual'?'selected':'')+'>'+(selected.measure==='sec'?'Seconds':'Reps')+'</option></select></label>';
  content+=progressionChart(records,selected);
  if(selected.equipment!=='Bodyweight')content+='<p class="muted">Compare reps as well as weight. The chart shows recorded load, not an estimate of strength.</p>';
 }else content+='<div class="card"><p>No recorded sets in these completed workouts.</p><p class="muted">Keep logging sets on your checklist, then tap Complete workout when you are finished. Your open workout stays saved across days. Use Earlier results for older sets without a session.</p></div>';
 content+='<button class="primary wide" data-action="addPastSet">+ Add past set</button>';
 // Group sets by workout identity, regardless of when they were recorded.
 const groups=new Map();
 for(const r of records.slice().reverse()){
  const date=r.sessionId??localDateKey(r.performedAt);
  if(!groups.has(date))groups.set(date,[]);
  groups.get(date).push(r);
 }
 for(const [date,sets] of groups){
  content+='<article class="card"><h2>'+escapeHtml(sets[0].sessionId?sessionLabel(sets[0].sessionId):dateLabel(sets[0].performedAt))+'</h2>'+sets.map(r=>'<div class="record-row"><p><time datetime="'+escapeHtml(r.performedAt)+'">'+escapeHtml(dateLabel(r.performedAt)+' · '+new Date(r.performedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}))+'</time><br><strong>'+escapeHtml(resultLabel(r))+'</strong></p><div class="actions"><button data-action="editRecord" data-id="'+escapeHtml(r.id)+'">Edit result</button><button class="danger" data-action="deleteRecord" data-id="'+escapeHtml(r.id)+'">Delete result</button></div></div>').join('')+'</article>';
 }
 app.innerHTML=content;
}
function datetimeLocal(date=new Date()){
 const d=new Date(date);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);
}
function openRecordDialog(e,dayName,record=null){
 const f=document.querySelector('#recordForm');
 f.reset();
 recordContext={exerciseId:e.exerciseId??e.id,dayName,name:e.name,equipment:e.equipment,measure:e.measure,recordId:record?.id??null,sessionId:record?.sessionId??null};
 const sessionControl=f.elements.sessionId;
 sessionControl.innerHTML='<option value="">Earlier result (no session)</option>'+state.workoutSessions.filter(s=>s.dayName===dayName).map(s=>'<option value="'+escapeHtml(s.id)+'">'+escapeHtml(sessionLabel(s.id)+(s.completedAt?'':' (in progress)'))+'</option>').join('');
 sessionControl.value=record?.sessionId??'';
 f.elements.weight.value=record?.weight??e.weight;
 f.elements.actual.value=record?.actual??e.target??10;
 f.elements.performedAt.value=datetimeLocal(record?.performedAt??new Date());
 f.elements.weight.disabled=e.equipment==='Bodyweight';
 document.querySelector('#recordTitle').textContent=record?'Edit result':'Add past set';
 document.querySelector('#recordExerciseName').textContent=e.name;
 document.querySelector('#actualLabel').textContent=e.measure==='sec'?'Actual seconds':'Actual reps';
 document.querySelector('#recordWeightHint').textContent=e.equipment==='Dumbbells'?'Kilograms per dumbbell.':e.equipment==='Bodyweight'?'Bodyweight uses 0 kg.':'Weight in kilograms.';
 document.querySelector('#recordHint').textContent='This changes your progression records only, not checklist counters or routine targets.';
 document.querySelector('#recordDialog').showModal();
}
function validSetRecord(r){
 return r&&typeof r.id==='string'&&r.id.length>0&&typeof r.exerciseId==='string'&&r.exerciseId.length>0&&typeof r.name==='string'&&r.name.trim().length>0&&typeof r.dayName==='string'&&['Dumbbells','Kettlebell','Bodyweight'].includes(r.equipment)&&['reps','sec'].includes(r.measure)&&Number.isFinite(r.weight)&&r.weight>=0&&r.weight<=10000&&(r.equipment!=='Bodyweight'||r.weight===0)&&Number.isInteger(r.actual)&&r.actual>=0&&r.actual<=3600&&typeof r.performedAt==='string'&&Number.isFinite(Date.parse(r.performedAt))&&(r.sessionId===undefined||(typeof r.sessionId==='string'&&r.sessionId.length>0));
}
function storeSetResult(data){
 if(!recordContext)return false;
 const c=recordContext;
 const actual=String(data.actual??'').trim(),weight=String(data.weight??'').trim();
 const date=new Date(data.performedAt);
 if(!actual||(c.equipment!=='Bodyweight'&&!weight)||!Number.isFinite(date.getTime())||date.getTime()>Date.now()+60000){alert('Enter actual reps or seconds, a weight, and a date that is not in the future.');return false;}
 const record={id:c.recordId??crypto.randomUUID(),exerciseId:c.exerciseId,name:c.name,dayName:c.dayName,equipment:c.equipment,measure:c.measure,weight:c.equipment==='Bodyweight'?0:Number(weight),actual:Number(actual),performedAt:date.toISOString()};
 const sessionId=data.sessionId??c.sessionId;
 if(sessionId){
  if(!state.workoutSessions.some(s=>s.id===sessionId&&s.dayName===c.dayName)){alert('Choose a workout for this routine.');return false;}
  record.sessionId=sessionId;
 }
 if(!validSetRecord(record)){alert('Check the weight and actual reps or seconds.');return false;}
 const previous=structuredClone(state);
 if(c.recordId){
  const index=state.setRecords.findIndex(r=>r.id===c.recordId);
  if(index<0)return false;
  state.setRecords[index]=record;
 }else state.setRecords.push(record);
 if(!save()){state=previous;return false;}
 return true;
}
function deleteSetRecord(id){
 const previous=structuredClone(state);
 state.setRecords=state.setRecords.filter(r=>r.id!==id);
 // Deleting a result alone doesn't undo physical checklist completion.
 for(const d of state.days){
  for(const e of d.exercises)if(e.progressionSetIds)e.progressionSetIds=e.progressionSetIds.map(x=>x===id?null:x);
  if(d.resetUndoSetIds)for(const key of Object.keys(d.resetUndoSetIds))d.resetUndoSetIds[key]=d.resetUndoSetIds[key].map(x=>x===id?null:x);
 }
 if(!save()){state=previous;return false;}return true;
}
function progressionClick(b){
 const a=b.dataset.action;
 if(a==='progression'){progressionOpen=true;day=null;editingDay=false;render();window.scrollTo(0,0);return true;}
 if(a==='range'){progressionRange=b.dataset.range;render();return true;}
 if(a==='addPastSet'){
  const e=selectedProgressionExercise();if(e)openRecordDialog(e,e.dayName);return true;
 }
 if(a==='editRecord'){
  const r=state.setRecords.find(r=>r.id===b.dataset.id);if(r)openRecordDialog(r,r.dayName,r);return true;
 }
 if(a==='deleteRecord'){
  if(confirm('Delete this recorded result? Checklist counts will stay the same.')){deleteSetRecord(b.dataset.id);render();}return true;
 }
 return false;
}
// A routine keeps one open workout until the user explicitly completes it.
function ensureWorkout(d,data=state){
 let session=data.workoutSessions.find(s=>s.id===d.sessionId&&!s.completedAt);
 if(!session){
  session={id:crypto.randomUUID(),dayId:d.id,dayName:d.name,number:1+Math.max(0,...data.workoutSessions.filter(s=>s.dayId===d.id).map(s=>s.number)),startedAt:new Date().toISOString()};
  data.workoutSessions.push(session);d.sessionId=session.id;
 }
 return session;
}
function initialiseWorkouts(data=state,migrating=data.workoutSessions===undefined){
 data.workoutSessions??=[];
 for(const d of data.days){
  d.id??=crypto.randomUUID();
  const links=new Set(d.exercises.flatMap(e=>e.progressionSetIds??[]).concat(Object.values(d.resetUndoSetIds??{}).flat()).filter(Boolean));
  if(d.exercises.some(e=>e.completed>0)||links.size){
   const session=ensureWorkout(d,data);
   // Only current checklist links identify a session reliably. Older sets stay unassigned.
   for(const r of data.setRecords)if(migrating&&!r.sessionId&&links.has(r.id))r.sessionId=session.id;
  }
 }
}
function workoutHasProgress(d){
 return d.exercises.some(e=>e.completed>0)||Boolean(d.sessionId&&state.setRecords.some(r=>r.sessionId===d.sessionId));
}
function completeWorkout(d){
 if(!workoutHasProgress(d))return false;
 const previous=structuredClone(state),session=ensureWorkout(d);
 session.completedAt=new Date().toISOString();
 session.completedSets=d.exercises.reduce((n,e)=>n+e.completed,0);
 session.targetSets=d.exercises.reduce((n,e)=>n+e.sets,0);
 d.completionUndo={sessionId:session.id,counts:Object.fromEntries(d.exercises.map(e=>[e.id,{completed:e.completed,links:e.progressionSetIds?.slice()??[]}]))};
 delete d.sessionId;clearResetRecovery(d);
 for(const e of d.exercises){e.completed=0;e.progressionSetIds=[];}
 if(state.restTimer?.name===d.name)delete state.restTimer;
 if(!save()){state=previous;return false;}return true;
}
function undoWorkoutCompletion(d){
 const recovery=d.completionUndo;
 if(!recovery||d.sessionId)return false;
 const session=state.workoutSessions.find(s=>s.id===recovery.sessionId&&s.completedAt);
 if(!session)return false;
 const previous=structuredClone(state);
 delete session.completedAt;delete session.completedSets;delete session.targetSets;
 d.sessionId=session.id;
 for(const e of d.exercises){const old=recovery.counts[e.id];if(old){e.completed=old.completed;e.progressionSetIds=old.links;}}
 delete d.completionUndo;clearResetRecovery(d);
 if(!save()){state=previous;return false;}return true;
}
function workoutControls(d){
 const session=state.workoutSessions.find(s=>s.id===d.sessionId);
 const next=1+Math.max(0,...state.workoutSessions.filter(s=>s.dayId===d.id).map(s=>s.number));
 return '<section class="card"><p><strong>'+escapeHtml(d.name)+' workout #'+(session?.number??next)+'</strong> · '+(session?'In progress':'Ready to start')+'</p><p class="muted">Continue over as many days as you need. Complete this workout when you are finished to save it to progression and prepare the next one.</p><button class="primary wide" data-action="completeWorkout" '+(workoutHasProgress(d)?'':'disabled')+'>Complete workout</button>'+(d.completionUndo?'<p>Workout saved. Your next workout is ready.</p><button data-action="undoCompletion">Undo completion</button>':'')+'</section>';
}
function validateWorkouts(data){
 const migrating=data.workoutSessions===undefined;
 if(data.workoutSessions===undefined)data.workoutSessions=[];
 if(!Array.isArray(data.workoutSessions))throw new Error('Invalid workouts.');
 const sessions=new Map(),numbers=new Set(),dayIds=new Set();
 for(const d of data.days){
  if(d.id!==undefined&&(typeof d.id!=='string'||!d.id||dayIds.has(d.id)))throw new Error('Invalid routine identity.');
  if(d.id)dayIds.add(d.id);
 }
 for(const s of data.workoutSessions){
  if(!s||typeof s.id!=='string'||!s.id||sessions.has(s.id)||!dayIds.has(s.dayId)||typeof s.dayName!=='string'||!Number.isSafeInteger(s.number)||s.number<1||typeof s.startedAt!=='string'||!Number.isFinite(Date.parse(s.startedAt))||(s.completedAt!==undefined&&(typeof s.completedAt!=='string'||!Number.isFinite(Date.parse(s.completedAt))||Date.parse(s.completedAt)<Date.parse(s.startedAt))))throw new Error('Invalid workout session.');
  const key=JSON.stringify([s.dayId,s.number]);if(numbers.has(key))throw new Error('Duplicate workout number.');numbers.add(key);sessions.set(s.id,s);
 }
 const active=new Set();
 for(const d of data.days){
  if(d.sessionId!==undefined){const s=sessions.get(d.sessionId);if(!s||s.dayId!==d.id||s.completedAt||active.has(s.id))throw new Error('Invalid open workout.');active.add(s.id);}
  delete d.completionUndo;
 }
 for(const s of sessions.values())if(!s.completedAt&&!active.has(s.id))throw new Error('Open workout has no routine.');
 for(const r of data.setRecords)if(r.sessionId!==undefined){const s=sessions.get(r.sessionId);if(!s||s.dayName!==r.dayName)throw new Error('Invalid result workout.');}
 initialiseWorkouts(data,migrating);
}

function setupProgression(){
 if(state.setRecords===undefined)state.setRecords=[];
 initialiseWorkouts();
 save();
 document.querySelector('#cancelRecord').onclick=()=>document.querySelector('#recordDialog').close();
 document.querySelector('#recordForm').onsubmit=event=>{
  event.preventDefault();
  if(storeSetResult(Object.fromEntries(new FormData(event.target)))){document.querySelector('#recordDialog').close();recordContext=null;render();}
 };
}
