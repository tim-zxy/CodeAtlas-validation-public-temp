import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { diagnose } from "./public-pack-diagnose.mjs";
const roots=[];
test.after(async()=>{for(const p of roots)await fs.rm(p,{recursive:true,force:true});});
async function root(){const p=await fs.mkdtemp(path.join(os.tmpdir(),"pack-diagnose-test-"));roots.push(p);return p;}
test("diagnostic ends after one prepare and creates only its exclusive diagnostic receipt", async()=>{
  const p=await root();let calls=0;
  const r=await diagnose("owned-source",p,{validate:(s,w)=>{assert.equal(s,"owned-source");assert.equal(w,p);},prepare:async()=>{calls++;return {mustNotBeConsumedForAdoption:true};}});
  assert.equal(calls,1); assert.equal(r.packCreateCount,0); assert.equal(r.candidateAdopted,false);
  assert.deepEqual(await fs.readdir(p),["diagnostic-result.json"]);
});
test("failed preparation never proceeds; forbidden prior outputs are rejected",async()=>{
  const p=await root();await assert.rejects(diagnose("unused",p,{validate:()=>{},prepare:async()=>{throw Error("stop");}}));
  assert.deepEqual(await fs.readdir(p),[]);
  for(const name of ["proposed-adopted-profiles.json","catalog-build","pack-attempt.json","output"]){
    const p=await root();await fs.writeFile(path.join(p,name),"old evidence");
    await assert.rejects(diagnose("unused",p,{validate:()=>{},prepare:async()=>{}}));
    assert.equal(await fs.readFile(path.join(p,name),"utf8"),"old evidence");
    assert.deepEqual(await fs.readdir(p),[name]);
  }
});
test("shared preparation has no adoption or ZIP-create call path",async()=>{
  const source=await fs.readFile(new URL("./public-pack.mjs",import.meta.url),"utf8");
  const prepare=source.slice(source.indexOf("export async function prepareReview"),source.indexOf("export function assertFixedContext"));
  for(const forbidden of ["makePublicProfiles", "insertProfileEntries", "emitCatalog", "pack-attempt.json", "ONCE_ORIGINAL_PACK", 'originalZip(source, "Create"'])assert(!prepare.includes(forbidden));
});
