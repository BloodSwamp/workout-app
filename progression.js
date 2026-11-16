// Actual set results are independent of routine targets and checklist resets.
let progressionOpen=false,progressionSelection='',progressionRange='month';
let recordContext=null,progressionMetric='weight';
const progressionRanges={week:7,month:30,year:365,all:null};
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
function periodStart(range,now=new Date()){
 if(progressionRanges[range]===null)return -Infinity;
 const start=new Date(now);start.setHours(0,0,0,0);
 start.setDate(start.getDate()-(progressionRanges[range]-1));
 return start.getTime();
}
function progressionRecords(selection,range,now=new Date()){
 const end=now.getTime(),start=periodStart(range,now);
 return state.setRecords.filter(r=>resultKey(r)===selection&&Date.parse(r.performedAt)>=start&&Date.parse(r.performedAt)<=end)
  .sort((a,b)=>Date.parse(a.performedAt)-Date.parse(b.performedAt));
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
 const label=showActual?(e.measure==='sec'?'Most seconds per set each day':'Most reps per set each day'):'Heaviest recorded set each day · kg'+(e.equipment==='Dumbbells'?' / hand':'');
 const daily=new Map();
 for(const r of records){
  const date=localDateKey(r.performedAt),value=showActual?r.actual:r.weight;
  daily.set(date,Math.max(daily.get(date)??0,value));
 }
 const points=[...daily].map(([date,value])=>({date,value,time:new Date(date+'T12:00:00').getTime()}));
 const minTime=points[0].time,maxTime=points.at(-1).time;
 const max=Math.max(1,...points.map(p=>p.value));
 const xy=points.map(p=>({...p,x:points.length===1?180:48+(p.time-minTime)/(maxTime-minTime)*272,y:132-p.value/max*108}));
 const description=label+'. '+points.map(p=>dateLabel(p.date+'T12:00:00')+': '+p.value).join('; ');
 return '<figure class="progression-chart"><figcaption>'+label+'</figcaption><svg viewBox="0 0 360 180" role="img" aria-label="'+escapeHtml(description)+'"><path class="chart-axis" d="M48 24V132H320"/><text x="38" y="28" text-anchor="end">'+max+'</text><text x="38" y="136" text-anchor="end">0</text><polyline class="chart-line" points="'+xy.map(p=>p.x+','+p.y).join(' ')+'"/>'+xy.map(p=>'<circle class="chart-point" cx="'+p.x+'" cy="'+p.y+'" r="4"><title>'+escapeHtml(dateLabel(p.date+'T12:00:00')+': '+p.value)+'</title></circle>').join('')+'<text x="48" y="160">'+escapeHtml(new Date(minTime).toLocaleDateString('en-GB',{day:'numeric',month:'short'}))+'</text><text x="320" y="160" text-anchor="end">'+(points.length>1?escapeHtml(new Date(maxTime).toLocaleDateString('en-GB',{day:'numeric',month:'short'})):'')+'</text></svg></figure>';
}
function renderProgression(){
 const choices=progressionChoices(),selected=selectedProgressionExercise();
 const records=selected?progressionRecords(selected.key,progressionRange):[];
 let content='<button data-action="back">← All days</button><h1>Your progression</h1><p class="muted">Actual weights and reps you recorded. Routine targets can change without changing these results.</p>';
 if(!selected){app.innerHTML=content+'<p>Add an exercise to start recording results.</p>';return;}
 content+='<label>Exercise<select id="progressionExercise">'+choices.map(e=>'<option value="'+escapeHtml(e.key)+'" '+(e.key===selected.key?'selected':'')+'>'+escapeHtml(e.dayName+' · '+e.name+' · '+e.equipment+' · '+(e.measure==='sec'?'seconds':'reps')+(e.archived?' (archived)':''))+'</option>').join('')+'</select></label>';
 content+='<div class="range-tabs" aria-label="Progression time period">'+[['week','Week'],['month','Month'],['year','Year'],['all','All time']].map(([key,label])=>'<button data-action="range" data-range="'+key+'" aria-pressed="'+(progressionRange===key)+'">'+label+'</button>').join('')+'</div><p class="muted">'+(progressionRange==='all'?'All recorded dates':'Last '+progressionRanges[progressionRange]+' days, including today')+'</p>';
 if(records.length){
  const first=records[0],latest=records.at(-1);
  const best=records.reduce((a,b)=>(selected.equipment==='Bodyweight'?b.actual>a.actual:b.weight>a.weight||(b.weight===a.weight&&b.actual>a.actual))?b:a);
  content+='<div class="card"><p><strong>'+records.length+' sets recorded</strong></p><p>First in period: '+escapeHtml(resultLabel(first))+'<br>Latest: '+escapeHtml(resultLabel(latest))+'</p><p>'+(selected.equipment==='Bodyweight'?'Best recorded set':'Heaviest recorded set')+': <strong>'+escapeHtml(resultLabel(best))+'</strong></p></div>';
  if(selected.equipment!=='Bodyweight')content+='<label>Chart<select id="progressionMetric"><option value="weight" '+(progressionMetric==='weight'?'selected':'')+'>Weight (kg)</option><option value="actual" '+(progressionMetric==='actual'?'selected':'')+'>'+(selected.measure==='sec'?'Seconds':'Reps')+'</option></select></label>';
  content+=progressionChart(records,selected);
  if(selected.equipment!=='Bodyweight')content+='<p class="muted">Compare reps as well as weight. The chart shows recorded load, not an estimate of strength.</p>';
 }else content+='<div class="card"><p>No recorded sets in this period.</p><p class="muted">Choose your completed reps on the checklist and tap its counter, or add a past set below. Earlier checklist taps have no actual reps recorded.</p></div>';
 content+='<button class="primary wide" data-action="addPastSet">+ Add past set</button>';
 // Group actual sets by local calendar day; never collapse differing rep counts.
 const groups=new Map();
 for(const r of records.slice().reverse()){
  const date=localDateKey(r.performedAt);
  if(!groups.has(date))groups.set(date,[]);
  groups.get(date).push(r);
 }
 for(const [date,sets] of groups){
  content+='<article class="card"><h2>'+escapeHtml(dateLabel(date+'T12:00:00'))+'</h2>'+sets.map(r=>'<div class="record-row"><p><time datetime="'+escapeHtml(r.performedAt)+'">'+escapeHtml(new Date(r.performedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}))+'</time><br><strong>'+escapeHtml(resultLabel(r))+'</strong></p><div class="actions"><button data-action="editRecord" data-id="'+escapeHtml(r.id)+'">Edit result</button><button class="danger" data-action="deleteRecord" data-id="'+escapeHtml(r.id)+'">Delete result</button></div></div>').join('')+'</article>';
 }
 app.innerHTML=content;
}
function datetimeLocal(date=new Date()){
 const d=new Date(date);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);
}
function openRecordDialog(e,dayName,record=null){
 const f=document.querySelector('#recordForm');
 f.reset();
 recordContext={exerciseId:e.exerciseId??e.id,dayName,name:e.name,equipment:e.equipment,measure:e.measure,recordId:record?.id??null};
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
 return r&&typeof r.id==='string'&&r.id.length>0&&typeof r.exerciseId==='string'&&r.exerciseId.length>0&&typeof r.name==='string'&&r.name.trim().length>0&&typeof r.dayName==='string'&&['Dumbbells','Kettlebell','Bodyweight'].includes(r.equipment)&&['reps','sec'].includes(r.measure)&&Number.isFinite(r.weight)&&r.weight>=0&&r.weight<=10000&&(r.equipment!=='Bodyweight'||r.weight===0)&&Number.isInteger(r.actual)&&r.actual>=0&&r.actual<=3600&&typeof r.performedAt==='string'&&Number.isFinite(Date.parse(r.performedAt));
}
function storeSetResult(data){
 if(!recordContext)return false;
 const c=recordContext;
 const actual=String(data.actual??'').trim(),weight=String(data.weight??'').trim();
 const date=new Date(data.performedAt);
 if(!actual||(c.equipment!=='Bodyweight'&&!weight)||!Number.isFinite(date.getTime())||date.getTime()>Date.now()+60000){alert('Enter actual reps or seconds, a weight, and a date that is not in the future.');return false;}
 const record={id:c.recordId??crypto.randomUUID(),exerciseId:c.exerciseId,name:c.name,dayName:c.dayName,equipment:c.equipment,measure:c.measure,weight:c.equipment==='Bodyweight'?0:Number(weight),actual:Number(actual),performedAt:date.toISOString()};
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
function setupProgression(){
 if(state.setRecords===undefined){state.setRecords=[];save();}
 document.querySelector('#cancelRecord').onclick=()=>document.querySelector('#recordDialog').close();
 document.querySelector('#recordForm').onsubmit=event=>{
  event.preventDefault();
  if(storeSetResult(Object.fromEntries(new FormData(event.target)))){document.querySelector('#recordDialog').close();recordContext=null;render();}
 };
}
