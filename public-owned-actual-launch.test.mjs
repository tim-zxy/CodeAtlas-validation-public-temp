import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pinnedBytes} from './public-owned-actual-request.mjs';
import {assertPublicBindings,publicActualIdentity} from './public-owned-actual.mjs';
async function own(t){
 const root=await fs.mkdtemp(path.join(realpathSync.native(os.tmpdir()),'actual-private-double-'));
 t.after(async()=>{const r=realpathSync.native(root);assert(r.startsWith(realpathSync.native(os.tmpdir())+path.sep));await fs.rm(r,{recursive:true,force:true});});return root;
}
const hash=b=>createHash('sha256').update(b).digest('hex');
test('request bytes require original hash and regular single-link identity',async t=>{
 const root=await own(t),file=path.join(root,'approval.json'),bytes=Buffer.from('{"scope":"TEST_DOUBLE"}');
 await fs.writeFile(file,bytes);assert.deepEqual(pinnedBytes(file,hash(bytes)),bytes);
 assert.throws(()=>pinnedBytes(file,'a'.repeat(64)));
 const alias=path.join(root,'linked.json');await fs.link(file,alias);assert.throws(()=>pinnedBytes(file,hash(bytes)));
});
test('private actual wrapper releases only typed success, hides raw output and fails closed',async t=>{
 for(const mode of ['valid','array','failed']){
  const root=await own(t),control=path.join(root,'control'),logs=path.join(root,'logs');await fs.mkdir(control);await fs.mkdir(logs);
  for(const n of ['public-owned-actual-private.ps1','public-diagnostic-filter.ps1','public-pack-progress-stages.json'])
   await fs.copyFile(new URL('./'+n,import.meta.url),path.join(control,n));
  await fs.writeFile(path.join(control,'public-owned-actual-request.mjs'),`import fs from 'node:fs';fs.writeFileSync('actual-request.json','{}\\n',{flag:'wx'});console.log('RAW_PRIVATE_REQUEST');`);
  const result={state:mode==='array'?['ACTUAL22_VERIFIED_NOT_PHASE_ACCEPTED','PRIVATE_PAYLOAD']:'ACTUAL22_VERIFIED_NOT_PHASE_ACCEPTED',actualObservations:22,retry:false,hardIsolation:false,candidateSha256:'d88650f7126cf531fcd6eaf820c8e87a103c950d2f9fcd7a79ca914c2001f5df',archiveSha256:'b2e534f18d365f6fcd93f316e26833d4e56dfe172c82e5396d72e9fc5582e22c',coordinatorSha256:'a'.repeat(64),approvalSha256:'b'.repeat(64),requestSha256:hash(Buffer.from('{}\n')),readerContentSha256:'c'.repeat(64),privateNote:'PRIVATE_PAYLOAD'};
  await fs.writeFile(path.join(control,'public-owned-actual-entry.mjs'),mode==='failed'?`console.error('RAW_PRIVATE_FAILURE');process.exitCode=1;`:
   `import fs from 'node:fs';fs.mkdirSync('actual-output');fs.writeFileSync('actual-output/coordinator-result.json',${JSON.stringify(JSON.stringify(result))});for(let i=0;i<300;i++)console.log('ACTUAL22_HEARTBEAT:1');console.log('ACTUAL22_HEARTBEAT:PRIVATE_PAYLOAD');console.log('RAW_PRIVATE_RESULT');`);
  const env=Object.fromEntries(['SystemRoot','WINDIR','PATH','PATHEXT','ComSpec','TEMP','TMP'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
  Object.assign(env,{RUNNER_TEMP:logs,GITHUB_SHA:'d'.repeat(40),EXPECTED_COORDINATOR_SHA256:'a'.repeat(64),EXPECTED_APPROVAL_SHA256:'b'.repeat(64)});
  const child=spawnSync('pwsh',['-NoProfile','-NonInteractive','-File',path.join(control,'public-owned-actual-private.ps1')],{cwd:root,env,encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(child.status,mode==='valid'?0:1,child.stdout+child.stderr);assert(!/RAW_PRIVATE|PRIVATE_PAYLOAD/.test(child.stdout+child.stderr));
  assert((await fs.readFile(path.join(logs,'codeatlas-owned-actual22.log'),'utf8')).includes('RAW_PRIVATE'));
  if(mode==='valid'){
   assert.equal(child.stdout.split(/\r?\n/).filter(x=>x==='ACTUAL22_HEARTBEAT:1').length,160);
   const out=JSON.parse(child.stdout.split(/\r?\n/).find(x=>x.startsWith('{')));assert.equal(out.actualObservations,22);assert.equal(out.hardIsolation,false);
   assert.equal(out.cleanupEvidence,'ORIGINAL_VALIDATOR_PASSED_NO_OS_TREE_PROOF');assert.equal(out.controlCommit,'d'.repeat(40));
  }
 }
});
test('published fixture approval is bound to original ZIP and full decoded inventory',async()=>{
 const bytes=await fs.readFile(new URL('./public-actual-approval.json',import.meta.url));
 assert.equal(hash(bytes),'ef38e6dc8eb629d399cbba30784db964730b4eaa103b84c0d2643b5c9c42ded7');
 const a=JSON.parse(bytes);assertPublicBindings(a);
 assert.deepEqual(Object.keys(a).sort(),['schemaVersion','layoutRevision','environment','corpus','candidate','evidence','native','archive','release'].sort());
 assert.equal(a.release.releaseId,442510821);assert.equal(a.release.assetId,738119268);assert.notEqual(a.release.assetId,publicActualIdentity.existingPackAssetId);
 assert.equal(a.candidate.observedPeakBytes+a.candidate.fluctuationAllowanceBytes,a.candidate.reservationBytes);
 assert.equal(a.archive.entries.reduce((n,r)=>n+r.bytes,0),954695422);
 const entries=new Map();
 for(const row of a.archive.entries){
  assert.deepEqual(Object.keys(row).sort(),['bytes','path','sha256']);assert(Number.isSafeInteger(row.bytes)&&row.bytes>=0);assert.match(row.sha256,/^[a-f0-9]{64}$/);
  assert(row.path.split('/').every(p=>p&&p!=='.'&&p!=='..'&&!/[\\:]/.test(p)));assert(!entries.has(row.path.toLowerCase()));entries.set(row.path.toLowerCase(),row);
 }
 for(const [file,digest]of [[a.candidate.path,a.candidate.sha256],[a.evidence.rawPath,a.evidence.rawSha256],[a.evidence.holdoutPath,a.evidence.holdoutSha256],[a.native.path,a.native.sha256]])assert.equal(entries.get(file).sha256,digest);
});
test('single approved actual workflow is manual, fixed, read-only and bounded without uploads',async()=>{
 const wf=await fs.readFile(new URL('./.github/workflows/public-owned-actual22.yml',import.meta.url),'utf8');
 assert(wf.includes('workflow_dispatch: null')&&wf.includes('contents: read')&&wf.includes('runs-on: windows-2025'));
 assert(wf.includes("github.run_attempt == '1'")&&wf.includes('timeout-minutes: 120')&&wf.includes('timeout-minutes: 110'));
 assert(wf.includes('cancel-in-progress: false')&&wf.includes('public-owned-actual-private.ps1'));
 assert(!/upload-artifact|contents: write|release upload|public-pack\.mjs pack|runOwnedActualRequest\(/.test(wf));
 const source=await fs.readFile(new URL('./public-owned-actual.mjs',import.meta.url));assert(wf.includes(hash(source)));
 assert(wf.includes('ef38e6dc8eb629d399cbba30784db964730b4eaa103b84c0d2643b5c9c42ded7'));
});
test('launcher normalizes Windows mixed-separator source/work before fixed-context checks',async t=>{
 const root=await own(t),file=path.join(root,'public-owned-actual-entry.mjs');
 await fs.copyFile(new URL('./public-owned-actual-entry.mjs',import.meta.url),file);
 await fs.writeFile(path.join(root,'public-owned-actual.mjs'),`export async function runOwnedActualRequest(...args){return {scope:'TEST_DOUBLE',args};}`);
 const source=root+'/source',work=root+'/pack-work';
 const child=spawnSync(process.execPath,[file,'collect',source,work,'REQUEST','a'.repeat(64),'b'.repeat(64)],{encoding:'utf8',windowsHide:true,timeout:10000});
 assert.equal(child.status,0,child.stderr);const r=JSON.parse(child.stdout);assert.equal(r.scope,'TEST_DOUBLE');
 assert.equal(r.args[0],path.resolve(source));assert.equal(r.args[1],path.resolve(work));assert.equal(r.args[2],'REQUEST');
});
