import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {createHash} from "node:crypto";
import {snapshotTree,assertReaderTransition,assertProtectedEqual,profilePaths,assertCopiedProfiles,verifyCopiedCatalog,assertReviewTransition} from "./public-pack-invariants.mjs";
const roots=[];test.after(async()=>{for(const root of roots)await fs.rm(root,{recursive:true,force:true});});
async function fixture(){const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),"pack-byte-proof-")));roots.push(root);for(const rel of [...profilePaths,"other.js"]){const p=path.join(root,rel);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,"old");}return root;}
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
const hashFile=async p=>digest(await fs.readFile(p));
const snap=root=>snapshotTree(root,{hashFile});
test("profile-only transition requires exact emitted bytes and leaves every other instance unchanged",async()=>{
 const root=await fixture();const before=await snap(root);const expected={};
 for(const rel of profilePaths){await fs.writeFile(path.join(root,rel),"new:"+rel);expected[rel]=digest("new:"+rel);}
 const after=await snap(root);assertReaderTransition(before,after,expected);
 for(const key of ["ino","nlink"]){const changed=structuredClone(after);changed.identities.find(x=>x.path===profilePaths[0])[key]="changed";assert.throws(()=>assertReaderTransition(before,changed,expected));}
 assert.throws(()=>assertReaderTransition(before,after,{...expected,[profilePaths[0]]:"0".repeat(64)}));
 await fs.writeFile(path.join(root,"other.js"),"altered"); const broken=await snap(root); assert.throws(()=>assertReaderTransition(before,broken,expected));
});
test("same-byte replaced file and root, links, members and directory changes refuse reuse",async()=>{
 const root=await fixture(),before=await snap(root);
 const expected=Object.fromEntries(profilePaths.map(p=>[p,digest("old")]));
 for(const field of ["root","identities","directories","links","files"]){const changed=structuredClone(before);
  if(field==="root")changed.root.ino="replacement";
  else if(field==="identities")changed.identities.find(x=>x.path==="other.js").ino="replacement";
  else changed[field].push(field==="directories"?"extra":{path:"extra"});
  assert.throws(()=>assertReaderTransition(before,changed,expected));
  assert.throws(()=>assertProtectedEqual([before],[changed]));
 }
 await fs.rename(path.join(root,"other.js"),path.join(root,"old-instance"));await fs.writeFile(path.join(root,"other.js"),"old");
 await fs.rm(path.join(root,"old-instance"));const after=await snap(root);
 assert.equal(after.files.find(x=>x.path==="other.js").sha256,before.files.find(x=>x.path==="other.js").sha256);
 assert.throws(()=>assertReaderTransition(before,after,expected));
});
test("actual copied profiles and all four admission n/n-1 boundaries are required",()=>{
 const expected={metadata:{reservationBytes:234979328},verification:{reservationBytes:431362048},transport:{reservationBytes:375701504}};
 const lists={nativeMetadataProfiles:[expected.metadata],nativeRefreshVerificationProfiles:[expected.verification],nativeRefreshTransportProfiles:[expected.transport]};
 const fn=n=>v=>{if(v<n)throw Error("limit");};
 const runtime={assertNativeMetadataAdmission:fn(234979328),assertNativeRefreshVerificationAdmission:fn(431362048),assertNativeRefreshTransportAdmission:fn(375701504)};
 assertCopiedProfiles(lists,expected,runtime);
 assert.throws(()=>assertCopiedProfiles({...lists,nativeMetadataProfiles:[{reservationBytes:1}]},expected,runtime));
 assert.throws(()=>assertCopiedProfiles(lists,expected,{...runtime,assertNativeRefreshTransportAdmission:()=>{}}));
});

test("copied graph forwards complete original catalog and topology, not just digests/counts",async()=>{
 const ctx={},roots=[{name:"repository",path:"owned-root"}],dependencies=[{path:"actual-module",sha256:"pinned"}];
 const topology={digest:"same",edges:[{from:"a",to:"b"}]};
 const manifest={generator:{revision:"fixed-v4",dependencies,topology}};
 const catalog={roots,dependencies,topology};let calls=0;
 const replay={discoverRefreshReplayDependencies:async(actual,rev)=>{assert.equal(actual,ctx);assert.equal(rev,"fixed-v4");return catalog;},
 verifyRefreshReplayDependencyCatalog:async(actual,actualRoots,expectedDeps,expectedTopology)=>{calls++;assert.equal(actual,catalog);assert.equal(actualRoots,roots);assert.deepEqual(actual.dependencies,expectedDeps);assert.deepEqual(actual.topology,expectedTopology);}};
 assert.equal(await verifyCopiedCatalog(replay,ctx,manifest,{dependencyRoots:roots}),catalog);assert.equal(calls,1);
 await assert.rejects(verifyCopiedCatalog(replay,ctx,manifest,{dependencyRoots:[{...roots[0],path:"wrong-root"}]}));
 const bad=structuredClone(manifest);bad.generator.topology.edges[0].to="different";
 await assert.rejects(verifyCopiedCatalog(replay,ctx,bad,{dependencyRoots:roots}));
});
test("transition cannot reuse evidence under changed context, controller or protected inputs",async()=>{
 const root=await fixture(),reader=await snap(root),expected=Object.fromEntries(profilePaths.map(p=>[p,digest("old")]));
 const before={reader,protected:[reader],controller:reader,context:{pid:1,nodeDigest:"fixed",timeOrigin:1}};
 assertReviewTransition(before,structuredClone(before),expected);
 for(const field of ["context","controller","protected"]){const after=structuredClone(before);after[field]={changed:true};assert.throws(()=>assertReviewTransition(before,after,expected));}
});

test("evidence rejects hardlinks; existing reader hardlinks remain instance/byte checked",async()=>{
 const root=await fixture();await fs.link(path.join(root,"other.js"),path.join(root,"alias.js"));
 await assert.rejects(snap(root));
 const options={hashFile,allowHardlinks:true,allowLinks:true};
 const before=await snapshotTree(root,options),expected=Object.fromEntries(profilePaths.map(p=>[p,digest("old")]));
 assertReaderTransition(before,await snapshotTree(root,options),expected);
 await fs.writeFile(path.join(root,"alias.js"),"changed through existing alias");
 const after=await snapshotTree(root,options);
 assert.throws(()=>assertReaderTransition(before,after,expected));
});
