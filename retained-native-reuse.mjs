// One pinned old public seed as a Native input, never old qualification reuse.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {retainedSeed} from './a1-retained-seed.mjs';
import {sourceCommit,repository,sha,assertPublicBytes,assertSeedInventory,originalZip,verifySeedTools,assertRetainedNativeReuse} from './a1-public-seed.mjs';
const api='https://api.github.com/repos/'+repository;
async function get(url,accept='application/vnd.github+json'){
 const response=await fetch(url,{headers:{Accept:accept,'X-GitHub-Api-Version':'2022-11-28',Authorization:'Bearer '+process.env.GH_TOKEN},signal:AbortSignal.timeout(120000)});
 assert(response.ok,'RETAINED_NATIVE_FETCH_FAILED');return response;
}
async function getJson(url){const response=await get(url);const parts=[];let bytes=0;for await(const part of response.body){bytes+=part.length;assert(bytes<2_000_000,'RETAINED_NATIVE_METADATA_TOO_LARGE');parts.push(Buffer.from(part));}return JSON.parse(Buffer.concat(parts).toString('utf8'));}
let retainedNativePhase='NOT_STARTED';
const diagnosticPhases=new Set(['CONTROL', 'RELEASE', 'TAG', 'ASSET', 'DOWNLOAD', 'ARCHIVE_WRITE', 'MANIFEST', 'ZIP_VALIDATE', 'ZIP_EXTRACT', 'TOOLS', 'ORIGINAL_LAYOUT', 'NATIVE_ORIGINAL', 'LINEAGE', 'ACQUIRE', 'NATIVE_EVIDENCE_DIRECTORY', 'NATIVE_COPY', 'NATIVE_NEW', 'LICENSE', 'RECEIPT']);
export function classifyRetainedNativeFailure(error,phase){
 const code=error?.code;
 const errorClass=code==='ERR_ASSERTION'?'ASSERTION':
  ['ENOENT','EACCES','EPERM','EEXIST','ENOTDIR','EISDIR'].includes(code)?'FILESYSTEM':
  code==='ETIMEDOUT'?'TIMEOUT':
  ['ERR_CHILD_PROCESS_STDIO_MAXBUFFER','ERR_CHILD_PROCESS_IPC_REQUIRED'].includes(code)||Number.isInteger(error?.status)?'CHILD_PROCESS':
  ['ENOTFOUND','ECONNRESET','ECONNREFUSED','UND_ERR_CONNECT_TIMEOUT'].includes(code)?'NETWORK':'UNKNOWN';
 return {schemaVersion:1,phase:diagnosticPhases.has(phase)?phase:'UNKNOWN',errorClass,cleanup:'NOT_ESTABLISHED'};
}
export async function prepareRetainedNative(source,output){
 retainedNativePhase='CONTROL';
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.GITHUB_REPOSITORY,repository);assert.equal(process.env.GITHUB_RUN_ATTEMPT,'1');assert(process.env.GH_TOKEN);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sourceCommit);
retainedNativePhase='RELEASE'; const release=await getJson(api+'/releases/'+retainedSeed.releaseId);assert.equal(release.draft,false);assert.equal(release.prerelease,true);assert.equal(release.target_commitish,retainedSeed.producerCommit);assert.equal(release.tag_name,'build-seed-'+retainedSeed.archiveSha256);
retainedNativePhase='TAG'; const tag=await getJson(api+'/git/ref/tags/'+release.tag_name);assert.equal(tag.object.type,'commit');assert.equal(tag.object.sha,retainedSeed.producerCommit);
retainedNativePhase='ASSET'; const asset=await getJson(api+'/releases/assets/'+retainedSeed.assetId);assert.equal(asset.name,'public-build-seed.zip');assert.equal(asset.state,'uploaded');assert.equal(asset.size,retainedSeed.archiveBytes);assert.equal(asset.digest,'sha256:'+retainedSeed.archiveSha256);
retainedNativePhase='DOWNLOAD'; const response=await get(api+'/releases/assets/'+retainedSeed.assetId,'application/octet-stream');const chunks=[];let received=0;for await(const chunk of response.body){received+=chunk.length;assert(received<=retainedSeed.archiveBytes,'RETAINED_NATIVE_DOWNLOAD_TOO_LARGE');chunks.push(Buffer.from(chunk));}assert.equal(received,retainedSeed.archiveBytes);const bytes=Buffer.concat(chunks);assert.equal(sha(bytes),retainedSeed.archiveSha256);
retainedNativePhase='ARCHIVE_WRITE'; const archive=path.join(output,'retained-native-seed.zip');await fs.writeFile(archive,bytes,{flag:'wx'});delete process.env.GH_TOKEN;delete process.env.GITHUB_TOKEN;
retainedNativePhase='MANIFEST'; const tar=path.join(process.env.SystemRoot,'System32/tar.exe');const recordBytes=execFileSync(tar,['-xOf',archive,'--','seed.json'],{windowsHide:true,maxBuffer:4_000_000,timeout:30000});assert.equal(sha(recordBytes),retainedSeed.manifestSha256);assertPublicBytes(recordBytes);const manifest=JSON.parse(recordBytes);assert.equal(manifest.sourceCommit,retainedSeed.sourceCommit);assert.equal(manifest.controlCommit,retainedSeed.producerCommit);assert.equal(manifest.nativeSha256,retainedSeed.nativeSha256);assertSeedInventory(manifest.inventory);
 const entries=[...manifest.inventory,{path:'seed.json',bytes:recordBytes.length,sha256:sha(recordBytes)}];retainedNativePhase='ZIP_VALIDATE';await originalZip(source,'Validate',archive,entries);const old=path.join(output,'retained-native-seed');await fs.mkdir(old);retainedNativePhase='ZIP_EXTRACT';await originalZip(source,'Extract',archive,entries,old);await fs.mkdir(path.join(old,'temp'));
retainedNativePhase='TOOLS'; const provenance=JSON.parse(await fs.readFile(path.join(old,'evidence/build-provenance.json'),'utf8'));await verifySeedTools(provenance);
retainedNativePhase='ORIGINAL_LAYOUT'; const load=p=>import(pathToFileURL(path.join(source,p)).href);const layouts=await load('scripts/helpers/native-refresh-ci-layout.mjs');const pack=await load('scripts/helpers/native-refresh-ci-pack.mjs');const original=await layouts.readRefreshCiPackLayoutAt(old);retainedNativePhase='NATIVE_ORIGINAL';await pack.verifyRefreshCiNativeBuildAt(original,source);
 const nativeBuildBytes=await fs.readFile(path.join(old,'evidence/native-build.json'));
retainedNativePhase='LINEAGE'; const input=assertRetainedNativeReuse({schemaVersion:1,scope:'RETAINED_NATIVE_INPUT_NOT_REBUILT',readerSourceCommit:sourceCommit,producerSourceCommit:retainedSeed.sourceCommit,seedProducerCommit:retainedSeed.producerCommit,seedArchiveSha256:retainedSeed.archiveSha256,seedManifestSha256:retainedSeed.manifestSha256,seedReleaseId:retainedSeed.releaseId,seedAssetId:retainedSeed.assetId,nativeSha256:retainedSeed.nativeSha256,nativeBuildReceiptSha256:sha(nativeBuildBytes),originalBuildProvenance:provenance});
retainedNativePhase='ACQUIRE'; const layout=await layouts.acquireRefreshCiLayoutAt({root:layouts.refreshCiLayoutRootForRevision('p05-d5-exact-layout-v10'),nativeSourcePath:original.nativePath,nativeSha256:retainedSeed.nativeSha256});await layouts.verifyRefreshCiLayoutOwnership(layout);retainedNativePhase='NATIVE_EVIDENCE_DIRECTORY';await fs.mkdir(layout.evidenceRoot);await layouts.verifyRefreshCiLayoutOwnership(layout);retainedNativePhase='NATIVE_COPY';await fs.copyFile(path.join(old,'evidence/native-build.json'),path.join(layout.evidenceRoot,'native-build.json'),1);retainedNativePhase='NATIVE_NEW';await pack.verifyRefreshCiNativeBuildAt(layout,source);
retainedNativePhase='LICENSE'; await fs.cp(path.join(old,'evidence/licenses'),path.join(output,'license-review'),{recursive:true,errorOnExist:true,force:false});retainedNativePhase='RECEIPT';await fs.writeFile(path.join(output,'retained-native-reuse.json'),JSON.stringify(input,null,2)+'\n',{flag:'wx'});console.log('RETAINED_NATIVE_INPUT_VERIFIED_NOT_REBUILT');
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename){prepareRetainedNative(...process.argv.slice(2).map(x=>path.resolve(x))).catch(error=>{console.error('RETAINED_NATIVE_DIAGNOSTIC:'+JSON.stringify(classifyRetainedNativeFailure(error,retainedNativePhase)));console.error('RETAINED_NATIVE_STOPPED:RETAINED_NATIVE_GUARD_FAILED');process.exitCode=1;});}
