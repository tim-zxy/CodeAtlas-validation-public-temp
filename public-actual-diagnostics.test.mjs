import assert from 'node:assert/strict';
import test from 'node:test';
import {createActualDiagnostics} from './public-actual-diagnostics.mjs';
import {createOwnedActualControl} from './public-owned-actual.mjs';
const format=/^ACTUAL22_DIAG:(?:[0-9]{1,9}:){16}[0-9]{1,9}$/;
test('fixed numeric telemetry separates workers and owner/input timings without payloads',async()=>{
 let time=0;const lines=[],d=createActualDiagnostics({now:()=>time,emit:x=>lines.push(x)});
 const base={checkpoint:()=>{},fail:()=>{},stage:async(_,op)=>op(),worker:async(_,op)=>op()};
 const c=d.wrapControl(base),value={private:'DO_NOT_EMIT'};
 assert.equal(await c.stage('COLLECT',()=>c.worker('MEASURE:d-cancel',async()=>{
  await d.timed('OWNER',async()=>{time+=3;});await d.timed('INPUT',async()=>{time+=5;});time+=7;d.heartbeat();return value;
 })),value);
 const s=d.snapshot();assert.deepEqual(s.workers,{requested:1,started:1,completed:1,failed:0,rejected:0});
 assert.equal(s.owner.totalMs,3);assert.equal(s.input.totalMs,5);assert.equal(s.phaseTotals[9].totalMs,15);
 assert(lines.every(x=>format.test(x)&&x.length<=256&&!x.includes('DO_NOT_EMIT')));
});
test('pre-start rejection, body failure and post-check failure have distinct honest counts',async()=>{
 for(const mode of ['before','body','after']){
  const d=createActualDiagnostics();const error=Error(mode);
  const base={worker:async(_,op)=>{if(mode==='before')throw error;const v=await op();if(mode==='after')throw error;return v;}};
  const c=d.wrapControl(base);await assert.rejects(c.worker('MEASURE:d-empty',()=>{if(mode==='body')throw error;return 7;}),e=>e===error);
  assert.deepEqual(d.snapshot().workers,{requested:1,started:mode==='before'?0:1,completed:0,failed:mode==='before'?0:1,rejected:mode==='before'?1:0});
 }
});
test('in-flight heartbeat reports incomplete worker and active check, never success',async()=>{
 let time=0,release,enter;const started=new Promise(r=>enter=r),lines=[];
 const d=createActualDiagnostics({now:()=>time,emit:x=>lines.push(x)});
 const c=d.wrapControl({worker:async(_,op)=>op()});
 const pending=c.worker('MEASURE:d-reopen',()=>d.timed('OWNER',async()=>{enter();await new Promise(r=>release=r);}));
 await started;time=9;d.heartbeat();const s=d.snapshot();assert.equal(s.workers.started,1);assert.equal(s.workers.completed,0);assert.equal(s.owner.activeMs,9);
 release();await pending;assert.equal(d.snapshot().workers.completed,1);
});
test('sink errors and unknown labels cannot change results, errors, gate calls or expose labels',async()=>{
 const calls=[],error=Error('PRIMARY'),d=createActualDiagnostics({emit:()=>{throw Error('SINK');}});
 const base={checkpoint:()=>calls.push('check'),fail:()=>calls.push('fail'),stage:async(name,op)=>{calls.push(name);return op();},worker:async(name,op)=>{calls.push(name);return op();}};
 const c=d.wrapControl(base);assert.equal(c.checkpoint,base.checkpoint);assert.equal(c.fail,base.fail);
 await assert.rejects(c.stage('PRIVATE_PATH',()=>c.worker('PRIVATE_PAYLOAD',()=>{throw error;})),e=>e===error);
 assert.deepEqual(calls,['PRIVATE_PATH','PRIVATE_PAYLOAD']);assert(d.snapshot().lost>0);
 const lines=[],safe=createActualDiagnostics({emit:x=>lines.push(x)});await safe.phase('SECRET',async()=>7);
 assert(lines.every(x=>format.test(x)&&!x.includes('SECRET')));
});
test('diagnostic events and heartbeats remain bounded',async()=>{
 const lines=[],d=createActualDiagnostics({emit:x=>lines.push(x)});
 for(let i=0;i<200;i++)await d.phase('READ',async()=>{});
 for(let i=0;i<200;i++)d.heartbeat();assert(lines.length<=288);assert(d.snapshot().lost>0);
});
test('a control that does not invoke a worker body cannot produce a completed worker count',async()=>{
 const d=createActualDiagnostics(),c=d.wrapControl({worker:async()=>7});
 assert.equal(await c.worker('MEASURE:d-empty',()=>{throw Error('must not run');}),7);
 assert.deepEqual(d.snapshot().workers,{requested:1,started:0,completed:0,failed:0,rejected:1});
});
test('original control creation still checks identity once per callback without a full owner scan',async()=>{
 const events=[],d=createActualDiagnostics();let check;
 const c=await createOwnedActualControl({createR9StopControl:async(_,fn)=>{check=fn;return {stage:async(_,op)=>op(),worker:async(_,op)=>op()};}},'OWNED_DOUBLE',async()=>events.push('owner'),async()=>events.push('identity'),d);
 await check();assert.deepEqual(events,['identity']);assert.equal(d.snapshot().owner.calls,0);assert.equal(d.snapshot().input.calls,1);
 assert.equal(await c.stage('READ',async()=>5),5);
});
