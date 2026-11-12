// Fixed request materialization only; hashes identify bytes, never consent.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertFixedContext} from './public-pack.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function pinnedBytes(file,expected){
 assert.match(expected,/^[a-f0-9]{64}$/);const st=fs.lstatSync(file,{bigint:true});
 assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1n);assert.equal(fs.realpathSync.native(file),file);
 const bytes=fs.readFileSync(file);assert.equal(sha(bytes),expected);return bytes;
}
export function createFixedRequest(workspace,approvalSha,coordinatorSha){
 assert.equal(fs.realpathSync.native(workspace),workspace);
 const source=path.join(workspace,'source'),work=path.join(workspace,'pack-work');assertFixedContext(source,work);
 const control=path.join(workspace,'control');assert.equal(import.meta.dirname,control);
 const approvalPath=path.join(control,'public-actual-approval.json');pinnedBytes(approvalPath,approvalSha);
 pinnedBytes(path.join(control,'public-owned-actual.mjs'),coordinatorSha);
 const command=execFileSync('where.exe',['pwsh.exe'],{encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:10000});
 const powershellPath=fs.realpathSync.native(command.trim().split(/\r?\n/)[0]);
 assert.equal(path.basename(powershellPath),'pwsh.exe');
 const request={schemaVersion:1,readerRoot:path.join(workspace,'reader-freeze/reader'),approvalPath,
  approvalSha256:approvalSha,outputRoot:path.join(workspace,'actual-output'),powershellPath};
 const bytes=Buffer.from(JSON.stringify(request)+'\n'),file=path.join(workspace,'actual-request.json');
 fs.writeFileSync(file,bytes,{flag:'wx'});return sha(bytes);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{assert.equal(process.argv.length,5);createFixedRequest(path.resolve(process.argv[2]),process.argv[3],process.argv[4]);console.log('ACTUAL_REQUEST_SEALED');}
 catch{console.error('ACTUAL_REQUEST_STOPPED');process.exitCode=1;}
}
