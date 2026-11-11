import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {elapsedClock,readJobElapsedClock,clockName} from "./public-pack-clock.mjs";
import {assertPackCanStart} from "./public-pack-budget.mjs";
const expected={runId:"123",attempt:"1",controlCommit:"a".repeat(40)};
const stamp={...expected,startedUtcMs:1000};
test("job elapsed includes actual preparation, then advances monotonically",()=>{
 let tick=10;
 const elapsed=elapsedClock(stamp,expected,1000+28*60000,()=>tick);
 assert.equal(elapsed(),28*60000);assertPackCanStart(elapsed());
 tick+=1000;assert.equal(elapsed(),28*60000+1000);
 tick-=2000;assert.throws(()=>elapsed());
});
test("wrong job, commit, future/expired/malformed timestamps refuse",()=>{
 for(const changed of [{...stamp,runId:"124"},{...stamp,attempt:"2"},{...stamp,controlCommit:"b".repeat(40)},{...stamp,startedUtcMs:5000},{...stamp,extra:true},{...stamp,startedUtcMs:null}])
  assert.throws(()=>elapsedClock(changed,expected,2000,()=>0));
 assert.throws(()=>elapsedClock(stamp,expected,1000+61*60000,()=>0));
});
test("owned clock JSON is bounded and missing clock has no fallback",async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),"pack-clock-only-")));
 try {
  const file=path.join(root,"clock.json");await assert.rejects(readJobElapsedClock(file,expected));
  await fs.writeFile(file,JSON.stringify({...stamp,startedUtcMs:Date.now()-1000}));
  const elapsed=await readJobElapsedClock(file,expected);assert(elapsed()>=1000);
  await fs.writeFile(file,"x".repeat(4097));await assert.rejects(readJobElapsedClock(file,expected));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test("real workflow clock is context-bound and a second writer cannot overwrite it",async()=>{
 const file=path.join(process.env.RUNNER_TEMP,clockName);
 const actual={runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,controlCommit:process.env.GITHUB_SHA};
 const before=await fs.readFile(file);const elapsed=await readJobElapsedClock(file,actual);assert(elapsed()>=0);
 const script=fileURLToPath(new URL("./public-pack-clock.ps1",import.meta.url));
 const again=spawnSync("pwsh",["-NoProfile","-NonInteractive","-File",script],{encoding:"utf8",windowsHide:true});
 assert.notEqual(again.status,0);assert.deepEqual(await fs.readFile(file),before);
});
