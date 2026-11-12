// Reader-only closure construction. Never calls PACK, collect, build Native or publish.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {prepareReview,makePublicProfiles,readRole,assertFixedContext} from "./public-pack.mjs";
import {verifySeed,sha,sourceCommit,repository} from "./public-seed.mjs";
import {retainedSeed} from "./retained-seed.mjs";
import {snapshotTree,snapshotFile,assertProtectedEqual,assertReviewTransition} from "./public-pack-invariants.mjs";
import {runProgressChild} from "./public-pack-progress.mjs";
const pins=JSON.parse(await fs.readFile(new URL("./public-pack-pins.json",import.meta.url),"utf8"));
const imp=(root,p)=>import(pathToFileURL(path.join(root,p)).href);
const content=({files,links,directories})=>({files,links,directories});
const save=(file,value)=>fs.writeFile(file,JSON.stringify(value)+"\n",{flag:"wx"});
function clean(root,p) {
 assert(typeof p==="string"&&p&&!p.includes("\\")&&!p.split("/").some(x=>!x||x==="."||x===".."||/[<>:\"|?*\x00-\x1f]/.test(x)||/[. ]$/.test(x)||/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(x)));
 const file=path.resolve(root,...p.split("/"));assert(file.startsWith(root+path.sep));return file;
}
export async function cloneClosedReader(source,destination,expected,generic) {
 assert.equal(path.resolve(destination),destination);generic.assertSeparateRoots(source,destination);
 const raw=content(expected);const names=[...raw.files.map(x=>x.path),...raw.links.map(x=>x.path),...raw.directories];
 assert.equal(new Set(names.map(x=>x.toLowerCase())).size,names.length);
 for(const name of names)clean(destination,name);
 await generic.createOwnedDirectory(destination);
 for(const dir of raw.directories)await fs.mkdir(clean(destination,dir));
 for(const item of raw.files) {
  assert.equal(await generic.hashFile(clean(source,item.path),true),item.sha256);
  await fs.copyFile(clean(source,item.path),clean(destination,item.path),1);
  assert.equal(await generic.hashFile(clean(destination,item.path)),item.sha256);
 }
 for(const item of raw.links)await fs.symlink(clean(destination,item.target),clean(destination,item.path),"junction");
 const actual=await generic.inventoryTree(destination,{allowLinks:true});
 assert.deepEqual(content(actual),raw,"Closed reader bytes/topology differ");
 return actual;
}
async function boundary(source,roots,generic) {
 const protectedInputs=[];
 for(const root of roots)protectedInputs.push(await snapshotTree(root,{hashFile:generic.hashFile}));
 return {protected:protectedInputs,
  reader:await snapshotTree(source,{hashFile:generic.hashFile,allowLinks:true,allowHardlinks:true}),
  controller:await snapshotTree(import.meta.dirname,{hashFile:generic.hashFile,allowLinks:true,allowHardlinks:true}),
  context:{pid:process.pid,timeOrigin:performance.timeOrigin,execPath:process.execPath,
   node:await snapshotFile(process.execPath,generic.hashFile),versions:{...process.versions},
   sourceCommit,controlCommit:process.env.GITHUB_SHA,nodeOptions:process.env.NODE_OPTIONS??null,nodePath:process.env.NODE_PATH??null}};
}
export function validateReaderRelease(release) {
 assert.equal(release.id,441241421);assert.equal(release.draft,false);assert.equal(release.prerelease,true);
 assert.equal(release.tag_name,"build-seed-"+retainedSeed.archiveSha256);
 for(const pin of pins.assets) {
  const matches=release.assets.filter(a=>a.id===pin.id);assert.equal(matches.length,1);
  const asset=matches[0];assert.equal(asset.name,pin.name);assert.equal(asset.state,"uploaded");assert.equal(asset.size,pin.bytes);
  if(asset.digest)assert.equal(asset.digest,"sha256:"+pin.sha256);
 }
}
export async function fetchReaderInputs(source,work) {
 assertFixedContext(source,work);assert(process.env.GH_TOKEN);
 const response=await fetch("https://api.github.com/repos/"+repository+"/releases/"+retainedSeed.releaseId,
  {headers:{Authorization:"Bearer "+process.env.GH_TOKEN},signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200);const release=await response.json();
 validateReaderRelease(release);
 await fs.mkdir(path.join(work,"downloads"));
 for(const pin of pins.assets) {
  const asset=release.assets.find(a=>a.id===pin.id);assert(asset);
  assert.equal(asset.name,pin.name);assert.equal(asset.state,"uploaded");assert.equal(asset.size,pin.bytes);
  if(asset.digest)assert.equal(asset.digest,"sha256:"+pin.sha256);
  const request=await fetch("https://api.github.com/repos/"+repository+"/releases/assets/"+pin.id,
   {headers:{Authorization:"Bearer "+process.env.GH_TOKEN,Accept:"application/octet-stream"},signal:AbortSignal.timeout(120000)});
  assert.equal(request.status,200);
  const handle=await fs.open(path.join(work,"downloads",pin.name),"wx");let count=0;
  const {createHash}=await import("node:crypto");const hash=createHash("sha256");
  try {for await(const chunk of request.body){count+=chunk.length;assert(count<=pin.bytes);hash.update(chunk);await handle.writeFile(chunk);}}
  finally {await handle.close();}
  assert.equal(count,pin.bytes);assert.equal(hash.digest("hex"),pin.sha256);
 }
 await save(path.join(work,"fetched.json"),{controlCommit:process.env.GITHUB_SHA,assets:pins.assets});
 console.log("READER_INPUTS_VERIFIED");
}
export async function freezeReader(source,work) {
 assertFixedContext(source,work);assert(!process.env.GH_TOKEN&&!process.env.GITHUB_TOKEN);
 const output=path.join(path.dirname(source),"reader-freeze");
 const {checked,seed,before,generic,boundary:original,protectedRoots}=await prepareReview(source,work);
 const profiles=makePublicProfiles(checked.data);await save(path.join(work,"proposed-adopted-profiles.json"),profiles);
 const profileSource=path.join(source,"packages/runtime/src/native-metadata-profiles.ts");
 const profileText=generic.insertProfileEntries(await fs.readFile(profileSource,"utf8"),profiles);
 const expected={"packages/runtime/src/native-metadata-profiles.ts":sha(Buffer.from(profileText))};
 await fs.writeFile(profileSource,profileText);
 const emitted=await generic.emitCatalog(source,path.join(work,"catalog-build"));
 for(const [name,text]of emitted)if(name!=="native-metadata-profiles.d.ts"){
  const relative="packages/runtime/dist/"+name;expected[relative]=sha(Buffer.from(text));
  await fs.writeFile(path.join(source,relative),text);
 }
 const adopted=await boundary(source,protectedRoots,generic);
 generic.assertReaderDelta(before.files,adopted.reader.files);
 assertReviewTransition(original,adopted,expected);
 await verifySeed(source,seed.root,retainedSeed.manifestSha256,retainedSeed.producerCommit);
 const copied=await readRole(source,work,undefined,"catalog-binding");
 assert.equal(copied.state,"COPIED_CATALOG_AND_BINDING_VERIFIED");
 assert.deepEqual(copied.audit,{subprocess:0,mutation:0,network:0});
 assert.deepEqual(copied.data.profiles,profiles);
 assertProtectedEqual(adopted,await boundary(source,protectedRoots,generic));
 await generic.createOwnedDirectory(output);
 const closed=path.join(output,"reader");
 const initial=await cloneClosedReader(source,closed,adopted.reader,generic);
 assertProtectedEqual(adopted,await boundary(source,protectedRoots,generic));
 await verifySeed(closed,seed.root,retainedSeed.manifestSha256,retainedSeed.producerCommit);
 const layouts=await imp(closed,"scripts/helpers/native-refresh-ci-layout.mjs");
 const replay=await imp(closed,"packages/runtime/test/helpers/native-refresh-transport-replay.mjs");
 const layout=await layouts.readRefreshCiPackLayoutAt(path.resolve(pins.logicalRoot));
 const ctx=layouts.refreshCiFixtureContext(layout);
 const catalog=await replay.discoverRefreshReplayDependencies(ctx,"p05-refresh-replay-v4");
 const manifest=JSON.parse(await fs.readFile(path.join(pins.logicalRoot,"evidence/corpus/artifacts/manifest.json"),"utf8"));
 const binding=JSON.parse(await fs.readFile(path.join(pins.logicalRoot,"evidence/corpus/local-binding.json"),"utf8"));
 await replay.verifyRefreshReplayDependencyCatalog(catalog,catalog.roots,manifest.generator.dependencies,manifest.generator.topology);
 const rebound={...binding,dependencyRoots:catalog.roots};generic.assertReboundBinding(binding,rebound,catalog.roots);
 const bindingPath=path.join(output,"reader-binding.json");
 await fs.writeFile(bindingPath,replay.encodeRefreshReplayJson(rebound),{flag:"wx"});
 const response=await runProgressChild(process.execPath,[path.join(import.meta.dirname,"public-closed-reader.mjs"),closed,work,bindingPath],
  {env:{...process.env,GH_TOKEN:"",GITHUB_TOKEN:""},timeoutMs:300000,maxBuffer:1000000});
 const result=JSON.parse(response);
 assert.equal(result.state,"CLOSED_READER_AND_BINDING_VERIFIED");assert.deepEqual(result.audit,{subprocess:0,mutation:0,network:0});
 assert.equal(result.cases,22);assert.equal(result.topologyDigest,manifest.generator.topology.digest);
 generic.assertExactInventory(initial,await generic.inventoryTree(closed,{allowLinks:true}));
 assertProtectedEqual(adopted,await boundary(source,protectedRoots,generic));
 for(const name of ["pack-attempt.json","upload-attempt.json","pack-ready.json","output"]) {
  await assert.rejects(fs.lstat(path.join(work,name)),{code:"ENOENT"});
 }
 const raw=content(initial);const bytes=Buffer.from(JSON.stringify(raw));
 const manifestPath=path.join(output,"reader-inventory.json");
 await fs.writeFile(manifestPath,bytes,{flag:"wx"});
 const receipt={schemaVersion:1,state:"READER_CLOSURE_VERIFIED_NOT_QUALIFIED",
  sourceCommit,controlCommit:process.env.GITHUB_SHA,readerContentSha256:sha(bytes),
  profileObjectSha256:sha(Buffer.from(JSON.stringify(profiles)+"\n")),profileFiles:expected,
  files:raw.files.length,links:raw.links.length,directories:raw.directories.length,
  topologyDigest:result.topologyDigest,dependencyEntries:result.dependencyEntries,
  cases:22,actual22:"NOT_ATTEMPTED",pack:"NOT_ATTEMPTED",upload:"NOT_ATTEMPTED",
  retention:"RUNNER_LOCAL_ONLY_NOT_A_REUSABLE_RETAINED_BUNDLE",historicalWholeTreeEquality:"NOT_CLAIMED"};
 await save(path.join(output,"result.json"),receipt);
 console.log(JSON.stringify(receipt));return receipt;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 try{
  const [mode,a,b]=process.argv.slice(2);assert.equal(process.argv.length,5);assert(["fetch","freeze"].includes(mode));
  await (mode==="fetch"?fetchReaderInputs:freezeReader)(path.resolve(a),path.resolve(b));
 }catch{console.error("READER_FREEZE_STOPPED_NOT_QUALIFIED_NO_RETRY");process.exitCode=1;}
}
