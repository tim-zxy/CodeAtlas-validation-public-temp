import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
// Execute only the exact post-acquisition subsection against real layout helpers.
// The Native file is inert synthetic bytes; the build verifier below is a test double.
const helper=process.env.CODEATLAS_LAYOUT_HELPER;
assert(helper&&path.isAbsolute(helper));
const layouts=await import(pathToFileURL(helper).href);
const code=await fs.readFile(new URL('./retained-native-reuse.mjs',import.meta.url),'utf8');
const begin=code.indexOf(' const layout=await layouts.acquireRefreshCiLayoutAt(');
const end=code.indexOf("retainedNativePhase='LICENSE';",begin);assert(begin>=0&&end>begin);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const subsection=new AsyncFunction('layouts','original','old','source','fs','path','retainedSeed','pack',code.slice(begin,end).replace(/retainedNativePhase='[A-Z_]+';/g,''));
async function fixture(run){
 const parent=await fs.mkdtemp(path.join(os.tmpdir(),'retained-receipt-test-'));
 try{
  const old=path.join(parent,'old');await fs.mkdir(old);await fs.mkdir(path.join(old,'evidence'));
  const nativePath=path.join(old,'synthetic.exe');const native=Buffer.from('inert synthetic bytes, never executed');await fs.writeFile(nativePath,native);
  const receipt=Buffer.from('{"synthetic":true}\n');await fs.writeFile(path.join(old,'evidence/native-build.json'),receipt);
  const root=path.join(parent,'new');let gates=0;let ownerChecks=0;
  const wrapped={...layouts,refreshCiLayoutRootForRevision:revision=>{assert.equal(revision,'p05-d5-exact-layout-v10');return root;},verifyRefreshCiLayoutOwnership:async layout=>{ownerChecks++;return layouts.verifyRefreshCiLayoutOwnership(layout);}};
  const pack={verifyRefreshCiNativeBuildAt:async(layout,source)=>{gates++;assert.equal(source,'SYNTHETIC_SOURCE');assert.deepEqual(await fs.readFile(path.join(layout.evidenceRoot,'native-build.json')),receipt);assert.equal((await fs.lstat(path.join(layout.evidenceRoot,'native-build.json'))).nlink,1);}};
  const execute=()=>subsection(wrapped,{nativePath},old,'SYNTHETIC_SOURCE',fs,path,{nativeSha256:createHash('sha256').update(native).digest('hex')},pack);
  await run({root,receipt,execute,wrapped,stats:()=>({gates,ownerChecks})});
 }finally{await fs.rm(parent,{recursive:true,force:true});}
}
test('exclusive evidence creation copies unchanged receipt and retains downstream guard',()=>fixture(async({root,receipt,execute,stats})=>{
 await execute();assert.deepEqual(await fs.readFile(path.join(root,'evidence/native-build.json')),receipt);assert.equal(stats().gates,1);assert(stats().ownerChecks>=2);
}));
test('existing evidence directory is refused without adopting or overwriting it',()=>fixture(async({root,execute,wrapped,stats})=>{
 const verify=wrapped.verifyRefreshCiLayoutOwnership;let first=true;
 wrapped.verifyRefreshCiLayoutOwnership=async layout=>{const r=await verify(layout);if(first){first=false;await fs.mkdir(layout.evidenceRoot);await fs.writeFile(path.join(layout.evidenceRoot,'native-build.json'),'keep');}return r;};
 await assert.rejects(execute(),{code:'EEXIST'});assert.equal(await fs.readFile(path.join(root,'evidence/native-build.json'),'utf8'),'keep');assert.equal(stats().gates,0);
}));

test('root replacement after acquisition stops before receipt copy',()=>fixture(async({root,execute,wrapped,stats})=>{
 const verify=wrapped.verifyRefreshCiLayoutOwnership;let first=true;
 wrapped.verifyRefreshCiLayoutOwnership=async layout=>{const r=await verify(layout);if(first){first=false;await fs.rename(root,root+'-original');await fs.mkdir(root);}return r;};
 await assert.rejects(execute(),{code:'ERR_ASSERTION'});await assert.rejects(fs.lstat(path.join(root,'evidence/native-build.json')),{code:'ENOENT'});assert.equal(stats().gates,0);
}));
import {classifyRetainedNativeFailure} from './retained-native-reuse.mjs';
test('assertion phase survives without assertion values',()=>{
 let error;try{assert.equal('private actual','private expected','secret message');}catch(e){error=e;}
 assert.deepEqual(classifyRetainedNativeFailure(error,'TOOLS'),{schemaVersion:1,phase:'TOOLS',errorClass:'ASSERTION',cleanup:'NOT_ESTABLISHED'});
});
test('untrusted messages codes and phases never enter output',()=>{
 for(const value of [new Error('synthetic private token'),{code:'ghp_private',stderr:'private',stdout:'private'},null]){const result=classifyRetainedNativeFailure(value,'injected private');assert.equal(result.phase,'UNKNOWN');assert.equal(result.errorClass,'UNKNOWN');assert(!JSON.stringify(result).includes('private'));}
});
test('bounded filesystem timeout and child classifications',()=>{
 for(const [code,expected] of [['ENOENT','FILESYSTEM'],['EACCES','FILESYSTEM'],['ETIMEDOUT','TIMEOUT'],['ERR_CHILD_PROCESS_STDIO_MAXBUFFER','CHILD_PROCESS']])assert.equal(classifyRetainedNativeFailure({code,message:'private'},'ZIP_VALIDATE').errorClass,expected);
});

