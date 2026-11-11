// Build-seed transport only. Never grants qualification, ownership or numeric approval.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
export const sourceCommit='79da40105d480cce540ac636334dd9b6d3f54956';
export const repository='tim-zxy/CodeAtlas-validation-public-temp';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertPublicBytes(bytes){
 const patterns=[/[a-z]:[\\/]Users[\\/]/i,/\/home\/[^/\s]+\//i,/(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]{15,}/,/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/];
 for(const encoding of ['utf8','utf16le','latin1'])for(const re of patterns)assert(!re.test(bytes.toString(encoding)),'PUBLIC_CONTENT_REVIEW_FAILED');
}
export function assertReaderEqual(expected,actual){assert.deepEqual(actual.dependencies,expected.dependencies,'Reader bytes changed');assert.deepEqual(actual.topology,expected.topology,'Reader topology changed');}
export function assertSeedInventory(rows){
 assert(Array.isArray(rows)&&rows.length>0);const seen=new Set();
 for(const x of rows){assert.deepEqual(Object.keys(x).sort(),['bytes','path','sha256']);assert(typeof x.path==='string'&&/^(native\/codeatlas-native-analyzer\.exe|evidence\/(?:native-build\.json|reader-catalog\.json|build-provenance\.json|licenses\/[A-Za-z0-9._/-]+))$/.test(x.path));assert(!x.path.split('/').some(y=>!y||y==='.'||y==='..'));assert(!seen.has(x.path.toLowerCase()));seen.add(x.path.toLowerCase());assert(x.path.split('/').every(y=>!y.endsWith('.')&&!/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\\.|$)/i.test(y)));assert(Number.isSafeInteger(x.bytes)&&x.bytes>0);assert(/^[a-f0-9]{64}$/.test(x.sha256));}
}
const json=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const save=(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const imp=(root,p)=>import(pathToFileURL(path.join(root,p)).href);
async function regular(p){const s=await fs.lstat(p);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1,'Seed requires regular single-link file');assert.equal(await fs.realpath(p),path.resolve(p));assert(s.size<=128*1024*1024,'Seed member too large');return fs.readFile(p);}
async function members(root,relative=''){
 const rows=[];for(const e of (await fs.readdir(path.join(root,relative),{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:1)){
 const rel=relative?relative+'/'+e.name:e.name;if(rel==='seed.json')continue;if(rel==='temp'){assert(e.isDirectory()&&!e.isSymbolicLink());assert.deepEqual(await fs.readdir(path.join(root,rel)),[],'Seed temp must remain empty');continue;}
 assert(!e.isSymbolicLink());if(e.isDirectory())rows.push(...await members(root,rel));else{const b=await regular(path.join(root,rel));assertPublicBytes(b);rows.push({path:rel,bytes:b.length,sha256:sha(b)});}}
 return rows;
}
async function tools(provenance){
 const {spawnSync}=await import('node:child_process');
 for(const x of provenance.tools){assert(/^[a-f0-9]{64}$/.test(x.sha256));const exe={node:'node.exe',powershell:'pwsh.exe',tar:'tar.exe',cargo:'cargo.exe',rustc:'rustc.exe',cl:'cl.exe',linker:'link.exe',rc:'rc.exe'}[x.role];assert(exe);
 const found=spawnSync(['cargo','rustc'].includes(x.role)?'rustup':'where.exe',['cargo','rustc'].includes(x.role)?['which','--toolchain','1.98.1',x.role]:[exe],{encoding:'utf8',windowsHide:true,timeout:10000});assert.equal(found.status,0,'Tool not found');const candidates=found.stdout.trim().split(/\r?\n/);assert(candidates.length>0);assert.equal(sha(await fs.readFile(x.role==='tar'?path.join(process.env.SystemRoot,'System32/tar.exe'):candidates[0])),x.sha256,'Tool bytes changed: '+x.role);}
 assert.equal(process.env.ImageVersion,provenance.imageVersion,'Runner image changed');
}
export async function originalZip(source,mode,file,entries,root){
 const record={entries};if(mode!=='Create'){record.bytes=(await fs.stat(file)).size;const h=createHash('sha256');const {createReadStream}=await import('node:fs');for await(const chunk of createReadStream(file))h.update(chunk);record.sha256=h.digest('hex');}
 const args=['-NoProfile','-NonInteractive','-File',path.join(source,'scripts/native-refresh-ci-pack.ps1'),'-Mode',mode,'-ArchivePath',file,...(root?['-RootPath',root]:[])];
 const child=execFileSync('pwsh.exe',args,{input:JSON.stringify(record),encoding:'utf8',windowsHide:true,maxBuffer:1_000_000,timeout:mode==='Create'?180000:300000});const result=JSON.parse(child);assert.equal(result.verified,true);assert.equal(result.entries,entries.length);assert.equal(result.mode,mode);
}
export async function copyLicenseTexts(packages,destination){
 await fs.mkdir(destination);const licenses=[];
 for(const pkg of packages){if(pkg.source===null)continue;let publicId='INVALID_PACKAGE';try{assert(pkg.license,'DEPENDENCY_LICENSE_UNKNOWN');const dir=path.dirname(pkg.manifest_path);const folder=pkg.name+'-'+pkg.version;assert(/^[a-zA-Z0-9._-]+$/.test(folder));publicId=folder;const dest=path.join(destination,folder);await fs.mkdir(dest);
 const names=(await fs.readdir(dir)).filter(n=>/^(LICENSE|LICENCE|COPYING|NOTICE)([._-].*)?$/i.test(n));if(pkg.license_file){assert.equal(path.basename(pkg.license_file),pkg.license_file,'Nonroot license requires review');if(!names.includes(pkg.license_file))names.push(pkg.license_file);}
 let provenance=null;
 if(names.length===0&&pkg.name==='tree-sitter-java'&&pkg.version==='0.23.5'&&pkg.license==='MIT'){
  const vcs=await json(path.join(dir,'.cargo_vcs_info.json'));assert.equal(vcs.git.sha1,'94703d5a6bed02b98e438d7cad1136c01a60ba2c','LICENSE_SOURCE_MISMATCH');const bytes=await fs.readFile(path.join(import.meta.dirname,'third-party-notices/tree-sitter-java-0.23.5-LICENSE'));assert.equal(sha(bytes),'52ed137b039cd9c46409bc22e89938af911c95b157feae2d040b51e6084369a7','LICENSE_NOTICE_BYTES_CHANGED');assertPublicBytes(bytes);await fs.writeFile(path.join(dest,'LICENSE'),bytes,{flag:'wx'});names.push('LICENSE');provenance={upstream:'https://github.com/tree-sitter/tree-sitter-java/blob/94703d5a6bed02b98e438d7cad1136c01a60ba2c/LICENSE',gitBlobSha:'4e0446f76ca7d380d615e31b5500711df66a9ea2',sha256:sha(bytes)};
 }else{assert(names.length>0,'DEPENDENCY_LICENSE_TEXT_MISSING');for(const name of names){assert(/^[a-zA-Z0-9._-]+$/.test(name));const info=await fs.lstat(path.join(dir,name));assert(info.isFile()&&!info.isSymbolicLink());const bytes=await fs.readFile(path.join(dir,name));assertPublicBytes(bytes);await fs.writeFile(path.join(dest,name),bytes,{flag:'wx'});}}
 licenses.push({name:pkg.name,version:pkg.version,license:pkg.license,files:names.sort(),...(provenance?{provenance}:{})});}catch(error){const firstLine=String(error.message).split(/\r?\n/)[0].trim();const code=/^[A-Z][A-Z0-9_]{2,100}$/.test(firstLine)?firstLine:((/^[A-Z_]+$/.test(error.code??''))?error.code:'NOTICE_VALIDATION_FAILED');console.error('DEPENDENCY_NOTICE_REFUSED:'+publicId+':'+code);throw Error(code);}
 }
 await save(path.join(destination,'index.json'),licenses);
}
export async function createSeed(source,output){
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.GITHUB_REPOSITORY,repository);
 const seed=path.join(output,'seed');await fs.mkdir(seed);await fs.mkdir(path.join(seed,'native'));await fs.mkdir(path.join(seed,'evidence'));await fs.mkdir(path.join(seed,'temp'));
 const provenance=await json(path.join(output,'build-receipt.json'));assert.equal(provenance.sourceCommit,sourceCommit);
 const nativeSource='C:/CodeAtlas-P05-D5-R10/native/codeatlas-native-analyzer.exe';const native=await regular(nativeSource);assertPublicBytes(native);
 await fs.copyFile(nativeSource,path.join(seed,'native/codeatlas-native-analyzer.exe'),1);
 const build=await json('C:/CodeAtlas-P05-D5-R10/evidence/native-build.json');assert.equal(build.native.sha256,sha(native));await save(path.join(seed,'evidence/native-build.json'),build);
 await save(path.join(seed,'evidence/build-provenance.json'),provenance);
 const replay=await imp(source,'packages/runtime/test/helpers/native-refresh-transport-replay.mjs');
 const catalog=await replay.discoverRefreshReplayDependenciesAt({repositoryPath:source,nativeExecutablePath:path.join(seed,'native/codeatlas-native-analyzer.exe'),generatorRevision:'p05-refresh-replay-v4'});
 await save(path.join(seed,'evidence/reader-catalog.json'),{dependencies:catalog.dependencies,topology:catalog.topology});
 await fs.cp(path.join(output,'license-review'),path.join(seed,'evidence/licenses'),{recursive:true,errorOnExist:true,force:false});
 const inventory=await members(seed);assertSeedInventory(inventory);
 const manifest={schemaVersion:1,scope:'BUILD_SEED_NOT_QUALIFIED',repository,sourceCommit,controlCommit:process.env.GITHUB_SHA,nativeSha256:sha(native),environment:build.environment,inventory};assert(/^[a-f0-9]{40}$/.test(manifest.controlCommit));
 const bytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');assertPublicBytes(bytes);await fs.writeFile(path.join(seed,'seed.json'),bytes,{flag:'wx'});
 const pack=await imp(source,'scripts/helpers/native-refresh-ci-pack.mjs');const layouts=await imp(source,'scripts/helpers/native-refresh-ci-layout.mjs');await pack.verifyRefreshCiNativeBuildAt(await layouts.readRefreshCiPackLayoutAt(seed),source);
 const zip=path.join(output,'public-build-seed.zip');await originalZip(source,'Create',zip,[...inventory,{path:'seed.json',bytes:bytes.length,sha256:sha(bytes)}],seed);
 const zipBytes=await fs.readFile(zip);assert(zipBytes.length<128*1024*1024);const result={scope:manifest.scope,sourceCommit,controlCommit:manifest.controlCommit,nativeSha256:manifest.nativeSha256,seedManifestSha256:sha(bytes),archiveSha256:sha(zipBytes),archiveBytes:zipBytes.length,entries:inventory.length+1,sampling:'NOT_ATTEMPTED',privacy:'ALLOWLIST_AND_UTF8_UTF16_MARKER_REVIEW_NO_GENERAL_CLEARANCE'};await save(path.join(output,'public-seed-result.json'),result);console.log(JSON.stringify(result));return result;
}
export async function verifySeed(source,seed,expectedManifestSha){
 assert(/^[a-f0-9]{64}$/.test(expectedManifestSha));const bytes=await regular(path.join(seed,'seed.json'));assert.equal(sha(bytes),expectedManifestSha);assertPublicBytes(bytes);const manifest=JSON.parse(bytes);assert.equal(manifest.scope,'BUILD_SEED_NOT_QUALIFIED');assert.equal(manifest.repository,repository);assert.equal(manifest.sourceCommit,sourceCommit);assert.equal(manifest.controlCommit,process.env.GITHUB_SHA);assertSeedInventory(manifest.inventory);assert.deepEqual(await members(seed),manifest.inventory);
 const provenance=await json(path.join(seed,'evidence/build-provenance.json'));await tools(provenance);
 const runtime=await imp(source,'packages/runtime/dist/native-metadata-admission.js');assert.deepEqual(runtime.nativeMetadataEnvironment(),manifest.environment);
 const replay=await imp(source,'packages/runtime/test/helpers/native-refresh-transport-replay.mjs');const actual=await replay.discoverRefreshReplayDependenciesAt({repositoryPath:source,nativeExecutablePath:path.join(seed,'native/codeatlas-native-analyzer.exe'),generatorRevision:'p05-refresh-replay-v4'});assertReaderEqual(await json(path.join(seed,'evidence/reader-catalog.json')),actual);
 const pack=await imp(source,'scripts/helpers/native-refresh-ci-pack.mjs');const layouts=await imp(source,'scripts/helpers/native-refresh-ci-layout.mjs');await pack.verifyRefreshCiNativeBuildAt(await layouts.readRefreshCiPackLayoutAt(seed),source);return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 try{const [mode,source,output]=process.argv.slice(2);if(mode==='licenses'){const metadata=await json(path.join(output,'cargo-metadata.json'));await copyLicenseTexts(metadata.packages,path.join(output,'license-review'));console.log('DEPENDENCY_NOTICE_REVIEW_COMPLETE');}else{assert.equal(mode,'create');await createSeed(source,output);}}catch(error){const code=/^[A-Z][A-Z0-9_]{2,100}$/.test(error.message)?error.message:'SEED_GUARD_FAILED';console.error('PUBLIC_SEED_STOPPED_NOT_PUBLISHED:'+code);process.exitCode=1;}
}