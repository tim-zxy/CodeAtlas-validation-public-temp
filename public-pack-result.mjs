import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const fields=st=>Object.fromEntries(["dev","ino","size","mtimeNs","ctimeNs","nlink"].map(k=>[k,String(st[k])]));
export async function readPackManifest(zip) {
  const file=zip+".manifest.json";
  assert.equal(path.resolve(file),file);assert.equal(await fs.realpath(file),file);
  const before=await fs.lstat(file,{bigint:true});
  assert(before.isFile()&&!before.isSymbolicLink());assert.equal(before.nlink,1n);
  assert(before.size>0n&&before.size<=8000000n);
  const handle=await fs.open(file,"r");let bytes;
  try {
    assert.deepEqual(fields(await handle.stat({bigint:true})),fields(before));
    const buffer=Buffer.alloc(Number(before.size)+1);let count=0;
    while(count<buffer.length){const {bytesRead}=await handle.read(buffer,count,buffer.length-count,null);if(!bytesRead)break;count+=bytesRead;}
    assert.equal(count,Number(before.size));bytes=buffer.subarray(0,count);
    assert.deepEqual(fields(await handle.stat({bigint:true})),fields(before));
    assert.deepEqual(fields(await fs.lstat(file,{bigint:true})),fields(before));
    assert.equal(await fs.realpath(file),file);
  } finally {await handle.close();}
  const result=JSON.parse(bytes.toString("utf8"));
  assert.deepEqual(Object.keys(result).sort(),["archive","candidateSha256","holdoutSha256"]);
  assert.deepEqual(Object.keys(result.archive).sort(),["bytes","entries","sha256"]);
  assert(Number.isSafeInteger(result.archive.bytes)&&result.archive.bytes>0);
  assert(Array.isArray(result.archive.entries));
  for(const value of [result.candidateSha256,result.holdoutSha256,result.archive.sha256])assert.match(value,/^[a-f0-9]{64}$/);
  return result;
}
const kinds={AssertionError:"ASSERTION",TypeError:"TYPE",SyntaxError:"SYNTAX",RangeError:"RANGE",Error:"EXCEPTION"};
const gates={"native-refresh-ci-pack.mjs":"PACK","native-refresh-transport-memory.mjs":"TRANSPORT","native-refresh-ci.mjs":"CLI","native-refresh-transport-replay.mjs":"REPLAY"};
export function classifyPackFailure(error) {
  let gate="UNKNOWN",line=0;
  for(const frame of String(error.stack??"").split(/\r?\n/)) {
    const m=frame.match(/^\s+at .*[/\\](native-refresh-ci-pack\.mjs|native-refresh-transport-memory\.mjs|native-refresh-ci\.mjs|native-refresh-transport-replay\.mjs):([1-9][0-9]{0,3}):[0-9]{1,4}\)?$/);
    if(m){gate=gates[m[1]];line=Number(m[2]);break;}
  }
  return {kind:kinds[error.name]??"EXCEPTION",gate,line};
}
export function packFailureLines(stderr) {
  return String(stderr??"").slice(-65536).split(/\r?\n/).filter(line=>
    /^PACK_CHILD_FAILED:(ASSERTION|TYPE|SYNTAX|RANGE|EXCEPTION):(PACK|TRANSPORT|CLI|REPLAY|UNKNOWN):[0-9]{1,4}$/.test(line)).slice(-8);
}
