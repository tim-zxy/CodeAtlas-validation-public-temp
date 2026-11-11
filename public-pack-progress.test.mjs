import test from "node:test";
import assert from "node:assert/strict";
import { createProgress, progressFilter, runProgressChild } from "./public-pack-progress.mjs";

test("fixed stages report monotonic total and stage elapsed time without arbitrary text", () => {
  let now = 100; const lines=[];
  const p=createProgress("PARENT",line=>lines.push(line),()=>now);
  p.enter("EXTRACT_FIXED_INPUTS"); now=125; p.enter("MATERIALIZE_PAYLOAD"); now=180; p.finish();
  assert.deepEqual(lines,["PACK_PROGRESS:PARENT:EXTRACT_FIXED_INPUTS:BEGIN:0:0", "PACK_PROGRESS:PARENT:EXTRACT_FIXED_INPUTS:END:25:25", "PACK_PROGRESS:PARENT:MATERIALIZE_PAYLOAD:BEGIN:25:0", "PACK_PROGRESS:PARENT:MATERIALIZE_PAYLOAD:END:80:55"]);
  assert.throws(()=>p.enter("private/path"));
});
test("stream filter handles split frames, oversized lines, raw secrets and output limits", () => {
  const lines=[], f=progressFilter(x=>lines.push(x));
  f(Buffer.from("private/path\nPACK_PROGRESS:READER:NATIVE_"));
  f(Buffer.from("BUILD:BEGIN:0:0\r\n"));
  f(Buffer.from("x".repeat(5000)+"\nPACK_PROGRESS:READER:OTHER:BEGIN:0:0\n"));
  f(Buffer.from("PACK_PROGRESS:READER:NATIVE_BUILD:END:5:5\n".repeat(600)));
  assert.equal(lines[0],"PACK_PROGRESS:READER:NATIVE_BUILD:BEGIN:0:0");
  assert(lines.length<=256);
  assert(!lines.some(x=>x.includes("private")||x.includes("OTHER")));
});
test("real child stage is visible before cancellation and raw stderr stays private", async () => {
  const ac=new AbortController(); const lines=[]; let resolve;
  const visible=new Promise(r=>resolve=r);
  const done=runProgressChild(process.execPath,["-e", "console.error('PRIVATE_SENTINEL'); console.error('PACK_PROGRESS:READER:NATIVE_BUILD:BEGIN:0:0'); setTimeout(()=>{},3000)"],
    {signal:ac.signal,timeoutMs:5000,onProgress:line=>{lines.push(line);resolve();}});
  // Observe progress before child exits or error handler runs.
  await visible; assert.equal(lines.length,1); ac.abort();
  await assert.rejects(done);
  assert.deepEqual(lines,["PACK_PROGRESS:READER:NATIVE_BUILD:BEGIN:0:0"]);
});
test("child success, failure and stdout bounds preserve stop semantics", async () => {
  assert.equal((await runProgressChild(process.execPath,["-e","process.stdout.write('ok')"],{timeoutMs:2000})).toString(),"ok");
  await assert.rejects(runProgressChild(process.execPath,["-e","process.exit(2)"],{timeoutMs:2000}),e=>e.code==="READONLY_CHILD_FAILED");
  await assert.rejects(runProgressChild(process.execPath,["-e","process.stdout.write('x'.repeat(2000))"],{timeoutMs:2000,maxBuffer:100}),e=>e.code==="STDOUT_LIMIT");
});

test("abort without close reports cleanup UNKNOWN within grace, not original budget", async () => {
  const { EventEmitter }=await import("node:events");
  const fake=new EventEmitter(); fake.pid=12345; fake.stdout=new EventEmitter(); fake.stderr=new EventEmitter();
  let kills=0; fake.kill=()=>{kills++;return false;};
  const begin=performance.now();
  const done=runProgressChild("test-only",[],{timeoutMs:60000,spawnChild:()=>fake});
  queueMicrotask(()=>fake.emit("error",Object.assign(new Error("test abort"),{code:"ABORT_ERR"})));
  await assert.rejects(done,e=>e.code==="CLEANUP_UNKNOWN");
  assert(performance.now()-begin<10000);
  assert.equal(kills,0);
});

test("safe child failure codes are live while arbitrary error payload is discarded", () => {
  const lines=[], f=progressFilter(x=>lines.push(x));
  f(Buffer.from("READONLY_PACK_REVIEW_FAILED:ORIGINAL_PAIRED162:ERR_ASSERTION\nREADONLY_PACK_REVIEW_FAILED:ORIGINAL_PAIRED162:private/path\n"));
  assert.deepEqual(lines,["READONLY_PACK_REVIEW_FAILED:ORIGINAL_PAIRED162:ERR_ASSERTION"]);
});
test("operational child timeout stops without retry and keeps the stage already emitted", async () => {
  const lines=[];
  await assert.rejects(runProgressChild(process.execPath,["-e", "console.error('PACK_PROGRESS:READER:NATIVE_BUILD:BEGIN:0:0'); setTimeout(()=>{},3000)"],
    {timeoutMs:500,onProgress:x=>lines.push(x)}),e=>e.code==="ETIMEDOUT");
  assert.deepEqual(lines,["PACK_PROGRESS:READER:NATIVE_BUILD:BEGIN:0:0"]);
});

test("PowerShell stage allowlist matches the exact JS role stage lists", async () => {
  const fs=await import("node:fs/promises");
  const {parentStages}=await import("./public-pack-progress.mjs");
  const {reviewStages}=await import("./public-pack-review.mjs");
  const lists=JSON.parse(await fs.readFile(new URL("./public-pack-progress-stages.json",import.meta.url),"utf8"));
  assert.deepEqual(lists,{PARENT:parentStages,READER:reviewStages});
});
