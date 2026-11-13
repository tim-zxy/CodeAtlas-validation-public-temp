// Build-seed transport only. Never grants qualification, ownership or numeric approval.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
export const sourceCommit='a1f8fa950d1eea6699ced3ece058f06c53c1c6e1';
export const repository='tim-zxy/CodeAtlas-validation-public-temp';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertPublicBytes(bytes){
 const patterns=[/[a-z]:[\\/]Users[\\/]/i,/\/home\/[^/\s]+\//i,/(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]{15,}/,/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/];
 for(const encoding of ['utf8','utf16le','latin1'])for(const re of patterns)assert(!re.test(bytes.toString(encoding)),'PUBLIC_CONTENT_REVIEW_FAILED');
}
export function assertReaderEqual(expected,actual){assert.deepEqual(actual.dependencies,expected.dependencies,'READER_BYTES_CHANGED');assert.deepEqual(actual.topology,expected.topology,'READER_TOPOLOGY_CHANGED');}
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
export function compilerToolPaths(provenance,vsRoot,programFiles86){
 assert(/^(?:[0-9]+\.){2,3}[0-9]+$/.test(provenance.vcToolsVersion),'INVALID_VC_VERSION');assert(/^(?:[0-9]+\.){2,3}[0-9]+$/.test(provenance.sdkVersion),'INVALID_SDK_VERSION');assert(path.win32.isAbsolute(vsRoot)&&path.win32.isAbsolute(programFiles86),'INVALID_TOOL_INSTALL_ROOT');const bin=path.win32.join(vsRoot,'VC/Tools/MSVC',provenance.vcToolsVersion,'bin/Hostx64/x64');return {cl:path.win32.join(bin,'cl.exe'),linker:path.win32.join(bin,'link.exe'),rc:path.win32.join(programFiles86,'Windows Kits/10/bin',provenance.sdkVersion,'x64/rc.exe')};
}
async function tools(provenance){
 const {spawnSync}=await import('node:child_process');let compilerFiles;
 for(const x of provenance.tools){assert(/^[a-f0-9]{64}$/.test(x.sha256));let file;
 if(['cl','linker','rc'].includes(x.role)){
  if(!compilerFiles){const programFiles86=process.env['ProgramFiles(x86)'];const vswhere=path.join(programFiles86,'Microsoft Visual Studio/Installer/vswhere.exe');const r=spawnSync(vswhere,['-latest','-products','*','-requires','Microsoft.VisualStudio.Component.VC.Tools.x86.x64','-property','installationPath'],{encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:10000});assert.equal(r.status,0,'VS_TOOL_RESOLUTION_FAILED');assert.equal(r.stdout.trim().split(/\r?\n/).length,1,'VS_TOOL_RESOLUTION_AMBIGUOUS');compilerFiles=compilerToolPaths(provenance,r.stdout.trim(),programFiles86);}file=compilerFiles[x.role];
 }else if(x.role==='tar')file=path.join(process.env.SystemRoot,'System32/tar.exe');else{
 const exe={node:'node.exe',powershell:'pwsh.exe',cargo:'cargo.exe',rustc:'rustc.exe'}[x.role];assert(exe,'UNKNOWN_TOOL_ROLE');const found=spawnSync(['cargo','rustc'].includes(x.role)?'rustup':'where.exe',['cargo','rustc'].includes(x.role)?['which','--toolchain','1.98.1',x.role]:[exe],{encoding:'utf8',windowsHide:true,timeout:10000});assert.equal(found.status,0,'TOOL_NOT_FOUND_'+x.role.toUpperCase());file=found.stdout.trim().split(/\r?\n/)[0];}
 assert.equal(sha(await fs.readFile(file)),x.sha256,'TOOL_BYTES_CHANGED_'+x.role.toUpperCase());
 }
 assert.equal(process.env.ImageVersion,provenance.imageVersion,'RUNNER_IMAGE_CHANGED');
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
export async function verifySeed(source,seed,expectedManifestSha,producerCommit=process.env.GITHUB_SHA){
 assert(/^[a-f0-9]{64}$/.test(expectedManifestSha));const bytes=await regular(path.join(seed,'seed.json'));assert.equal(sha(bytes),expectedManifestSha);assertPublicBytes(bytes);const manifest=JSON.parse(bytes);assert.equal(manifest.scope,'BUILD_SEED_NOT_QUALIFIED');assert.equal(manifest.repository,repository);assert.equal(manifest.sourceCommit,sourceCommit);assert.equal(manifest.controlCommit,producerCommit,'SEED_PRODUCER_CHANGED');assertSeedInventory(manifest.inventory);assert.deepEqual(await members(seed),manifest.inventory);
 const provenance=await json(path.join(seed,'evidence/build-provenance.json'));await tools(provenance);
 const runtime=await imp(source,'packages/runtime/dist/native-metadata-admission.js');assert.deepEqual(runtime.nativeMetadataEnvironment(),manifest.environment);
 const replay=await imp(source,'packages/runtime/test/helpers/native-refresh-transport-replay.mjs');const actual=await replay.discoverRefreshReplayDependenciesAt({repositoryPath:source,nativeExecutablePath:path.join(seed,'native/codeatlas-native-analyzer.exe'),generatorRevision:'p05-refresh-replay-v4'});assertReaderEqual(await json(path.join(seed,'evidence/reader-catalog.json')),actual);
 const pack=await imp(source,'scripts/helpers/native-refresh-ci-pack.mjs');const layouts=await imp(source,'scripts/helpers/native-refresh-ci-layout.mjs');await pack.verifyRefreshCiNativeBuildAt(await layouts.readRefreshCiPackLayoutAt(seed),source);return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 try{const [mode,source,output]=process.argv.slice(2);if(mode==='licenses'){const metadata=await json(path.join(output,'cargo-metadata.json'));await copyLicenseTexts(metadata.packages,path.join(output,'license-review'));console.log('DEPENDENCY_NOTICE_REVIEW_COMPLETE');}else{assert.equal(mode,'create');await createSeed(source,output);}}catch(error){const code=/^[A-Z][A-Z0-9_]{2,100}$/.test(error.message)?error.message:'SEED_GUARD_FAILED';console.error('PUBLIC_SEED_STOPPED_NOT_PUBLISHED:'+code);process.exitCode=1;}
}