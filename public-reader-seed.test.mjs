import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {realpathSync} from "node:fs";
import path from "node:path";
import os from "node:os";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {assertActualTargetAbsent,assertPinnedMember,assertProfileIdentity,staticReaderState,expectedReaderSha256} from "./public-reader-seed.mjs";
async function own(t){
 const root=await fs.mkdtemp(path.join(realpathSync.native(os.tmpdir()),"seed-reader-double-"));
 t.after(async()=>{const p=realpathSync.native(root);assert(p.startsWith(realpathSync.native(os.tmpdir())+path.sep));await fs.rm(p,{recursive:true,force:true});});return root;
}
test("actual target must stay absent before and after bootstrap; no removal or adoption",async t=>{
 const root=await own(t),target=path.join(root,"actual");
 await assertActualTargetAbsent(target);await fs.mkdir(target);
 await assert.rejects(assertActualTargetAbsent(target));
 assert.deepEqual(await fs.readdir(target),[]);
});
test("selected JSON bytes require both exact size and independent pinned digest",()=>{
 const bytes=Buffer.from('{"scope":"TEST_DOUBLE"}'),pin={bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")};
 assert.deepEqual(assertPinnedMember(bytes,pin),{scope:"TEST_DOUBLE"});
 assert.throws(()=>assertPinnedMember(Buffer.from('{"scope":"other-value"}'),pin));
 assert.throws(()=>assertPinnedMember(bytes,{...pin,bytes:pin.bytes+1}));
 assert.throws(()=>assertPinnedMember(bytes,{...pin,sha256:"0".repeat(64)}));
});
test("profile object cannot self-approve and a different complete reader does not change expected pin",()=>{
 assert.throws(()=>assertProfileIdentity({approved:true}));
 assert.equal(staticReaderState(expectedReaderSha256),"READER_SEED_STATIC_PIN_MATCH_NOT_QUALIFIED");
 assert.equal(staticReaderState("1".repeat(64)),"READER_SEED_STATIC_PIN_MISMATCH_NOT_QUALIFIED");
 assert.equal(expectedReaderSha256,"e15e1bcd6ce9aa1897554b0fbcd3de67ab40ef11f886c71c44a5a8ac1543f8c4");
 assert.throws(()=>staticReaderState("not-a-hash"));
});
test("seed workflow and call path cannot acquire installer layout, collect, PACK or publish",async()=>{
 const wf=await fs.readFile(new URL("./.github/workflows/public-reader-seed.yml",import.meta.url),"utf8");
 assert(wf.includes("workflow_dispatch: null")&&wf.includes("contents: read"));
 assert(!wf.includes("contents: write")&&!/upload-artifact|release upload|\.mjs (collect|pack|publish) /.test(wf));
 assert(wf.includes("timeout-minutes: 30")&&wf.includes("-Mode seed"));
 const source=await fs.readFile(new URL("./public-reader-seed.mjs",import.meta.url),"utf8");
 assert(!/prepareReview\(|runActual|runRefreshTransportCommand|createExclusiveRefreshCiRoot|fs\.mkdir\(pins.logicalRoot/.test(source));
 assert(source.includes("extract(source,work,pins.assets[0],true)"));
 assert(source.includes("assert.equal(observed,expectedReaderSha256"));
 assert(source.includes("generic.assertExactInventory(inventory"));
 assert(source.includes("assertCopiedProfiles(actual,profiles,runtime)"));
 assert(source.split("await assertActualTargetAbsent()").length>=3);
});
test("mismatch metadata is public but raw diagnostics remain private and result stays failed",async t=>{
 const root=await own(t),control=path.join(root,"control"),logs=path.join(root,"logs"),resultRoot=path.join(root,"reader-freeze");
 await fs.mkdir(control);await fs.mkdir(logs);await fs.mkdir(resultRoot);
 for(const name of ["public-reader-private.ps1","public-diagnostic-filter.ps1","public-pack-progress-stages.json"])
  await fs.copyFile(new URL("./"+name,import.meta.url),path.join(control,name));
 const result={state:"READER_SEED_STATIC_PIN_MISMATCH_NOT_QUALIFIED",sourceCommit:"79da40105d480cce540ac636334dd9b6d3f54956",controlCommit:"c".repeat(40),readerContentSha256:"1".repeat(64),expectedReaderSha256,profileObjectSha256:"9b2716123d15227808c35fe9dd24eb5393131192aca9aaa0f1d83a90db3077f4",topologyDigest:"cf73f6ee1c246cc41b5d84035e56085f90e3ed5590bf93de00bd302b5596519c",files:123,links:0,directories:1,dependencyEntries:8066,cases:0,logicalLayoutAbsent:true,privateNote:"DO_NOT_EXPOSE"};
 await fs.writeFile(path.join(control,"public-reader-seed.mjs"),
  'import fs from "node:fs";fs.writeFileSync("./reader-freeze/result.json",'+JSON.stringify(JSON.stringify(result))+');console.log("RAW_PRIVATE_DIAGNOSTIC");console.error("RAW_PRIVATE_ERROR");process.exitCode=1;');
 const keys=["SystemRoot","WINDIR","PATH","PATHEXT","ComSpec","TEMP","TMP"];
 const env=Object.fromEntries(keys.filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
 env.RUNNER_TEMP=logs;env.GITHUB_SHA="c".repeat(40);
 const script=path.join(control,"public-reader-private.ps1").replaceAll("'","''");
 const child=spawnSync("pwsh",["-NoProfile","-NonInteractive","-Command","$PSNativeCommandUseErrorActionPreference=$true; & '"+script+"' -Mode seed"],{cwd:root,env,encoding:"utf8",windowsHide:true,timeout:10000});
 assert.equal(child.status,1);
 assert(!/RAW_PRIVATE|DO_NOT_EXPOSE/.test(child.stdout+child.stderr));
 const line=child.stdout.split(/\r?\n/).find(x=>x.startsWith("{"));
 assert(line,child.stdout+child.stderr);
 const out=JSON.parse(line);assert.equal(out.state,result.state);assert.equal(out.readerContentSha256,result.readerContentSha256);
 assert.equal(out.actual22,"NOT_ATTEMPTED");assert.equal(out.cases,0);assert.equal(out.logicalLayoutAbsent,true);
 assert((await fs.readFile(path.join(logs,"codeatlas-reader-only-seed.log"),"utf8")).includes("RAW_PRIVATE_DIAGNOSTIC"));
});
