import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const expected = { READ_FULL162: [65, 70, 27], VERIFY90: [75, 15], TRANSPORT154: [22, 110, 22] };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Only the trusted parent coordinator supplies identity verification. Importing
// this module never imports source modules or starts a workload.
export async function executeStage(stage, options = {}) {
  assert.ok(Object.hasOwn(expected, stage), 'Unsupported stage');
  const { source, output, seed, verifyIdentity } = options;
  assert.equal(typeof verifyIdentity, 'function', 'Identity callback required');
  await verifyIdentity();
  for (const root of [source, output]) {
    assert.equal(path.resolve(root), root, 'Absolute canonical paths required');
    assert.ok(fs.lstatSync(root).isDirectory());
    assert.equal(fs.realpathSync(root), root);
  }
  assert.match(seed.controllerSha256, /^[a-f0-9]{64}$/);
  const save = (name, value) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const read = name => JSON.parse(fs.readFileSync(name, 'utf8'));
  const load = relative => import(pathToFileURL(path.join(source, relative)).href);
  let control = options.control;
  let sequence = 0;
  let workerActive = false;
  const result = { schemaVersion: 1, stage, status: 'NOT_QUALIFIED', expectedCoverage: expected[stage], coverage: [], cleanup: 'NOT_PROVEN', automaticRetry: false };
  // Exclusive receipt prevents accidental restart into a prior attempt.
  save('stage-start.json', { stage, startedAt: new Date().toISOString() });
  fs.mkdirSync(path.join(output, 'workers'));
  const child = async (relative, args, tag) => {
    assert.equal(workerActive, false, 'Concurrent workers forbidden');
    await verifyIdentity();
    workerActive = true;
    let record;
    try {
      const value = spawnSync(process.execPath, [path.join(source, relative), ...args], {
        cwd: source, encoding: 'utf8', timeout: 60_000, maxBuffer: 10_000_000, windowsHide: true,
      });
      record = { tag, status: value.status, signal: value.signal, error: value.error?.message ?? null,
        stdout: value.stdout ?? '', stderr: value.stderr ?? '',
        // These are offline synthetic Node workers. An exit is not a process-tree proof.
        cleanupState: value.error || value.signal || value.status === null ? 'UNKNOWN' : 'NODE_EXIT_OBSERVED' };
      save('workers/' + String(++sequence).padStart(4, '0') + '.json', record);
      assert.notEqual(record.cleanupState, 'UNKNOWN', 'Worker cleanup unknown');
      assert.equal(record.status, 0, 'Worker failed');
      await verifyIdentity();
      return record;
    } finally { workerActive = false; }
  };
  try {
    if (!control) {
      const stop = await load('scripts/helpers/native-refresh-r9-stop.mjs');
      control = await stop.createR9StopControl(output, verifyIdentity);
    }
    const run = async (label, operation) => {
      await verifyIdentity();
      const value = await control.stage(label, operation);
      await verifyIdentity();
      return value;
    };
    if (stage === 'READ_FULL162') {
      const calibration = await load('scripts/helpers/native-memory-calibration.mjs');
      const paired = await load('scripts/native-memory-profile.mjs');
      const collector = await load('scripts/native-memory-observations.mjs');
      const worker = (workspace, name, repetition) => child(workspace === 'READ_SEAL'
        ? 'packages/runtime/test/helpers/native-metadata-worker.mjs'
        : 'packages/providers/test/helpers/native-full-v3-memory-worker.mjs', [name], workspace + ':' + name + ':' + repetition);
      fs.mkdirSync(path.join(output, 'paired'));
      const first = await run('READ65', () => calibration.benchNativeMetadataMemory((n, r) => worker('READ_SEAL', n, r), control, seed.controllerSha256));
      save('paired/read.json', first);
      const second = await run('FULL70', () => calibration.benchNativeFullV3Memory((n, r) => worker('FULL_TRANSPORT', n, r), control, seed.controllerSha256));
      save('paired/full.json', second);
      const manifest = { schemaVersion: 1, policyRevision: paired.memoryPolicyRevision, environment: first.environment,
        corpora: await paired.currentMemoryCorpora(), requiredCases: paired.requiredMemoryCases,
        reports: [['read.json', 'READ_SEAL'], ['full.json', 'FULL_TRANSPORT']].map(([file, workspace]) => ({ path: file,
          sha256: hash(fs.readFileSync(path.join(output, 'paired', file))), workspace, purpose: 'calibration',
          command: 'public-sampling-stage READ_FULL162 original offline worker, five repetitions',
          collectionConditions: 'Serial original workers with independently pinned controller; no profile installation' })), priorApprovals: [] };
      save('paired/manifest.json', manifest);
      const root = path.join(output, 'paired');
      const candidate = await paired.buildNativeMemoryCandidate(path.join(root, 'manifest.json'), root);
      save('paired/candidate.json', candidate);
      const held = await run('PAIRED_HOLDOUT27', () => collector.collectNativeMemoryObservations({ mode: 'candidate',
        candidatePath: path.join(root, 'candidate.json'), outputDirectory: path.join(output, 'paired-holdout') },
        async (w, n) => { const value = await worker(w, n, 'holdout'); return { ...value, exitCode: value.status }; }, control));
      assert.equal(held.passed, true);
      assert.deepEqual(await paired.buildNativeMemoryCandidate(path.join(root, 'manifest.json'), root), candidate);
      result.coverage = [first.observations.length, second.observations.length, held.observations.length];
    } else if (stage === 'VERIFY90') {
      const verification = await load('scripts/native-refresh-verification-memory.mjs');
      const identity = await verification.verificationEvidenceIdentity();
      const root = path.join(output, 'verify'); fs.mkdirSync(root);
      const worker = (name, repetition) => child('packages/runtime/test/helpers/native-refresh-verification-worker.mjs', ['offline', name, String(repetition)], 'VERIFY:' + name + ':' + repetition);
      const raw = await run('VERIFY75', () => verification.benchVerificationMemory(path.join(root, 'raw.json'), worker, control, identity));
      save('verify/manifest.json', { schemaVersion: 1, workspace: 'REFRESH_VERIFY', environment: identity.environment, corpus: identity.corpus,
        reports: [{ path: 'raw.json', sha256: hash(fs.readFileSync(path.join(root, 'raw.json'))) }], priorApprovals: [] });
      const candidate = await verification.buildVerificationCandidate(path.join(root, 'manifest.json'), root, identity);
      save('verify/candidate.json', candidate);
      await run('VERIFY_HOLDOUT15', () => verification.collectVerificationObservations(path.join(root, 'candidate.json'), path.join(output, 'verify-holdout', 'artifacts'), path.join(output, 'verify-holdout', 'holdout.json'), worker, identity, control));
      assert.deepEqual(await verification.buildVerificationCandidate(path.join(root, 'manifest.json'), root, identity), candidate);
      result.coverage = [raw.observations.length, read(path.join(output, 'verify-holdout', 'holdout.json')).observations.length];
    } else {
      const layouts = await load('scripts/helpers/native-refresh-ci-layout.mjs');
      const pack = await load('scripts/helpers/native-refresh-ci-pack.mjs');
      const transport = await load('packages/runtime/test/helpers/native-refresh-transport-replay.mjs');
      const original = await layouts.readRefreshCiPackLayoutAt(seed.root);
      await pack.verifyRefreshCiNativeBuildAt(original, source);
      const layout = await run('LAYOUT', () => layouts.acquireRefreshCiLayoutAt({
        root: layouts.refreshCiLayoutRootForRevision('p05-d5-exact-layout-v10'), nativeSourcePath: original.nativePath, nativeSha256: seed.nativeSha256 }));
      await layouts.verifyRefreshCiLayoutOwnership(layout);
      await run('TRANSPORT_QUAL22_CALIB110', () => transport.runRefreshTransportCommand(['bench', layout.evidenceRoot], layout.fixtureContext, control, 'p05-refresh-replay-v4'));
      fs.copyFileSync(path.join(original.evidenceRoot, 'native-build.json'), path.join(layout.evidenceRoot, 'native-build.json'), fs.constants.COPYFILE_EXCL);
      await pack.verifyRefreshCiNativeBuildAt(layout, source);
      const candidatePath = path.join(layout.evidenceRoot, 'candidate.json');
      const manifestPath = path.join(layout.evidenceRoot, 'evidence-manifest.json');
      const candidate = await run('TRANSPORT_CANDIDATE', () => transport.runRefreshTransportCommand(['candidate', manifestPath, layout.evidenceRoot, candidatePath], layout.fixtureContext, control));
      const ci = await load('scripts/native-refresh-ci.mjs');
      const raw = read(path.join(layout.evidenceRoot, 'raw.json'));
      save('transport-candidate-input-feasibility.json', ci.checkRefreshCiCandidateBudget(layout.fixtureContext.memoryBudgetBytes, candidate.reservationBytes, raw.observations));
      const holdout = path.join(output, 'transport-holdout');
      await run('TRANSPORT_HOLDOUT22', () => transport.runRefreshTransportCommand(['collect', 'candidate', candidatePath, holdout], layout.fixtureContext, control));
      const reproduced = await run('TRANSPORT_RECONSTRUCT', () => transport.runRefreshTransportCommand(['candidate', manifestPath, layout.evidenceRoot, path.join(layout.evidenceRoot, 'candidate-reconstructed.json')], layout.fixtureContext, control));
      assert.deepEqual(reproduced, candidate);
      result.coverage = [read(path.join(layout.evidenceRoot, 'qualification.json')).cases.length, raw.observations.length, read(path.join(holdout, 'holdout.json')).observations.length];
      result.transportEvidenceRoot = layout.evidenceRoot;
    }
    assert.deepEqual(result.coverage, expected[stage], 'Incomplete stage coverage');
    await verifyIdentity();
    result.status = 'CANDIDATES_REVIEW_REQUIRED';
    return result;
  } catch (error) {
    result.failureCode = 'STAGE_FAILED';
    if (control) await control.fail(stage + ':FAILED');
    throw error;
  } finally {
    result.workerStarts = sequence;
    save('stage-result.json', result);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  console.error('Trusted coordinator must supply identity verification to executeStage.');
  process.exitCode = 1;
}

