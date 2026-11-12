// Fixed cloud synthetic inputs only. No operational actual22 import or invocation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {constructRunLocalReader,consumeRunLocalReader,assertActualTargetAbsent} from './public-reader-seed.mjs';
import {runShortDiagnostic} from './public-short-diagnostic.mjs';
const workspace=path.resolve('.'),source=path.join(workspace,'source'),work=path.join(workspace,'pack-work');
let generic,pack,approval,archive;
try {
 assert.equal(process.argv.length,2);
 const approvalBytes=await fs.readFile(new URL('./public-actual-approval.json',import.meta.url));
 assert.equal(createHash('sha256').update(approvalBytes).digest('hex'),'ef38e6dc8eb629d399cbba30784db964730b4eaa103b84c0d2643b5c9c42ded7');
 approval=JSON.parse(approvalBytes);
 assert.equal(approval.release.releaseId,442510821);assert.equal(approval.release.assetId,738119268);
 assert.equal(approval.archive.sha256,'b2e534f18d365f6fcd93f316e26833d4e56dfe172c82e5396d72e9fc5582e22c');
 await runShortDiagnostic({
  construct:async()=>{const {owner}=await constructRunLocalReader(source,work);return owner;},
  consume:consumeRunLocalReader,
  download:async reader=>{
   const helper=path.join(reader.root,'.github/qualification/r11-staged-pack.mjs');
   assert.equal(createHash('sha256').update(await fs.readFile(helper)).digest('hex'),'0d8f8fca213c44295964335c6a210076f580aaf04c75e11af106ad91121ccd16');
   generic=await import(pathToFileURL(helper).href);
   pack=await import(pathToFileURL(path.join(reader.root,'scripts/helpers/native-refresh-ci-pack.mjs')).href);
   const output=path.join(workspace,'short-diagnostic-output');await generic.createOwnedDirectory(output);
   archive=path.join(output,'approved.zip');
   await pack.downloadRefreshCiArchive(approval,archive,'tim-zxy/CodeAtlas-validation-public-temp');
  },
  hash:async()=>generic.assertToolSeal(archive,approval.archive.sha256),
  assertAbsent:assertActualTargetAbsent,
 },line=>console.log(line));
} catch {
 console.log('SHORT_DIAG:9:3:0:0:0');process.exitCode=1;
}
