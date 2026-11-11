import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {execFileSync,spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {readPackManifest,classifyPackFailure,packFailureLines} from "./public-pack-result.mjs";
const roots=[];test.after(async()=>{for(const p of roots)await fs.rm(p,{recursive:true,force:true});});
async function owner(){const p=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),"pack-result-only-")));roots.push(p);return p;}
const h="a".repeat(64), value={archive:{entries:[],bytes:1,sha256:h},candidateSha256:h,holdoutSha256:h};
test("successful silent CLI is consumed through its original exclusive sidecar",async()=>{
 const root=await owner(),zip=path.join(root,"owned-result.zip");
 const script="const fs=require('node:fs');fs.writeFileSync(process.argv[1], 'x',{flag:'wx'});fs.writeFileSync(process.argv[1]+'.manifest.json',process.argv[2],{flag:'wx'});";
 const stdout=execFileSync(process.execPath,["-e",script,zip,JSON.stringify(value)],{encoding:"utf8"});
 assert.equal(stdout,"");assert.deepEqual(await readPackManifest(zip),value);
});
test("missing, malformed, unknown fields and hardlinked sidecars refuse",async()=>{
 const root=await owner(),zip=path.join(root,"result.zip"),manifest=zip+".manifest.json";
 await assert.rejects(readPackManifest(zip));
 for(const bytes of ["", "{",JSON.stringify({...value,extra:true}),JSON.stringify({...value,archive:{...value.archive,bytes:-1}})]){
  await fs.writeFile(manifest,bytes);await assert.rejects(readPackManifest(zip));
 }
 await fs.writeFile(manifest,JSON.stringify(value));await fs.link(manifest,path.join(root,"alias"));
 await assert.rejects(readPackManifest(zip));
});
test("error classification and forwarding never reveal raw stack or message",()=>{
 const e=Object.assign(new Error("PRIVATE_SENTINEL"),{name:"AssertionError",stack:"AssertionError: PRIVATE_SENTINEL\n    at createRefreshCiPack (file:///private/source/scripts/helpers/native-refresh-ci-pack.mjs:645:10)"});
 const result=classifyPackFailure(e);assert.deepEqual(result,{kind:"ASSERTION",gate:"PACK",line:645});
 const line=`PACK_CHILD_FAILED:${result.kind}:${result.gate}:${result.line}`;
 assert.deepEqual(packFailureLines(Buffer.from("private/path\n"+line+"\nPACK_CHILD_FAILED:PRIVATE:UNKNOWN:0\n")),[line]);
 assert(!JSON.stringify(result).includes("PRIVATE_SENTINEL"));
});

test("entry wrapper calls supported API once, preserves silent success and redacts a thrown failure",async()=>{
 const root=await owner(),source=path.join(root,"source"),zip=path.join(root,"out.zip");
 await fs.mkdir(path.join(source,"scripts"),{recursive:true});
 const module=path.join(source,"scripts/native-refresh-ci.mjs");
 const body=`import fs from 'node:fs';export async function runRefreshCi(args){fs.writeFileSync(args[3]+'.calls','1',{flag:'wx'});fs.writeFileSync(args[3],'x',{flag:'wx'});fs.writeFileSync(args[3]+'.manifest.json',${JSON.stringify(JSON.stringify(value))},{flag:'wx'});}`;
 await fs.writeFile(module,body);
 const entry=fileURLToPath(new URL("./public-pack-create.mjs",import.meta.url));
 const options={encoding:"utf8",env:{...process.env,GH_TOKEN:"",GITHUB_TOKEN:""},windowsHide:true};
 const r=spawnSync(process.execPath,[entry,source,"pack","candidate","holdout",zip,"p05-d5-exact-layout-v10"],options);
 assert.equal(r.status,0);assert.equal(r.stdout,"");assert.equal(r.stderr,"");
 assert.equal(await fs.readFile(zip+'.calls','utf8'),'1');assert.deepEqual(await readPackManifest(zip),value);
 await fs.writeFile(module,"import assert from 'node:assert/strict';export async function runRefreshCi(){assert.fail('PRIVATE_SENTINEL');}");
 const failed=spawnSync(process.execPath,[entry,source,"pack","candidate","holdout",path.join(root,"other.zip"),"p05-d5-exact-layout-v10"],options);
 assert.equal(failed.status,1);assert.match(failed.stderr.trim(),/^PACK_CHILD_FAILED:ASSERTION:CLI:[0-9]{1,4}$/);
 assert(!failed.stderr.includes('PRIVATE_SENTINEL'));assert.equal(failed.stdout,"");
});
