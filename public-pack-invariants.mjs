// Immediate local invariants only; not a qualification or authority receipt.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
export const profilePaths = Object.freeze([
  "packages/runtime/src/native-metadata-profiles.ts",
  "packages/runtime/dist/native-metadata-profiles.js",
  "packages/runtime/dist/native-metadata-profiles.js.map",
  "packages/runtime/dist/native-metadata-profiles.d.ts.map",
]);
const identity = st => Object.fromEntries(["dev","ino","mtimeNs","ctimeNs","nlink"].map(k=>[k,String(st[k])]));
export async function snapshotTree(root, { hashFile, allowLinks=false, allowHardlinks=false }={}) {
  assert.equal(path.resolve(root),root); assert.equal(await fs.realpath(root),root);
  const start=await fs.lstat(root,{bigint:true});assert(start.isDirectory()&&!start.isSymbolicLink());
  const files=[],links=[],directories=[],identities=[],folded=new Set();
  async function visit(relative="") {
    for(const name of (await fs.readdir(path.join(root,relative))).sort()) {
      if(!relative && name===".git")continue;
      const rel=relative?relative+"/"+name:name, file=path.join(root,rel);
      assert(!folded.has(rel.toLowerCase())); folded.add(rel.toLowerCase());
      const before=await fs.lstat(file,{bigint:true});
      if(before.isSymbolicLink()) {
        assert(allowLinks);const target=path.relative(root,await fs.realpath(file));
        assert(target && !path.isAbsolute(target) && target!==".." && !target.startsWith(".."+path.sep));
        links.push({path:rel,target:target.split(path.sep).join("/")});
      } else if(before.isDirectory()) {
        assert.equal(await fs.realpath(file),file);directories.push(rel);await visit(rel);
      } else {
        assert(before.isFile());if(!allowHardlinks)assert.equal(before.nlink,1n);
        assert.equal(await fs.realpath(file),file);
        // Production supplies the existing hashFile guard, with open/fstat/read/fstat checks.
        files.push({path:rel,bytes:Number(before.size),sha256:await hashFile(file,allowHardlinks)});
      }
      assert.deepEqual(identity(await fs.lstat(file,{bigint:true})),identity(before),"Instance changed during snapshot");
      identities.push({path:rel,...identity(before)});
    }
  }
  await visit(); assert.deepEqual(identity(await fs.lstat(root,{bigint:true})),identity(start));
  for(const list of [files,links,identities])list.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  return {root:identity(start),files,links,directories:directories.sort(),identities};
}
export function assertProtectedEqual(before,after) {assert.deepEqual(after,before,"Protected instance/bytes changed");}
export function assertReaderTransition(before,after,expected) {
  assert.deepEqual(Object.keys(expected).sort(),[...profilePaths].sort());
  assert.deepEqual(after.root,before.root);assert.deepEqual(after.directories,before.directories);
  assert.deepEqual(after.links,before.links);
  assert.deepEqual(after.files.map(x=>x.path),before.files.map(x=>x.path));
  const allowed=new Set(profilePaths);
  assert.deepEqual(after.files.filter(x=>!allowed.has(x.path)),before.files.filter(x=>!allowed.has(x.path)));
  assert.deepEqual(after.identities.filter(x=>!allowed.has(x.path)),before.identities.filter(x=>!allowed.has(x.path)));
  for(const rel of profilePaths){
    const entry=after.files.find(x=>x.path===rel);assert(entry);assert.equal(entry.sha256,expected[rel]);
    const left=before.identities.find(x=>x.path===rel),right=after.identities.find(x=>x.path===rel);
    assert(left&&right);
    // The approved writer updates existing files in place, not via new aliases/instances.
    for(const key of ["dev","ino","nlink"])assert.equal(right[key],left[key]);
  }
}
export function assertCopiedProfiles(actual,expected,runtime) {
  for(const [name,key] of [["nativeMetadataProfiles","metadata"],["nativeRefreshVerificationProfiles","verification"],["nativeRefreshTransportProfiles","transport"]])
    assert.deepEqual(actual[name][0],expected[key]);
  for(const [check,n] of [
    [b=>runtime.assertNativeMetadataAdmission(b,"READ_SEAL"),expected.metadata.reservationBytes],
    [b=>runtime.assertNativeMetadataAdmission(b,"FULL_TRANSPORT"),expected.metadata.reservationBytes],
    [b=>runtime.assertNativeRefreshVerificationAdmission(b),expected.verification.reservationBytes],
    [b=>runtime.assertNativeRefreshTransportAdmission(b),expected.transport.reservationBytes],
  ]){assert.doesNotThrow(()=>check(n));assert.throws(()=>check(n-1));}
}

export async function snapshotFile(file,hashFile) {
  const before=await fs.lstat(file,{bigint:true});assert(before.isFile()&&!before.isSymbolicLink());
  const result={identity:identity(before),bytes:Number(before.size),sha256:await hashFile(file,true)};
  assert.deepEqual(identity(await fs.lstat(file,{bigint:true})),result.identity);
  return result;
}
export function assertReviewTransition(before,after,expected) {
  assertProtectedEqual(before.protected,after.protected);
  assertProtectedEqual(before.context,after.context);
  assertProtectedEqual(before.controller,after.controller);
  assertReaderTransition(before.reader,after.reader,expected);
}

export async function verifyCopiedCatalog(replay,ctx,manifest,binding) {
  const catalog=await replay.discoverRefreshReplayDependencies(ctx,manifest.generator.revision);
  await replay.verifyRefreshReplayDependencyCatalog(catalog,catalog.roots,manifest.generator.dependencies,manifest.generator.topology);
  assert.deepEqual(binding.dependencyRoots,catalog.roots,"Original binding roots changed");
  return catalog;
}
