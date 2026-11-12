import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFixedRequestInputs} from './public-owned-actual-request.mjs';
test('readonly input validation rejects foreign context without materializing a request',()=>{
 assert.throws(()=>readFixedRequestInputs('NOT_A_CANONICAL_WORKSPACE','a'.repeat(64),'b'.repeat(64)));
});
test('diagnostic CLI fails closed and emits no raw path or assertion payload',()=>{
 const env={...process.env,GITHUB_REPOSITORY:'UNAPPROVED',GITHUB_RUN_ATTEMPT:'1'};
 const child=spawnSync(process.execPath,[fileURLToPath(new URL('./public-request-readonly-diagnostic.mjs',import.meta.url))],{env,encoding:'utf8',windowsHide:true,timeout:10000});
 assert.equal(child.status,1);assert.equal(child.stdout,'');assert.equal(child.stderr.trim(),'REQUEST_READONLY_DIAGNOSTIC_STOPPED:CONTEXT:CONTEXT');
});
test('diagnostic workflow performs no build, dependency install, request write, archive access or actual execution',async()=>{
 const wf=await fs.readFile(new URL('./.github/workflows/public-request-readonly-diagnostic.yml',import.meta.url),'utf8');
 assert(wf.includes('workflow_dispatch: null')&&wf.includes('contents: read')&&wf.includes('timeout-minutes: 10'));
 assert(!/contents: write|upload-artifact|\.mjs collect|public-owned-actual-entry|public-owned-actual-private|pnpm|cargo|public-reader-private|release upload/.test(wf));
 assert(wf.includes('b49abc015d12bbe36757d147909782919204d657')&&wf.includes('79da40105d480cce540ac636334dd9b6d3f54956'));
 const source=await fs.readFile(new URL('./public-request-readonly-diagnostic.mjs',import.meta.url),'utf8');
 assert(!/createFixedRequest\(|writeFile|constructRunLocalReader\(|runOwnedActualRequest\(|fetch\(/.test(source));
 assert(source.includes('readFixedRequestInputs(workspace')&&source.includes('protectedTargets.forEach(absent)'));
});
