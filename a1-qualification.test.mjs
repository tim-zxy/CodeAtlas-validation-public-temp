import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {sourceCommit,repository,sha,verifySeed,assertPublicBytes} from './a1-public-seed.mjs';

test('new qualification refuses a correctly hashed previous-source seed before consumption',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'a1-seed-test-'));
 try {
  const record={schemaVersion:1,scope:'BUILD_SEED_NOT_QUALIFIED',repository,
   sourceCommit:'79da40105d480cce540ac636334dd9b6d3f54956',controlCommit:'a'.repeat(40)};
  const bytes=Buffer.from(JSON.stringify(record));
  await fs.writeFile(path.join(root,'seed.json'),bytes,{flag:'wx'});
  await assert.rejects(verifySeed(root,root,sha(bytes),'a'.repeat(40)),{code:'ERR_ASSERTION'});
 } finally {await fs.rm(root,{recursive:true});}
});

test('new source and lock pins are exact; workflow has no old source or extra execution modes',async()=>{
 assert.equal(sourceCommit,'96a965b822f75c66230636d47a81eee4a8eeebd9');
 const build=await fs.readFile(new URL('./a1-public-build.ps1',import.meta.url),'utf8');
 for(const h of ['67b68a47fa5e7410424ec9b7e7259cc858b4bbd1f863bfec4d4b98b74943327f',
  '504f43c05c1e3eb8191f4daa1dee18f90b3026e7d42306b1dae92b8e42bf757b'])assert.ok(build.includes(h));
 assert.equal(build.split(sourceCommit).length-1,2);
 const workflow=await fs.readFile(new URL('./.github/workflows/integration-qualification.yml',import.meta.url),'utf8');
 assert.equal(workflow.split('ref: '+sourceCommit).length-1,4);
 assert.ok(!workflow.includes('79da401'));
 assert.ok(!/workflow_run:|push:|pull_request:|schedule:/.test(workflow));
 assert.ok(!/actual22|public-pack|native-refresh-ci\.mjs prepare/.test(workflow));
 for(const stage of ['READ_FULL162','VERIFY90','TRANSPORT154'])assert.ok(workflow.includes(' '+stage));
 const transport=await fs.readFile(new URL('./a1-public-validation.mjs',import.meta.url),'utf8');
 assert.ok(transport.includes("assert.notEqual(process.env.RETAINED_SEED,'true','NO_PREVIOUS_SOURCE_SEED')"));
 assert.ok(transport.includes("'a1-public-validation.mjs','a1-public-seed.mjs','public-sampling-stage.mjs'"));
});

test('new seed retains public-content refusal',()=>{
 assert.throws(()=>assertPublicBytes(Buffer.from('C:\\Users\\Example\\private')),
  {message:'PUBLIC_CONTENT_REVIEW_FAILED'});
 assertPublicBytes(Buffer.from('fixed public synthetic evidence'));
});

 test('initial dispatch performs only one seed build and no qualification stage',async()=>{const w=await fs.readFile(new URL('./.github/workflows/public-a1-qualification.yml',import.meta.url),'utf8');assert.equal(w.split('ref: '+sourceCommit).length-1,1);assert.ok(w.includes('timeout-minutes: 20'));assert.ok(w.includes('One Native build only'));assert.ok(!/READ_FULL162|VERIFY90|TRANSPORT154|actual22|PACK/.test(w));assert.ok(!/workflow_run:|push:|pull_request:|schedule:/.test(w));});
