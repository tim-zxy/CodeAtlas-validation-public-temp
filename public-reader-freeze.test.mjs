import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {realpathSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {cloneClosedReader,validateReaderRelease} from "./public-reader-freeze.mjs";
import {snapshotTree,assertProtectedEqual} from "./public-pack-invariants.mjs";
import * as generic from "./test-fixtures/reader-original-guards.mjs";
const here=import.meta.dirname;
async function own(t) {
 const root=await fs.mkdtemp(path.join(realpathSync.native(os.tmpdir()),"reader-freeze-double-"));
 t.after(async()=>{const p=realpathSync.native(root);assert(p.startsWith(realpathSync.native(os.tmpdir())+path.sep));await fs.rm(p,{recursive:true,force:true});});
 return root;
}
const snapshot=root=>snapshotTree(root,{hashFile:generic.hashFile,allowLinks:true,allowHardlinks:true});
test("closed tree preserves exact bytes and internal topology, normalizes hardlinks to single files",async t=>{
 const root=await own(t),source=path.join(root,"source"),dest=path.join(root,"reader");
 await fs.mkdir(source);await fs.mkdir(path.join(source,"pkg"));
 await fs.writeFile(path.join(source,"pkg/a.js"),"export const n=1;");
 await fs.link(path.join(source,"pkg/a.js"),path.join(source,"pkg/b.js"));
 await fs.symlink(path.join(source,"pkg"),path.join(source,"alias"),"junction");
 await fs.mkdir(path.join(source,".git"));await fs.writeFile(path.join(source,".git/config"),"TEST_DOUBLE_VCS_METADATA_NOT_READER");
 const before=await snapshot(source);
 const actual=await cloneClosedReader(source,dest,before,generic);
 assert.equal(actual.files.length,2);assert.equal(actual.links.length,1);
 for(const file of actual.files)assert.equal((await fs.lstat(path.join(dest,file.path))).nlink,1);
 await assert.rejects(fs.stat(path.join(dest,".git")),{code:"ENOENT"});
 assertProtectedEqual(before,await snapshot(source));
});
test("bad members, escaping targets and overlapping destinations refuse",async t=>{
 const root=await own(t),source=path.join(root,"source");await fs.mkdir(source);
 const expected=await snapshot(source);
 await assert.rejects(cloneClosedReader(source,path.join(source,"child"),expected,generic));
 for(const member of ["../escape","NUL","a:stream","a\\b","a."]){
  const bad={...expected,directories:[member]};
  await assert.rejects(cloneClosedReader(source,path.join(root,"bad"+Math.random()),bad,generic));
 }
 const bad={...expected,links:[{path:"alias",target:"../outside"}]};
 await assert.rejects(cloneClosedReader(source,path.join(root,"bad-link"),bad,generic));
});
test("source drift cannot produce a complete closed inventory",async t=>{
 const root=await own(t),source=path.join(root,"source");await fs.mkdir(source);
 await fs.writeFile(path.join(source,"data"),"before");const before=await snapshot(source);
 await fs.writeFile(path.join(source,"data"),"after");
 await assert.rejects(cloneClosedReader(source,path.join(root,"reader"),before,generic));
});
test("destination is exclusive and a copied tree cannot conceal later corruption",async t=>{
 const root=await own(t),source=path.join(root,"source"),dest=path.join(root,"reader");
 await fs.mkdir(source);await fs.writeFile(path.join(source,"data"),"same");
 const expected=await snapshot(source),first=await cloneClosedReader(source,dest,expected,generic);
 await assert.rejects(cloneClosedReader(source,dest,expected,generic),{code:"EEXIST"});
 await fs.writeFile(path.join(dest,"data"),"changed");
 assert.throws(()=>generic.assertExactInventory(first,{}));
 const later=await generic.inventoryTree(dest,{allowLinks:true});
 assert.throws(()=>generic.assertExactInventory(first,later));
});
test("reader fetch accepts existing PACK asset but rejects every changed source identity",async()=>{
 const pins=JSON.parse(await fs.readFile(new URL("./public-pack-pins.json",import.meta.url)));
 const {retainedSeed}=await import("./retained-seed.mjs");
 const value={id:441241421,draft:false,prerelease:true,tag_name:"build-seed-"+retainedSeed.archiveSha256,
 assets:pins.assets.map(p=>({...p,size:p.bytes,state:"uploaded",digest:"sha256:"+p.sha256})).concat([{id:737583622,name:"codeatlas-p05-d5-public-79da401.zip"}])};
 assert.doesNotThrow(()=>validateReaderRelease(value));
 for(const change of [x=>x.id++,x=>x.draft=true,x=>x.prerelease=false,x=>x.tag_name="wrong",x=>x.assets[0].size++,x=>x.assets[0].digest="sha256:"+"0".repeat(64),x=>x.assets.push(x.assets[0])]){
  const copy=structuredClone(value);change(copy);assert.throws(()=>validateReaderRelease(copy));
 }
});
test("workflow is manual, read-only, bounded, and cannot publish or select actual22",async()=>{
 const workflow=await fs.readFile(new URL("./.github/workflows/public-reader-freeze.yml",import.meta.url),"utf8");
 assert(workflow.includes("workflow_dispatch: null"));assert(!/\n\s+push:/.test(workflow));
 assert(workflow.includes("timeout-minutes: 75"));assert(workflow.includes("public-reader-private.ps1 -Mode build"));
 assert(workflow.includes("20261103.298.1"));assert(workflow.includes("persist-credentials: false"));
 assert(!workflow.includes("contents: write"));assert(!/upload-artifact|release upload|\.mjs (pack|collect|publish) /.test(workflow));
 const source=await fs.readFile(new URL("./public-reader-freeze.mjs",import.meta.url),"utf8");
 assert(source.includes('await verifySeed(closed,seed.root'));
 assert(source.includes('generic.assertExactInventory(initial'));
 assert(source.includes('generic.assertReboundBinding(binding,rebound,catalog.roots)'));
 assert(source.includes('RUNNER_LOCAL_ONLY_NOT_A_REUSABLE_RETAINED_BUNDLE'));
});

test("private outer wrapper hides raw diagnostics and fixed whitelist rejects unknown public lines",async t=>{
 const root=await own(t),log=path.join(root,"private.log");
 const {spawnSync}=await import("node:child_process");
 const filter=path.join(here,"public-diagnostic-filter.ps1").replaceAll("'","''");
 const command=". '"+filter+"'; @('TEST_DOUBLE_SECRET_PATH','PACK_PROGRESS:PARENT:SEED_VERIFY:BEGIN:1:0','PACK_PROGRESS:READER:UNKNOWN_ROLE:END:2:1') | Select-DiagnosticProgress -PrivateLog '"+log.replaceAll("'","''")+"'";
 const child=spawnSync("pwsh",["-NoProfile","-NonInteractive","-Command",command],{encoding:"utf8",windowsHide:true,timeout:10000});
 assert.equal(child.status,0,child.stderr);
 assert.equal(child.stdout.trim(),"PACK_PROGRESS:PARENT:SEED_VERIFY:BEGIN:1:0");
 assert((await fs.readFile(log,"utf8")).includes("TEST_DOUBLE_SECRET_PATH"));
 const wrapper=await fs.readFile(new URL("./public-reader-private.ps1",import.meta.url),"utf8");
 assert(wrapper.includes("-ReaderOnly 2>&1 | Select-DiagnosticProgress"));
 assert(wrapper.includes("$Mode ./source ./pack-work 2>&1 | Select-DiagnosticProgress"));
 assert(wrapper.includes("catch { $failed = $true }"));
 assert(!wrapper.includes("Write-Output $r"));
});
