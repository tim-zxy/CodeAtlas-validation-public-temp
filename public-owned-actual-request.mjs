// Fixed request materialization only; hashes identify bytes, never consent.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertFixedContext} from './public-pack.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
let stage='CONTEXT',diagnosticRoot;
export function pinnedBytes(file,expected){
 assert.match(expected,/^[a-f0-9]{64}$/);const st=fs.lstatSync(file,{bigint:true});
 assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1n);assert.equal(fs.realpathSync.native(file),file);
 const bytes=fs.readFileSync(file);assert.equal(sha(bytes),expected);return bytes;
}
export function requestDiagnosticStage(){return stage;}
export function readFixedRequestInputs(workspace,approvalSha,coordinatorSha){
 assert.equal(fs.realpathSync.native(workspace),workspace);
 const source=path.join(workspace,'source'),work=path.join(workspace,'pack-work');assertFixedContext(source,work);
 diagnosticRoot=workspace;
 const control=path.join(workspace,'control');assert.equal(import.meta.dirname,control);
 const approvalPath=path.join(control,'public-actual-approval.json');stage='APPROVAL';pinnedBytes(approvalPath,approvalSha);
 stage='COORDINATOR';pinnedBytes(path.join(control,'public-owned-actual.mjs'),coordinatorSha);
 stage='POWERSHELL';
 const command=execFileSync('where.exe',['pwsh.exe'],{encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:10000});
 const powershellPath=fs.realpathSync.native(command.trim().split(/\r?\n/)[0]);
 assert.equal(path.basename(powershellPath),'pwsh.exe');
 return {schemaVersion:1,readerRoot:path.join(workspace,'reader-freeze/reader'),approvalPath,
  approvalSha256:approvalSha,outputRoot:path.join(workspace,'actual-output'),powershellPath};
}
export function createFixedRequest(workspace,approvalSha,coordinatorSha){
 const request=readFixedRequestInputs(workspace,approvalSha,coordinatorSha);
 const bytes=Buffer.from(JSON.stringify(request)+'\n'),file=path.join(workspace,'actual-request.json');
 stage='WRITE';
 fs.writeFileSync(file,bytes,{flag:'wx'});return sha(bytes);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{assert.equal(process.argv.length,5);createFixedRequest(path.resolve(process.argv[2]),process.argv[3],process.argv[4]);console.log('ACTUAL_REQUEST_SEALED');}
 catch(error){
  if(diagnosticRoot)try{fs.writeFileSync(path.join(diagnosticRoot,'actual-request-diagnostic.json'),JSON.stringify({
   schemaVersion:1,state:'REQUEST_STOPPED',stage,
   code:['ERR_ASSERTION','ENOENT','EEXIST','EPERM','EACCES','ETIMEDOUT'].includes(error.code)?error.code:'REQUEST_GUARD_FAILED',
  })+'\n',{flag:'wx'});}catch{}
  console.error('ACTUAL_REQUEST_STOPPED');process.exitCode=1;
 }
}
