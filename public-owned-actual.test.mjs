import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createR9StopControl} from './test-fixtures/native-refresh-r9-stop.mjs';
import {createReaderLease} from './public-reader-lease.mjs';
import {runOwnedActualSequence,settleOwnedActual,createActual22Ports,runOwnedActualRequest,publicActualIdentity,createOwnedActualControl} from './public-owned-actual.mjs';
async function own(t){
 const p=await fs.mkdtemp(path.join(realpathSync.native(os.tmpdir()),'owned-actual-double-'));
 t.after(async()=>{const r=realpathSync.native(p);assert(r.startsWith(realpathSync.native(os.tmpdir())+path.sep));await fs.rm(r,{recursive:true,force:true});});return p;
}
const names=['verifyReader','download','verifyPack','install','read','collect','validate','verifyAfter'];
function ports(events,fail){return Object.fromEntries(names.map(name=>[name,async(...args)=>{
 events.push(name);if(name===fail)throw Error('TEST_DOUBLE_FAILURE');
 if(name==='collect')return args[2].worker('OWNED_DOUBLE',async()=>({scope:'TEST_DOUBLE',passed:true,failures:[]}));
 return {scope:'TEST_DOUBLE'};
}]));}
test('exact original stage order and original nested worker control survive owner wrapping',async t=>{
 const root=await own(t),events=[],control=await createR9StopControl(root),checks=[];
 const result=await runOwnedActualSequence(ports(events),control,async()=>checks.push('owner'));
 assert.deepEqual(events,names);assert.deepEqual(checks,['owner','owner']);assert.equal(result.scope,'TEST_DOUBLE');
});
test('every original failing phase blocks all later phases without retry',async t=>{
 for(let i=0;i<names.length;i++){
  const root=await own(t),events=[],control=await createR9StopControl(root);
  await assert.rejects(runOwnedActualSequence(ports(events,names[i]),control,async()=>{}));
  assert.deepEqual(events,names.slice(0,i+1));
  const receipt=JSON.parse(await fs.readFile(path.join(root,'r9-stop-receipt.json'),'utf8'));
  assert.equal(receipt.cleanupState,'UNKNOWN');assert.equal(receipt.laterLaunchesBlocked,true);
 }
});
test('owner refusal before sequence launches nothing; owner post-check failure never reports success',async t=>{
 const root=await own(t),events=[],control=await createR9StopControl(root);
 await assert.rejects(runOwnedActualSequence(ports(events),control,async()=>{throw Error('owner drift');}));assert.deepEqual(events,[]);
 await assert.rejects(control.worker('LATER_AFTER_OWNER_REFUSAL',()=>events.push('forbidden')));
 let checks=0;const afterControl=await createR9StopControl(await own(t));
 await assert.rejects(runOwnedActualSequence(ports(events),afterControl,async()=>{if(++checks===2)throw Error('late owner drift');}),/late owner drift/);
 await assert.rejects(afterControl.worker('LATER_AFTER_POSTCHECK',()=>events.push('forbidden')));
});
test('success receipt waits for lease post-consumption checks, not just successful report',async()=>{
 const events=[];let checks=0;
 const lease=createReaderLease({root:'TEST_DOUBLE',inventory:{},inspect:async()=>({}),compare:assert.deepEqual,
  verifyContext:async()=>{if(++checks===2)throw Error('post-consumption drift');}});
 await assert.rejects(settleOwnedActual(op=>lease.consume(op),async()=>{events.push('report');return {scope:'TEST_DOUBLE'};},
  ()=>events.push('SUCCESS_RECEIPT'),()=>events.push('UNKNOWN_RECEIPT')),/post-consumption drift/);
 assert.deepEqual(events,['report','UNKNOWN_RECEIPT']);
});
test('failure reporting cannot overwrite the primary failure or silently claim cleanup',async()=>{
 await assert.rejects(settleOwnedActual(async()=>{throw Error('primary');},()=>{},()=>{},()=>{throw Error('record failure');}),
  e=>e instanceof AggregateError&&e.errors.some(x=>x.message==='primary')&&e.errors.some(x=>x.message==='record failure'));
 const events=[];assert.equal(await settleOwnedActual(op=>op(),()=>7,v=>events.push(v),()=>events.push('FAIL')),7);assert.deepEqual(events,[7]);
});
test('bridge retains original download, verify, install, read, approved collect, validation APIs',async()=>{
 const calls=[],installed={manifestPath:'manifest',bindingPath:'binding',fixtureContext:{scope:'TEST_DOUBLE'},candidatePath:'candidate'},
  values=[{identity:'identity'}],request={readerRoot:'reader',outputRoot:'output'},approval={candidate:{sha256:'digest'}},report={scope:'TEST_DOUBLE'};
 const modules={pack:{downloadRefreshCiArchive:(...a)=>{calls.push(['download',...a]);return 'archive';},verifyRefreshCiPack:a=>{calls.push(['verify',a]);},installRefreshCiPack:a=>{calls.push(['install',a]);return installed;}},
  replay:{readRefreshTransportReplayCorpus:(...a)=>{calls.push(['read',...a]);return values;},runRefreshTransportCommand:(...a)=>{calls.push(['collect',...a]);return report;}},
  ci:{validateRefreshCiActualReport:(...a)=>calls.push(['validate',...a])}};
 const p=createActual22Ports(modules,{request,approval,archivePath:'archive',withZipTools:op=>op(),verifyReader:()=>{},verifyAfter:()=>{}});
 assert.equal(await p.download(),'archive');await p.verifyPack('archive');assert.equal(await p.install('archive'),installed);
 assert.equal(await p.read(installed),values);const control={scope:'TEST_DOUBLE'};assert.equal(await p.collect(installed,values,control),report);
 await p.validate(report,values);await p.verifyAfter();
 assert.deepEqual(calls.map(x=>x[0]),['download','verify','install','read','collect','validate','verify']);
 assert.deepEqual(calls.find(x=>x[0]==='collect').slice(1),[['collect','approved','candidate',path.join('output','actual')],installed.fixtureContext,control]);
 assert.equal(calls.find(x=>x[0]==='validate')[2].identity,'identity');
});
test('real fixture IDs are fixed and untrusted launch context refuses before construction writes',async()=>{
 assert.equal(publicActualIdentity.releaseId,442510821);assert.equal(publicActualIdentity.assetId,738119268);
 assert(!Object.hasOwn(publicActualIdentity,'readerContentSha256'));
 await assert.rejects(runOwnedActualRequest('MISSING_SOURCE','MISSING_WORK','MISSING_REQUEST','a'.repeat(64),'b'.repeat(64)));
});
test('original key-input drift during download still stops before install and every later worker',async t=>{
 const root=await own(t),events=[];let drift=false,identityChecks=0;
 const check=async()=>{};
 const control=await createOwnedActualControl({createR9StopControl},root,check,async()=>{identityChecks++;assert(!drift,'TEST_DOUBLE_KEY_DRIFT');});
 const p=ports(events);p.download=async()=>{events.push('download');drift=true;return 'archive';};
 await assert.rejects(runOwnedActualSequence(p,control,check));
 assert.deepEqual(events,['verifyReader','download']);assert(identityChecks>0);
 const receipt=JSON.parse(await fs.readFile(path.join(root,'r9-stop-receipt.json'),'utf8'));
 assert.equal(receipt.laterLaunchesBlocked,true);assert.equal(receipt.cleanupState,'UNKNOWN');
 await assert.rejects(control.worker('LATER',()=>events.push('forbidden')));
 assert(!events.includes('forbidden'));
});
test('untrusted launcher context returns bounded refusal without creating supplied missing paths',async t=>{
 const root=await own(t),missing=path.join(root,'absent');
 const child=spawnSync(process.execPath,[fileURLToPath(new URL('./public-owned-actual-entry.mjs',import.meta.url)),'collect',missing,missing,missing,'a'.repeat(64),'b'.repeat(64)],{encoding:'utf8',windowsHide:true,timeout:10000});
 assert.equal(child.status,1);assert(child.stdout.trim().split(/\r?\n/).every(x=>/^ACTUAL22_DIAG:(?:[0-9]{1,9}:){16}[0-9]{1,9}$/.test(x)));
 assert.match(child.stderr,/^PUBLIC_OWNED_ACTUAL_REFUSED_OR_FAILED:/);
 await assert.rejects(fs.lstat(missing),{code:'ENOENT'});
});

test('approved fixed sequence keeps six owner scans and all 106 original identity callbacks',async t=>{
 const root=await own(t);let owners=0,identities=0,workers=0;
 const lease=createReaderLease({root:'OWNED_DOUBLE',inventory:{},inspect:async()=>({}),compare:assert.deepEqual,verifyContext:async()=>{owners++;}});
 await lease.consume(async({check})=>{
  await check(); // reviewed adapter entry
  await check(); // original request setup
  const control=await createOwnedActualControl({createR9StopControl},root,check,async()=>{identities++;});
  const p=ports([]);p.collect=async()=>{
   for(let i=0;i<22;i++)await control.worker('OWNED:'+i,async()=>{workers++;return {scope:'TEST_DOUBLE'};});
   // Frozen success-path shape: 16 stage + 44 worker + 46 internal callbacks.
   // This is a control fixture, not actual Native/collector execution evidence.
   for(let i=0;i<46;i++)await control.checkpoint('OWNED:INTERNAL:'+i);
   return {scope:'TEST_DOUBLE'};
  };
  await runOwnedActualSequence(p,control,check);
 });
 assert.equal(owners,6);assert.equal(identities,106);assert.equal(workers,22);
});

test('persistent whole-owner drift is rejected at outer postcheck before final success and latches UNKNOWN',async t=>{
 const root=await own(t),events=[];let drift=false,success=false;
 const check=async()=>assert(!drift,'TEST_DOUBLE_PERSISTENT_DRIFT');
 const control=await createOwnedActualControl({createR9StopControl},root,check,async()=>{});
 const p=ports(events);p.download=async()=>{events.push('download');drift=true;return 'archive';};
 await assert.rejects(settleOwnedActual(op=>op(),()=>runOwnedActualSequence(p,control,check),()=>{success=true;},async()=>{}),/PERSISTENT_DRIFT/);
 assert.deepEqual(events,names);assert.equal(success,false);
 const receipt=JSON.parse(await fs.readFile(path.join(root,'r9-stop-receipt.json'),'utf8'));assert.equal(receipt.cleanupState,'UNKNOWN');assert.equal(receipt.laterLaunchesBlocked,true);
 await assert.rejects(control.worker('LATER',()=>{}));
});
test('approved transient whole-owner drift restored between full scans may be missed',async t=>{
 const root=await own(t);let drift=false,checks=0;
 const check=async()=>{checks++;assert(!drift,'FULL_OWNER_DRIFT');};
 const control=await createOwnedActualControl({createR9StopControl},root,check,async()=>{});
 const p=ports([]);p.download=async()=>{drift=true;return 'archive';};p.verifyPack=async()=>{drift=false;return {scope:'TEST_DOUBLE'};};
 const report=await runOwnedActualSequence(p,control,check);assert.equal(report.scope,'TEST_DOUBLE');assert.equal(checks,2);
});
test('missing original input callback refuses and UNKNOWN worker blocks later stages',async t=>{
 const root=await own(t);await assert.rejects(createOwnedActualControl({createR9StopControl},root,async()=>{},undefined));
 const events=[],control=await createOwnedActualControl({createR9StopControl},root,async()=>{},async()=>{}),p=ports(events);
 p.collect=async()=>{events.push('collect');return {scope:'TEST_DOUBLE',cleanupState:'UNKNOWN'};};
 await assert.rejects(runOwnedActualSequence(p,control,async()=>{}));assert(!events.includes('validate'));await assert.rejects(control.worker('LATER',()=>{}));
});
