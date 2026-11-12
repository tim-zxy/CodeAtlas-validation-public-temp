// Seed-only reader construction: never acquires the actual installer layout.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath,pathToFileURL} from "node:url";
import {extract,makePublicProfiles,assertFixedContext} from "./public-pack.mjs";
import {cloneClosedReader} from "./public-reader-freeze.mjs";
import {verifySeed,sha,sourceCommit} from "./public-seed.mjs";
import {retainedSeed} from "./retained-seed.mjs";
import {snapshotTree,assertProtectedEqual,assertReaderTransition} from "./public-pack-invariants.mjs";
import {createProgress} from "./public-pack-progress.mjs";
const pins=JSON.parse(await fs.readFile(new URL("./public-pack-pins.json",import.meta.url),"utf8"));
export const expectedReaderSha256="e15e1bcd6ce9aa1897554b0fbcd3de67ab40ef11f886c71c44a5a8ac1543f8c4";
export const expectedProfilesSha256="9b2716123d15227808c35fe9dd24eb5393131192aca9aaa0f1d83a90db3077f4";
const content=({files,links,directories})=>({files,links,directories});
const save=(file,value)=>fs.writeFile(file,JSON.stringify(value)+"\n",{flag:"wx"});
const imp=(root,p)=>import(pathToFileURL(path.join(root,p)).href);
export async function assertActualTargetAbsent(target=path.resolve(pins.logicalRoot)) {
 await assert.rejects(fs.lstat(target),{code:"ENOENT"},"Actual installer target must remain absent");
}
export function assertPinnedMember(bytes,pin) {
 assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);return JSON.parse(bytes);
}
export function assertProfileIdentity(profiles) {
 assert.equal(sha(Buffer.from(JSON.stringify(profiles)+"\n")),expectedProfilesSha256,"Unreviewed profile object");
}
export function staticReaderState(observed) {
 assert.match(observed,/^[a-f0-9]{64}$/);
 return observed===expectedReaderSha256?"READER_SEED_STATIC_PIN_MATCH_NOT_QUALIFIED":"READER_SEED_STATIC_PIN_MISMATCH_NOT_QUALIFIED";
}
async function readMember(work,assetName,member,generic) {
 const a=pins.assets.find(x=>x.name===assetName);assert(a);
 const file=path.join(work,"downloads",assetName);
 assert.equal((await fs.lstat(file)).size,a.bytes);assert.equal(generic.hashFile(file),a.sha256);
 const pin=pins.inputPins[assetName+":"+member];assert(pin&&pin.bytes<4000000);
 const bytes=execFileSync(path.join(process.env.SystemRoot,"System32/tar.exe"),["-xOf",file,"--",member],
  {windowsHide:true,timeout:30000,maxBuffer:pin.bytes+1});
 return assertPinnedMember(bytes,pin);
}
async function primaryTools() {
 assert.equal(process.env.ImageVersion,"20261103.298.1");
 assert.equal(sha(await fs.readFile(process.execPath)),"3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5");
 const result=execFileSync("where.exe",["pwsh.exe"],{encoding:"utf8",windowsHide:true,timeout:10000,maxBuffer:10000});
 const pwsh=result.trim().split(/\r?\n/)[0];assert(path.isAbsolute(pwsh));
 assert.equal(sha(await fs.readFile(pwsh)),"2a6769a3330dc1084d0154bfde7d164ab750ca7f700f313f9d417c1be78b2233");
 assert.equal(sha(await fs.readFile(path.join(process.env.SystemRoot,"System32/tar.exe"))),"a8c4b61db4c2908930be3984d80b4a921f75290c958adc62565da8a455b1230c");
}
export async function bootstrapSeedReader(source,work) {
 assertFixedContext(source,work);assert(!process.env.GH_TOKEN&&!process.env.GITHUB_TOKEN);
 await assertActualTargetAbsent();await primaryTools();
 const progress=createProgress("PARENT");
 progress.enter("EXTRACT_FIXED_INPUTS");
 const seed=await extract(source,work,pins.assets[0],true);
 progress.enter("SEED_VERIFY");
 await verifySeed(source,seed.root,retainedSeed.manifestSha256,retainedSeed.producerCommit);
 progress.enter("INPUT_PIN_VERIFY");
 const helper=path.join(source,".github/qualification/r11-staged-pack.mjs");
 assert.equal(sha(await fs.readFile(helper)),"0d8f8fca213c44295964335c6a210076f580aaf04c75e11af106ad91121ccd16");
 const generic=await imp(source,".github/qualification/r11-staged-pack.mjs");
 const paired=await readMember(work,"READ_FULL162-evidence.zip","stage/paired/candidate.json",generic);
 const full=await readMember(work,"READ_FULL162-evidence.zip","stage/paired/full.json",generic);
 const verification=await readMember(work,"VERIFY90-evidence.zip","stage/verify/candidate.json",generic);
 const transport=await readMember(work,"TRANSPORT154-evidence.zip","transport/candidate.json",generic);
 const profiles=makePublicProfiles({paired,verification,transport,fullPeak:Math.max(...full.observations.map(r=>r.peakResidentBytes))});
 assertProfileIdentity(profiles);
 const snap=()=>snapshotTree(source,{hashFile:generic.hashFile,allowLinks:true,allowHardlinks:true});
 const before=await snap(),seedBefore=await generic.inventoryTree(seed.root);
 const controlBefore=await snapshotTree(import.meta.dirname,{hashFile:generic.hashFile,allowLinks:true,allowHardlinks:true});
 await save(path.join(work,"proposed-adopted-profiles.json"),profiles);
 progress.enter("CATALOG_EMIT");
 const file=path.join(source,"packages/runtime/src/native-metadata-profiles.ts");
 const text=generic.insertProfileEntries(await fs.readFile(file,"utf8"),profiles);
 const expected={"packages/runtime/src/native-metadata-profiles.ts":sha(Buffer.from(text))};
 await fs.writeFile(file,text);
 const emitted=await generic.emitCatalog(source,path.join(work,"catalog-build"));
 for(const[name,bytes]of emitted)if(name!=="native-metadata-profiles.d.ts"){
  const relative="packages/runtime/dist/"+name;expected[relative]=sha(Buffer.from(bytes));await fs.writeFile(path.join(source,relative),bytes);
 }
 const after=await snap();generic.assertReaderDelta(before.files,after.files);assertReaderTransition(before,after,expected);
 progress.enter("RECHECK_SEED");
 await verifySeed(source,seed.root,retainedSeed.manifestSha256,retainedSeed.producerCommit);
 generic.assertExactInventory(seedBefore,await generic.inventoryTree(seed.root));
 const output=path.join(path.dirname(source),"reader-freeze");await generic.createOwnedDirectory(output);
 const reader=path.join(output,"reader"),inventory=await cloneClosedReader(source,reader,after,generic);
 assertProtectedEqual(after,await snap());
 progress.enter("FINAL_READER_VERIFY");
 await verifySeed(reader,seed.root,retainedSeed.manifestSha256,retainedSeed.producerCommit);
 const runtime=await imp(reader,"packages/runtime/dist/native-metadata-admission.js");
 const actual=await imp(reader,"packages/runtime/dist/native-metadata-profiles.js");
 const {assertCopiedProfiles}=await import("./public-pack-invariants.mjs");assertCopiedProfiles(actual,profiles,runtime);
 generic.assertExactInventory(inventory,await generic.inventoryTree(reader,{allowLinks:true}));
 generic.assertExactInventory(seedBefore,await generic.inventoryTree(seed.root));
 assertProtectedEqual(after,await snap());
 assertProtectedEqual(controlBefore,await snapshotTree(import.meta.dirname,{hashFile:generic.hashFile,allowLinks:true,allowHardlinks:true}));
 await assertActualTargetAbsent();
 for(const name of ["pack-attempt.json","upload-attempt.json","pack-ready.json","output"])
  await assert.rejects(fs.lstat(path.join(work,name)),{code:"ENOENT"});
 const raw=content(inventory),bytes=Buffer.from(JSON.stringify(raw)),observed=sha(bytes);
 await fs.writeFile(path.join(output,"reader-inventory.json"),bytes,{flag:"wx"});
 const catalog=JSON.parse(await fs.readFile(path.join(seed.root,"evidence/reader-catalog.json"),"utf8"));
 const result={schemaVersion:1,state:staticReaderState(observed),sourceCommit,controlCommit:process.env.GITHUB_SHA,
  readerContentSha256:observed,expectedReaderSha256,profileObjectSha256:expectedProfilesSha256,
  topologyDigest:catalog.topology.digest,dependencyEntries:catalog.dependencies.length,
  files:raw.files.length,links:raw.links.length,directories:raw.directories.length,cases:0,
  logicalLayoutAbsent:true,actual22:"NOT_ATTEMPTED",pack:"NOT_ATTEMPTED",upload:"NOT_ATTEMPTED",
  retention:"RUNNER_LOCAL_ONLY_NOT_A_REUSABLE_RETAINED_BUNDLE",historicalWholeTreeEquality:"NOT_CLAIMED"};
 await save(path.join(output,"result.json"),result);progress.enter("COMPLETE");progress.finish();
 assert.equal(observed,expectedReaderSha256,"Complete reader differs from externally fixed pin");
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 try{const[mode,a,b]=process.argv.slice(2);assert.equal(mode,"seed");assert.equal(process.argv.length,5);await bootstrapSeedReader(path.resolve(a),path.resolve(b));}
 catch{console.error("READER_SEED_STOPPED_NOT_QUALIFIED_NO_RETRY");process.exitCode=1;}
}
