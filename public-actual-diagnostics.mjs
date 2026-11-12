// Observation only: no I/O except the supplied bounded synchronous sink, no authority.
export const actualDiagnosticPhases=Object.freeze(['BOOTSTRAP','OWNER_SESSION','ADAPTER_SESSION',
 'VERIFY_READER','DOWNLOAD','VERIFY_PACK','INSTALL','READ','COLLECT','VALIDATE','VERIFY_AFTER',
 'FINAL_RECEIPT','FAILURE_RECEIPT']);
const cases=['d-cancel','d-complete-coverage','d-corrupt','d-delete','d-dense-remove','d-dense-upsert',
 'd-dependent-edge','d-empty','d-late-exit','d-overlay-retention','d-partial','d-preparation-input',
 'd-reopen','d-retained-sites','d-rollback','d-shared-owners','d-slow-sink','d-slow-stdin',
 'd-source-race','d-sql-preflight','d-token-race','d-zero-fact'];
export function createActualDiagnostics({emit=()=>{},now=()=>performance.now(),enabled=true}={}) {
 const start=now(),stack=[],totals={};let worker=0,lost=0,events=0,beats=0;
 const counts={requested:0,started:0,completed:0,failed:0,rejected:0};
 const checks={OWNER:{calls:0,totalMs:0,active:null},INPUT:{calls:0,totalMs:0,active:null}};
 const number=x=>{if(!Number.isFinite(x)||x<0||x>999999999){lost++;return 0;}return Math.floor(x);};
 const snapshot=()=>({elapsedMs:number(now()-start),phase:stack.at(-1)?.id??0,worker,
  phaseElapsedMs:stack.length?number(now()-stack.at(-1).start):0,workers:{...counts},
  owner:{...checks.OWNER,activeMs:checks.OWNER.active===null?0:number(now()-checks.OWNER.active)},
  input:{...checks.INPUT,activeMs:checks.INPUT.active===null?0:number(now()-checks.INPUT.active)},
  phaseTotals:structuredClone(totals),lost});
 const publish=event=>{
  if(!enabled)return;
  if(event===7?beats++>=160:events++>=128){lost++;return;}
  const s=snapshot(),v=[event,s.phase,s.worker,s.elapsedMs,s.phaseElapsedMs,
   ...Object.values(s.workers),s.owner.calls,s.owner.totalMs,s.owner.activeMs,
   s.input.calls,s.input.totalMs,s.input.activeMs,lost].map(number);
  try{emit('ACTUAL22_DIAG:'+v.join(':'));}catch{lost++;}
 };
 const phase=async(label,operation)=>{
  const id=typeof label==='string'?actualDiagnosticPhases.indexOf(label)+1:0;
  if(!id)lost++;
  const frame={id,start:now()};stack.push(frame);publish(1);
  try{const result=await operation();publish(2);return result;}
  catch(error){publish(3);throw error;}
  finally{const elapsed=number(now()-frame.start);totals[id]??={calls:0,totalMs:0};totals[id].calls++;totals[id].totalMs+=elapsed;stack.pop();}
 };
 const timed=async(kind,operation)=>{
  const metric=checks[kind];metric.calls++;const start=now(),previous=metric.active;metric.active=start;
  try{return await operation();}finally{metric.totalMs+=number(now()-start);metric.active=previous;}
 };
 const workerCall=async(base,label,operation)=>{
  counts.requested++;const prior=worker;worker=typeof label==='string'?cases.indexOf(label.slice(8))+1:0;
  if(typeof label!=='string'||!label.startsWith('MEASURE:'))worker=0;
  if(!worker)lost++;
  let started=false;
  try{
   const value=await base.worker(label,async()=>{started=true;counts.started++;publish(4);return operation();});
   if(started)counts.completed++;else{counts.rejected++;lost++;}publish(5);return value;
  }catch(error){if(started)counts.failed++;else counts.rejected++;publish(6);throw error;}
  finally{worker=prior;}
 };
 return Object.freeze({phase,timed,snapshot,enable:()=>{enabled=true;},heartbeat:()=>publish(7),finish:ok=>publish(ok?8:9),
  wrapControl:base=>Object.freeze({...base,
   stage:(label,operation)=>phase(label,()=>base.stage(label,operation)),
   worker:(label,operation)=>workerCall(base,label,operation),
  }),
 });
}
// Logging is opt-in at the fixed launcher, never an admission flag.
export const actualDiagnostics=createActualDiagnostics({emit:line=>console.log(line),enabled:false});
