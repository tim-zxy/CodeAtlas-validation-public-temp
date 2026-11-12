import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {runShortDiagnostic} from './public-short-diagnostic.mjs';
test('short diagnostic has fixed zero-sample order and before/after owner lifecycle',async()=>{
 const calls=[],lines=[];let tick=0;
 const r=await runShortDiagnostic({construct:async()=>{calls.push('construct');return 'owner';},
  consume:async(owner,f)=>{assert.equal(owner,'owner');calls.push('pre');await f({check:async()=>calls.push('check')});calls.push('post');},
  download:async()=>calls.push('download'),hash:async()=>calls.push('hash'),assertAbsent:async()=>calls.push('absent')},s=>lines.push(s),()=>++tick);
 assert.deepEqual(calls,['construct','pre','check','download','hash','hash','absent','post','absent']);
 assert.deepEqual(r,{ownerChecks:1,hashes:2,samples:0});
 assert(lines.every(s=>/^SHORT_DIAG:[1-9]:[123]:\d{1,9}:\d{1,2}:[01]$/.test(s)));
});
test('every short diagnostic failure blocks later work and never retries',async()=>{
 for(const fail of ['construct','pre','check','download','hash1','hash2','absent','post']){
  const calls=[];const error=new Error('PRIVATE_SECRET');let hash=0;
  const invoke=n=>{calls.push(n);if(n===fail)throw error;};
  const lines=[];
  await assert.rejects(runShortDiagnostic({construct:async()=>invoke('construct'),consume:async(o,f)=>{invoke('pre');await f({check:async()=>invoke('check')});invoke('post');},download:async()=>invoke('download'),hash:async()=>invoke('hash'+(++hash)),assertAbsent:async()=>invoke('absent')},s=>lines.push(s)),e=>e===error);
  assert.equal(calls.at(-1),fail);assert(!lines.join('').includes('PRIVATE_SECRET'));
 }
});
test('operational entry does not invoke actual/install/measurement and workflow stays bounded',async()=>{
 const entry=await fs.readFile(new URL('./public-short-diagnostic-entry.mjs',import.meta.url),'utf8');
 assert(!/runOwnedActual|runRefreshTransportCommand|installRefreshCiPack|verifyRefreshCiPack|execFile|spawn\(/.test(entry));
 assert(entry.includes('constructRunLocalReader')&&entry.includes('consumeRunLocalReader')&&entry.includes('downloadRefreshCiArchive')&&entry.includes('assertToolSeal'));
 const workflow=await fs.readFile(new URL('./.github/workflows/public-short-diagnostic.yml',import.meta.url),'utf8');
 assert(workflow.includes('timeout-minutes: 20')&&workflow.includes('contents: read')&&workflow.includes("github.run_attempt == '1'"));
 assert(!/upload-artifact|contents: write|public-owned-actual-private|Mode owned/.test(workflow));
});
test('short wrapper exposes only capped numeric lines and preserves child failure',async t=>{
 const root=await fs.mkdtemp(path.join(realpathSync.native(os.tmpdir()),'short-diagnostic-double-'));
 t.after(async()=>{assert(realpathSync.native(root).startsWith(realpathSync.native(os.tmpdir())+path.sep));await fs.rm(root,{recursive:true,force:true});});
 await fs.copyFile(new URL('./public-short-diagnostic-private.ps1',import.meta.url),path.join(root,'public-short-diagnostic-private.ps1'));
 for(const code of [0,1]){
  await fs.writeFile(path.join(root,'public-short-diagnostic-entry.mjs'),`console.log('PRIVATE_SECRET C:/Users/PRIVATE');for(let i=0;i<30;i++)console.log('SHORT_DIAG:5:2:7:1:1');console.log('SHORT_DIAG:5:2:7:PRIVATE_SECRET:1');process.exitCode=${code};`);
  const r=spawnSync('pwsh',['-NoProfile','-NonInteractive','-File',path.join(root,'public-short-diagnostic-private.ps1')],{encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(r.status,code,r.stderr);const lines=r.stdout.trim().split(/\r?\n/);assert.equal(lines.length,24+code);
  assert(lines.every(s=>/^SHORT_DIAG:[1-9]:[123]:\d{1,9}:\d{1,2}:[01]$/.test(s)));assert(!/PRIVATE_SECRET|Users/.test(r.stdout+r.stderr));
 }
});
