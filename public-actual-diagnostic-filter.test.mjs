import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';

const line=event=>'ACTUAL22_DIAG:'+ [event,...Array(16).fill(0)].join(':');
async function filter(t,lines,optIn){
 const root=await fs.mkdtemp(path.join(realpathSync.native(os.tmpdir()),'actual-filter-double-'));
 t.after(async()=>{assert(realpathSync.native(root).startsWith(realpathSync.native(os.tmpdir())+path.sep));await fs.rm(root,{recursive:true,force:true});});
 for(const name of ['public-diagnostic-filter.ps1','public-pack-progress-stages.json'])await fs.copyFile(new URL('./'+name,import.meta.url),path.join(root,name));
 await fs.writeFile(path.join(root,'input.txt'),lines.join('\n'));
 await fs.writeFile(path.join(root,'test.ps1'),`. "$PSScriptRoot/public-diagnostic-filter.ps1"\nGet-Content -LiteralPath "$PSScriptRoot/input.txt" | Select-DiagnosticProgress ${optIn?'-ActualTelemetry':''}\n`);
 const r=spawnSync('pwsh',['-NoProfile','-NonInteractive','-File',path.join(root,'test.ps1')],{encoding:'utf8',windowsHide:true,timeout:10000});
 assert.equal(r.status,0,r.stderr);return r.stdout.trim().split(/\r?\n/).filter(Boolean);
}
test('telemetry is opt-in and rejects malformed or private fields',async t=>{
 const valid=[line(1),line(7),line(9)];
 const input=[...valid,'PRIVATE_PAYLOAD C:\\Users\\PRIVATE',line(10),line(1)+':0',line(1).replace(':0',':PRIVATE_PAYLOAD'),line(1).replace(':0',':1000000000')];
 assert.deepEqual(await filter(t,input,false),[]);
 assert.deepEqual(await filter(t,input,true),valid);
});
test('telemetry preserves heartbeat, event and total output caps',async t=>{
 const out=await filter(t,[...Array(170).fill(line(7)),...Array(140).fill(line(1))],true);
 assert.equal(out.length,256);assert.equal(out.filter(x=>x===line(7)).length,160);assert.equal(out.filter(x=>x===line(1)).length,96);
 const events=await filter(t,Array(140).fill(line(1)),true);assert.equal(events.length,128);
});
