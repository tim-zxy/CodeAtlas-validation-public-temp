// Same-run Public adapter with fixed real fixture IDs; explicit manual execution only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {constructRunLocalReader,consumeRunLocalReader} from './public-reader-seed.mjs';
import {actualDiagnostics} from './public-actual-diagnostics.mjs';
const publicActualZipTools = Object.freeze({
  powershellSha256: '2a6769a3330dc1084d0154bfde7d164ab750ca7f700f313f9d417c1be78b2233',
  tarSha256: 'a8c4b61db4c2908930be3984d80b4a921f75290c958adc62565da8a455b1230c',
  tarPath: path.resolve('C:/Windows/System32/tar.exe'),
});
export const publicActualIdentity = Object.freeze({
  releaseId: 442510821,
  assetId: 738119268,
  sourceCommit: '79da40105d480cce540ac636334dd9b6d3f54956',
  existingPackAssetId: 737583622,
  helperSha256: '0d8f8fca213c44295964335c6a210076f580aaf04c75e11af106ad91121ccd16',
  nodeSha256: '3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5',
  candidateSha256: 'd88650f7126cf531fcd6eaf820c8e87a103c950d2f9fcd7a79ca914c2001f5df',
  archiveSha256: 'b2e534f18d365f6fcd93f316e26833d4e56dfe172c82e5396d72e9fc5582e22c',
  nativeSha256: '7b33be58f16bc7b214a50b412e477282ac5ea27234de20046026b5f445095d18',
  layoutRoot: 'C:\\CodeAtlas-P05-D5-R10',
  repository: 'tim-zxy/CodeAtlas-validation-public-temp',
  archiveBytes: 246167030,
  entries: 5577,
  environment: Object.freeze({
    node: 'v24.15.0',
    v8: '13.6.233.17-node.48',
    platform: 'win32',
    arch: 'x64',
    zodVersion: '4.6.1',
    implementationDigest: 'efcb8904bbb16ea0c11f2c21254540dfeefd6351a5c9e8eaf0aaa192fc029d9d',
    corpusRevision: 'p05-native-metadata-memory-v1',
  }),
  corpus: Object.freeze({
    revision: 'p05-native-refresh-transport-memory-v1',
    digest: 'cc6ffd87566fa689b3ad0decdb0d1898d82cdec10cdade5b103b9514395626f1',
  }),
});
const phases = [
  'verifyReader',
  'download',
  'verifyPack',
  'install',
  'read',
  'collect',
  'validate',
  'verifyAfter',
];
// Internal sequencing seam; substitute ports cannot produce a real acceptance receipt.
export async function runActual22Sequence(ports, control) {
  assert(control && typeof control.stage === 'function' && typeof control.worker === 'function');
  for (const name of phases)
    assert.equal(typeof ports?.[name], 'function', 'Missing phase ' + name);
  await control.stage('VERIFY_READER', () => ports.verifyReader());
  const archive = await control.stage('DOWNLOAD', () => ports.download());
  await control.stage('VERIFY_PACK', () => ports.verifyPack(archive));
  const installed = await control.stage('INSTALL', () => ports.install(archive));
  const values = await control.stage('READ', () => ports.read(installed));
  const report = await control.stage('COLLECT', () => ports.collect(installed, values, control));
  await control.stage('VALIDATE', () => ports.validate(report, values, installed));
  await control.stage('VERIFY_AFTER', () => ports.verifyAfter(installed, report));
  return report;
}
// Additional fixed bindings, AFTER original validateRefreshCiApproval, never an approval producer.
export function assertPublicBindings(value) {
  const p = publicActualIdentity;
  assert.equal(value.layoutRevision, 'p05-d5-exact-layout-v10');
  assert.deepEqual(value.environment, p.environment);
  assert.deepEqual(value.corpus, p.corpus);
  assert.equal(value.candidate.sha256, p.candidateSha256);
  assert.equal(value.candidate.reservationBytes, 375701504);
  assert.equal(value.candidate.policyRevision, 'p05-native-memory-high-water-range-v1');
  assert.equal(value.native.sha256, p.nativeSha256);
  assert.equal(value.archive.sha256, p.archiveSha256);
  assert.equal(value.archive.bytes, p.archiveBytes);
  assert.equal(value.archive.entries.length, p.entries);
  assert.equal(value.release.repository, p.repository);
  assert.equal(value.release.releaseId,p.releaseId);
  assert.equal(value.release.assetId,p.assetId);
  assert.equal(value.release.tag, 'p05-d5-fixture-' + p.candidateSha256);
  assert.equal(value.release.assetName, 'codeatlas-p05-d5-public-79da401.zip');
}
// Internal bridge seam. The operational CLI constructs modules from its verified reader only.
export function createActual22Ports(modules, context) {
  const { request, approval, archivePath } = context;
  const packArgs = () => ({ approval, archivePath, repositoryPath: request.readerRoot });
  assert.equal(typeof context.withZipTools, 'function');
  return {
    verifyReader: context.verifyReader,
    download: () =>
      modules.pack.downloadRefreshCiArchive(approval, archivePath, publicActualIdentity.repository),
    verifyPack: (archive) => {
      assert.equal(archive, archivePath);
      return context.withZipTools(() => modules.pack.verifyRefreshCiPack(packArgs()));
    },
    install: (archive) => {
      assert.equal(archive, archivePath);
      return context.withZipTools(() => modules.pack.installRefreshCiPack(packArgs()));
    },
    read: (installed) =>
      modules.replay.readRefreshTransportReplayCorpus(
        installed.manifestPath,
        installed.bindingPath,
        installed.fixtureContext,
      ),
    collect: (installed, values, control) =>
      modules.replay.runRefreshTransportCommand(
        ['collect', 'approved', installed.candidatePath, path.join(request.outputRoot, 'actual')],
        installed.fixtureContext,
        control,
      ),
    validate: (report, values) =>
      modules.ci.validateRefreshCiActualReport(report, {
        candidateSha256: approval.candidate.sha256,
        candidate: approval.candidate,
        identity: values[0].identity,
      }),
    verifyAfter: async () => {
      await context.withZipTools(() => modules.pack.verifyRefreshCiPack(packArgs()));
      await context.verifyAfter();
    },
  };
}
export function assertPublicExecutionReady() {
  const p=publicActualIdentity;
  for(const value of [p.nodeSha256,p.corpus.digest,publicActualZipTools.powershellSha256,publicActualZipTools.tarSha256])
    assert.equal(typeof value==="string"&&/^[a-f0-9]{64}$/.test(value),true,"PUBLIC_ACTUAL_BINDINGS_NOT_FROZEN");
  for(const value of [p.releaseId,p.assetId])
    assert(Number.isSafeInteger(value)&&value>0,"PUBLIC_ACTUAL_RELEASE_NOT_FROZEN");
  assert.notEqual(p.assetId,p.existingPackAssetId,"Fixture release requires its own real asset identity");
}

// Pure sequencing seam; substitute callbacks cannot issue a real success receipt.
export async function runOwnedActualSequence(ports,control,check) {
 assert.equal(typeof check,'function');
 try {
  await actualDiagnostics.timed('OWNER',check);
  const report=await runActual22Sequence(ports,control);
  await actualDiagnostics.timed('OWNER',check);return report;
 } catch(error) {
  try {await control.fail('OWNED_SEQUENCE_FAILED');}
  catch(recordError){throw new AggregateError([error,recordError],'Sequence failed; stop receipt unavailable');}
  throw error;
 }
}
export async function createOwnedActualControl(stop,directory,check,verifyIdentity,diagnostics=actualDiagnostics) {
 // Retain the existing seam signature; full owner checks belong to the six
 // surrounding/lease boundaries, not the 106 original identity callbacks.
 assert.equal(typeof check,'function');assert.equal(typeof verifyIdentity,'function');
 const base=await stop.createR9StopControl(directory,async()=>{
  await diagnostics.timed('INPUT',verifyIdentity);
 });
 return diagnostics.wrapControl(base);
}
// Final success is outside consume: a failed owner post-check can never precede
// an ACTUAL22_VERIFIED receipt. The real entry supplies the private owner runtime.
export async function settleOwnedActual(consume,operation,success,failure) {
 try {const result=await consume(operation);await success(result);return result;}
 catch(error){try{await failure();}catch(recordError){throw new AggregateError([error,recordError],'Actual failed; final receipt unavailable');}throw error;}
}
export async function runOwnedActualRequest(source,work,requestPath,requestSha256,selfSha256) {
 assertPublicExecutionReady(); // Before construction, request reads, network or output.
 const {owner,result}=await actualDiagnostics.phase('BOOTSTRAP',()=>constructRunLocalReader(source,work));
 let adapter;
 return actualDiagnostics.phase('OWNER_SESSION',()=>settleOwnedActual(
  operation=>consumeRunLocalReader(owner,operation),
  reader=>actualDiagnostics.phase('ADAPTER_SESSION',async()=>{
   await actualDiagnostics.timed('OWNER',reader.check);
   const helper=path.join(reader.root,'.github/qualification/r11-staged-pack.mjs');
   assert.equal(crypto.createHash('sha256').update(await fs.promises.readFile(helper)).digest('hex'),publicActualIdentity.helperSha256);
   const generic=await import(pathToFileURL(helper).href);
   adapter=createActualAdapter(generic,reader,result.readerContentSha256);
   return adapter.runActualRequest(requestPath,requestSha256,selfSha256);
  }),
  value=>actualDiagnostics.phase('FINAL_RECEIPT',()=>adapter.complete(value)),
  ()=>actualDiagnostics.phase('FAILURE_RECEIPT',()=>adapter?.fail()),
 ));
}
function createActualAdapter(generic,reader,sealedDigest) {
 const {inventoryTree,hashFile,assertSeparateRoots,createOwnedDirectory,assertToolSeal,assertExactInventory}=generic;
 let ownedOutput,ownedStat,stopControl;
 const outputStillOwned=()=>{
  assert(ownedOutput);const current=fs.lstatSync(ownedOutput,{bigint:true});
  assert(current.isDirectory()&&!current.isSymbolicLink());assert.equal(fs.realpathSync.native(ownedOutput),ownedOutput);
  for(const key of ['dev','ino','birthtimeNs'])assert.equal(current[key],ownedStat[key]);
 };
function localCanonicalPath(value) {
  assert.equal(typeof value, 'string');
  assert.match(value, /^[A-Z]:\\/, 'Local Windows drive required');
  assert.equal(path.resolve(value), value, 'Noncanonical path');
  for (const part of value.slice(3).split('\\')) {
    assert(part && !/[<>:"|?*\x00-\x1f]/.test(part) && !/[. ]$/.test(part), 'Unsafe Windows path');
    assert(!/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part), 'Device path forbidden');
  }
}
function validateActualRequest(value) {
  assert(value && typeof value === 'object' && !Array.isArray(value));
  assert.deepEqual(
    Object.keys(value).sort(),
    [
      'schemaVersion',
      'readerRoot',
      'approvalPath',
      'approvalSha256',
      'outputRoot',
      'powershellPath',
    ].sort(),
  );
  assert.equal(value.schemaVersion, 1);
  assert.match(value.approvalSha256, /^[a-f0-9]{64}$/);
  for (const name of ['readerRoot', 'approvalPath', 'outputRoot', 'powershellPath'])
    localCanonicalPath(value[name]);
  assertSeparateRoots(value.readerRoot, value.outputRoot);
  return Object.freeze({ ...value });
}
const present = (p) => {
  try {
    fs.lstatSync(p);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
};
// The optional target is an internal self-owned-test seam; CLI always uses fixed R11.
function assertFreshActualLocations(request, target = publicActualIdentity.layoutRoot) {
  assertSeparateRoots(request.readerRoot, target);
  assertSeparateRoots(request.outputRoot, target);
  assertSeparateRoots(request.readerRoot, request.outputRoot);
  assert(!present(target), 'Protected actual layout already exists');
  assert(!present(request.outputRoot), 'Output already exists');
  for (const root of [request.readerRoot, path.dirname(request.outputRoot)]) {
    const st = fs.lstatSync(root);
    assert(st.isDirectory() && !st.isSymbolicLink());
    assert.equal(fs.realpathSync.native(root), root);
  }
  const rel = path.relative(request.outputRoot, request.approvalPath);
  assert(
    rel && (path.isAbsolute(rel) || rel === '..' || rel.startsWith('..' + path.sep)),
    'Approval overlaps output',
  );
}
function assertActualLaunchEnvironment(value = process) {
  const p = publicActualIdentity.environment;
  assert.equal(value.version, p.node);
  assert.equal(value.versions.v8, p.v8);
  assert.equal(value.platform, p.platform);
  assert.equal(value.arch, p.arch);
  assert.deepEqual(value.execArgv, [], 'Unknown Node startup flags');
  assert(!value.env.NODE_OPTIONS, 'Node preloads/options forbidden');
  assert(!value.env.NODE_PATH, 'External module path forbidden');
}
const ownFields = ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs', 'nlink'];
function statEqual(before, after) {
  for (const key of ownFields)
    assert.equal(after[key], before[key], 'Input physical identity drift');
}

// Future real invocation requires separate authorization. This function has no injectable ports.
async function runActualRequest(requestPath, requestSha256, selfSha256) {
  assertPublicExecutionReady();
  assertActualLaunchEnvironment();
  const self = fileURLToPath(import.meta.url),
    helper = path.join(reader.root,'.github/qualification/r11-staged-pack.mjs');
  assertToolSeal(self, selfSha256);
  assertToolSeal(helper, publicActualIdentity.helperSha256);
  localCanonicalPath(requestPath);
  assertToolSeal(requestPath, requestSha256);
  assert.equal(hashFile(process.execPath, true), publicActualIdentity.nodeSha256, 'Node binary drift');
  const request = validateActualRequest(readSealedActualJson(requestPath, requestSha256));
  assert.equal(request.readerRoot,reader.root,"Request does not name owned reader");
  assertFreshActualLocations(request);
  assertToolSeal(request.approvalPath, request.approvalSha256);
  await withActualZipTools(request.powershellPath, async () => undefined);
  await actualDiagnostics.timed('OWNER',reader.check);
  const bootstrap = await inventoryTree(request.readerRoot,{allowLinks:true});
  const rootStat = fs.lstatSync(request.readerRoot, { bigint: true }),
    nodeStat = fs.lstatSync(process.execPath, { bigint: true });
  const imp = (p) => import(pathToFileURL(path.join(request.readerRoot, p)).href);
  const modules = {
    pack: await imp('scripts/helpers/native-refresh-ci-pack.mjs'),
    replay: await imp('packages/runtime/test/helpers/native-refresh-transport-replay.mjs'),
    ci: await imp('scripts/native-refresh-ci.mjs'),
    stop: await imp('scripts/helpers/native-refresh-r9-stop.mjs'),
    layout: await imp('scripts/helpers/native-refresh-ci-layout.mjs'),
    runtime: await imp('packages/runtime/dist/native-metadata-admission.js'),
  };
  // Preserve old output confinement independently of the new fixed R11 target.
  modules.layout.assertRefreshCiOutputOutsideLayouts(request.outputRoot);
  modules.layout.assertRefreshCiOutputOutsideLayouts(request.readerRoot);
  const approval = modules.pack.validateRefreshCiApproval(
    readSealedActualJson(request.approvalPath, request.approvalSha256),
  );
  assertPublicBindings(approval);
  assert.deepEqual(modules.runtime.nativeMetadataEnvironment(), publicActualIdentity.environment);
  const inputs = new Map([
    [self, selfSha256],
    [helper, publicActualIdentity.helperSha256],
    [requestPath, requestSha256],
    [request.approvalPath, request.approvalSha256],
  ]);
  for (const rel of [
    'scripts/native-refresh-ci.mjs',
    'scripts/helpers/native-refresh-r9-stop.mjs',
    'scripts/native-refresh-transport-memory.mjs',
    'packages/runtime/test/helpers/native-refresh-transport-replay.mjs',
    'packages/runtime/dist/native-metadata-admission.js',
    'packages/runtime/dist/native-metadata-profiles.js',
  ]) {
    const entry = bootstrap.files.find((x) => x.path === rel);
    assert(entry, 'Missing entry seal');
    inputs.set(path.join(request.readerRoot, rel), entry.sha256);
  }
  const seen = new Map(),
    archivePath = path.join(request.outputRoot, 'approved.zip');
  const verifyIdentity = async () => {
    await withActualZipTools(request.powershellPath, async () => undefined);
    const currentRoot = fs.lstatSync(request.readerRoot, { bigint: true });
    for (const field of ['dev', 'ino', 'birthtimeNs'])
      assert.equal(currentRoot[field], rootStat[field], 'Reader root replaced');
    assert.equal(fs.realpathSync.native(request.readerRoot), request.readerRoot);
    statEqual(nodeStat, fs.lstatSync(process.execPath, { bigint: true }));
    for (const [file, sha] of [
      [archivePath, publicActualIdentity.archiveSha256],
      [
        path.join(publicActualIdentity.layoutRoot, 'native/codeatlas-native-analyzer.exe'),
        publicActualIdentity.nativeSha256,
      ],
      [
        path.join(publicActualIdentity.layoutRoot, 'evidence/candidate.json'),
        publicActualIdentity.candidateSha256,
      ],
    ])
      if (present(file)) inputs.set(file, sha);
    for (const [file, sha] of inputs) {
      const st = fs.lstatSync(file, { bigint: true });
      if (seen.has(file)) statEqual(seen.get(file), st);
      assertToolSeal(file, sha);
      if (!seen.has(file)) seen.set(file, st);
    }
    assert.deepEqual(modules.runtime.nativeMetadataEnvironment(), publicActualIdentity.environment);
  };
  const verifyComplete = async () => {
    await actualDiagnostics.timed('INPUT',verifyIdentity);
    assertExactInventory(bootstrap, await inventoryTree(request.readerRoot, { allowLinks: true }));
  };
  await verifyComplete();
  assertFreshActualLocations(request);
  await createOwnedDirectory(request.outputRoot);
  ownedOutput=request.outputRoot;ownedStat=fs.lstatSync(ownedOutput,{bigint:true});
  const attempt = {
    schemaVersion: 1,
    kind: 'PUBLIC79_CONTROLLED_ACTUAL22_ATTEMPT',
    requestSha256,
    coordinatorSha256: selfSha256,
    readerContentSha256: sealedDigest,
    approvalSha256: request.approvalSha256,
    pid: process.pid,
    nonce: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    retry: false,
    hardIsolation: false,
  };
  await writeActualReceipt(path.join(request.outputRoot, 'coordinator-attempt.json'), attempt);
  let control;
  try {
    control = await createOwnedActualControl(modules.stop,request.outputRoot,reader.check,verifyIdentity);
    stopControl=control;
    const ports = createActual22Ports(modules, {
      withZipTools: (operation) => withActualZipTools(request.powershellPath, operation),
      request,
      approval,
      archivePath,
      verifyReader: verifyComplete,
      verifyAfter: verifyComplete,
    });
    await runOwnedActualSequence(ports,control,reader.check);
    const result = {
      schemaVersion: 1,
      state: 'ACTUAL22_VERIFIED_NOT_PHASE_ACCEPTED',
      candidateSha256: publicActualIdentity.candidateSha256,
      archiveSha256: publicActualIdentity.archiveSha256,
      approvalSha256: request.approvalSha256,
      coordinatorSha256: selfSha256,
      readerContentSha256: sealedDigest,
      actualObservations: 22,
      requestSha256,
      retry: false,
      hardIsolation: false,
      endedAt: new Date().toISOString(),
    };
    return result;
  } catch (error) {
    try {
      if (control) await control.fail('COORDINATOR_FAILED');
    } catch {}
    throw error;
  }
}

function readSealedActualJson(file, expectedSha256) {
  assert.match(expectedSha256, /^[a-f0-9]{64}$/);
  const before = fs.lstatSync(file, { bigint: true });
  assert(before.isFile() && !before.isSymbolicLink());
  assert.equal(before.nlink, 1n);
  assert.equal(fs.realpathSync.native(file), file);
  const fd = fs.openSync(file, 'r');
  try {
    statEqual(before, fs.fstatSync(fd, { bigint: true }));
    const bytes = fs.readFileSync(fd);
    statEqual(before, fs.fstatSync(fd, { bigint: true }));
    statEqual(before, fs.lstatSync(file, { bigint: true }));
    assert.equal(
      crypto.createHash('sha256').update(bytes).digest('hex'),
      expectedSha256,
      'Sealed JSON bytes drift',
    );
    return JSON.parse(bytes.toString('utf8'));
  } finally {
    fs.closeSync(fd);
  }
}
async function writeActualReceipt(file, value) {
  await fs.promises.writeFile(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
// The third argument is an internal test policy, never accepted from a CLI request.
async function withActualZipTools(powershellPath, operation, tools = publicActualZipTools) {
  assert.equal(path.basename(powershellPath), 'pwsh.exe');
  const check = () => {
    assert.equal(
      hashFile(powershellPath, true),
      tools.powershellSha256,
      'PowerShell identity drift',
    );
    assert.equal(hashFile(tools.tarPath, true), tools.tarSha256, 'Windows tar identity drift');
    const dirs = tools.searchDirectories ?? [
      path.dirname(powershellPath),
      path.dirname(process.execPath),
      ...['C:/Windows/System32', 'C:/Windows/System', 'C:/Windows'].map((p) => path.resolve(p)),
    ];
    for (const dir of dirs)
      for (const name of ['pwsh', 'pwsh.com', 'pwsh.exe', 'pwsh.cmd', 'pwsh.bat']) {
        const candidate = path.join(dir, name);
        if (present(candidate)) {
          assert.equal(name, 'pwsh.exe', 'Shadow PowerShell command');
          assert.equal(
            hashFile(candidate, true),
            tools.powershellSha256,
            'Shadow PowerShell executable',
          );
        }
      }
  };
  check();
  const previous = { cwd: process.cwd(), path: process.env.PATH, ext: process.env.PATHEXT };
  let value;
  const errors = [];
  try {
    process.chdir(path.dirname(powershellPath));
    process.env.PATH = path.dirname(powershellPath) + path.delimiter + path.dirname(tools.tarPath);
    process.env.PATHEXT = '.EXE';
    value = await operation();
  } catch (error) {
    errors.push(error);
  } finally {
    try {
      process.chdir(previous.cwd);
    } catch (error) {
      errors.push(error);
    } finally {
      for (const [key, old] of [
        ['PATH', previous.path],
        ['PATHEXT', previous.ext],
      ])
        try {
          if (old === undefined) delete process.env[key];
          else process.env[key] = old;
        } catch (error) {
          errors.push(error);
        }
    }
  }
  try {
    check();
  } catch (error) {
    errors.push(error);
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1)
    throw new AggregateError(
      errors,
      'Operation, environment restoration or ZIP tool identity failed',
    );
  return value;
}


 return {
  runActualRequest,
  async complete(result){outputStillOwned();await writeActualReceipt(path.join(ownedOutput,'coordinator-result.json'),result);},
  async fail(){
   if(!ownedOutput)return;
   const errors=[];
   try{if(stopControl)await stopControl.fail('OWNED_ACTUAL_FAILED');}catch(error){errors.push(error);}
   try{outputStillOwned();
    await writeActualReceipt(path.join(ownedOutput,'coordinator-result.json'),{
    schemaVersion:1,state:'STOPPED_NOT_QUALIFIED',code:'PUBLIC79_OWNED_ACTUAL_FAILED',
    cleanupState:'UNKNOWN',retry:false,hardIsolation:false,endedAt:new Date().toISOString(),
    });
   }catch(error){errors.push(error);}
   if(errors.length)throw new AggregateError(errors,'Failure evidence or stop control unavailable');
  },
 };
}
