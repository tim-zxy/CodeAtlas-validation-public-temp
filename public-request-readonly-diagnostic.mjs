// Metadata/checkout diagnostic only. Never materializes a request or calls actual.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFixedRequestInputs,requestDiagnosticStage} from './public-owned-actual-request.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const original='b49abc015d12bbe36757d147909782919204d657';
const pins=[['APPROVAL','public-actual-approval.json','ef38e6dc8eb629d399cbba30784db964730b4eaa103b84c0d2643b5c9c42ded7'],
 ['COORDINATOR','public-owned-actual.mjs','bc4f9e55d8bcac917fd78cf735f39246c3f2b8582b8f01d4491b5ea670422efd']];
function git(root,...args){return execFileSync('git',args,{cwd:root,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'},windowsHide:true,timeout:10000,maxBuffer:3_000_000});}
function absent(file){assert.throws(()=>fs.lstatSync(file),e=>e.code==='ENOENT','Protected target must remain absent');}
function raw(file){const s=fs.lstatSync(file);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1);return fs.readFileSync(file);}
let phase='CONTEXT';
try{
 assert.equal(process.argv.length,2);assert.equal(process.env.GITHUB_REPOSITORY,'tim-zxy/CodeAtlas-validation-public-temp');
 assert.equal(process.env.GITHUB_RUN_ATTEMPT,'1');assert.equal(process.env.ImageVersion,'20261103.298.1');
 const control=import.meta.dirname,workspace=path.dirname(control),old=path.join(workspace,'old-control');
 assert.equal(git(old,'rev-parse','HEAD').toString().trim(),original);
 assert.equal(git(control,'rev-parse','HEAD').toString().trim(),process.env.GITHUB_SHA);
 const protectedTargets=[path.resolve('C:/CodeAtlas-P05-D5-R10'),path.join(workspace,'reader-freeze'),path.join(workspace,'actual-output'),path.join(workspace,'actual-request.json'),path.join(workspace,'actual-request-diagnostic.json')];
 protectedTargets.forEach(absent);
 phase='CHECKOUT_BYTES';
 const observations=[];
 for(const[label,name,expected]of pins){
  const oldBlob=git(old,'show','HEAD:'+name),fixedBlob=git(control,'show','HEAD:'+name);
  assert.equal(sha(oldBlob),expected);assert.equal(sha(fixedBlob),expected);
  const oldBytes=raw(path.join(old,name)),fixedBytes=raw(path.join(control,name));
  const converted=Buffer.from(oldBlob.toString('utf8').replace(/\r?\n/g,'\r\n'));
  assert.equal(sha(fixedBytes),expected,'Fixed checkout bytes differ');
  observations.push({role:label,expectedSha256:expected,oldCheckoutSha256:sha(oldBytes),fixedCheckoutSha256:sha(fixedBytes),
   oldMatchesPin:sha(oldBytes)===expected,oldMatchesCrlfConversion:sha(oldBytes)===sha(converted),fixedMatchesPin:true});
 }
 const config=spawnSync('git',['config','--get','core.autocrlf'],{cwd:old,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'},encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:1000});
 assert([0,1].includes(config.status));const cfg=config.status===1?'UNSET':config.stdout.trim();
 assert(['true','false','input','UNSET'].includes(cfg));
 console.log(JSON.stringify({schemaVersion:1,state:'CHECKOUT_BYTES_OBSERVED',sourceCommit:'79da40105d480cce540ac636334dd9b6d3f54956',controlCommit:process.env.GITHUB_SHA,oldControlCommit:original,autocrlf:cfg,observations}));
 phase='FIXED_REQUEST_INPUTS';
 const request=readFixedRequestInputs(workspace,pins[0][2],pins[1][2]);
 assert.equal(request.readerRoot,path.join(workspace,'reader-freeze/reader'));assert.equal(request.outputRoot,path.join(workspace,'actual-output'));
 protectedTargets.forEach(absent);
 console.log(JSON.stringify({schemaVersion:1,state:'REQUEST_READONLY_DIAGNOSTIC_PASSED',controlCommit:process.env.GITHUB_SHA,
  requestInputs:'VALIDATED_WITH_PRODUCTION_FUNCTION',requestWritten:false,readerConstructed:false,actual22:'NOT_ATTEMPTED',native:'NOT_STARTED',pack:'NOT_ATTEMPTED',upload:'NOT_ATTEMPTED',protectedTargetsAbsent:true}));
}catch(error){
 const inputStage=requestDiagnosticStage();assert(['CONTEXT','APPROVAL','COORDINATOR','POWERSHELL','WRITE'].includes(inputStage));
 console.error('REQUEST_READONLY_DIAGNOSTIC_STOPPED:'+phase+':'+inputStage);
 process.exitCode=1;
}
