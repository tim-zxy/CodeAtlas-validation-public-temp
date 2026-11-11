import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'public-failure-test-')));
const { preserveFailureReports } = await import('./public-failure.mjs');
test('preserves worker stdout bytes and emits partial diagnostics scope', async () => {
  const stageRoot = path.join(root, 'positive'); await fs.mkdir(stageRoot); await fs.mkdir(path.join(stageRoot, 'workers'));
  const bytes = Buffer.from('{"stdout":"{\\"peakResidentBytes\\":123}\\n"}\n');
  await fs.writeFile(path.join(stageRoot, 'workers', '0001.json'), bytes);
  await fs.writeFile(path.join(stageRoot, 'ignore.sqlite'), 'unread database');
  const destination = path.join(root, 'positive-out');
  const result = await preserveFailureReports({ stageRoot, transportEvidenceRoot: path.join(root, 'absent-transport'), destination });
  assert.deepEqual(await fs.readFile(path.join(destination, 'stage/workers/0001.json')), bytes);
  assert(result.inventory.some(row => row.path === 'stage/workers/0001.json'));
  const receipt = JSON.parse(await fs.readFile(path.join(destination, 'failure-retention.json')));
  assert.equal(receipt.scope, 'PARTIAL_FAILURE_DIAGNOSTICS_NOT_COMPLETE_EVIDENCE');
  assert.equal(receipt.cleanup, 'UNKNOWN_OR_NOT_CONFIRMED');
});
test('unsafe filename refuses the whole save', async () => {
  const stageRoot = path.join(root, 'unsafe'); await fs.mkdir(stageRoot);
  await fs.writeFile(path.join(stageRoot, 'bad name.json'), '{}');
  await assert.rejects(preserveFailureReports({ stageRoot, destination: path.join(root, 'unsafe-out') }), /UNSAFE_REPORT_PATH/);
});
test('sensitive marker refuses preservation', async () => {
  const stageRoot = path.join(root, 'sensitive'); await fs.mkdir(stageRoot);
  await fs.writeFile(path.join(stageRoot, 'raw.json'), '{"token":"github_pat_12345678901234567890"}');
  await assert.rejects(preserveFailureReports({ stageRoot, destination: path.join(root, 'sensitive-out') }), /PUBLIC_CONTENT_REVIEW_FAILED/);
});
test('missing sources are explicitly partial', async () => {
  const result = await preserveFailureReports({ stageRoot: path.join(root, 'absent'), destination: path.join(root, 'missing-out') });
  assert.equal(result.partialSkipped.length, 2);
  assert(result.inventory.some(row => row.path === 'failure-retention.json'));
});

test('oversize reports are explicitly skipped', async () => {
  const stageRoot = path.join(root, 'large'); await fs.mkdir(stageRoot);
  const file = await fs.open(path.join(stageRoot, 'raw.json'), 'wx');
  try { await file.truncate(16 * 1024 * 1024 + 1); } finally { await file.close(); }
  const destination = path.join(root, 'large-out');
  const result = await preserveFailureReports({ stageRoot, destination });
  assert(result.partialSkipped.some(row => row.reason === 'REPORT_EXCEEDS_16_MIB'));
  assert(!result.inventory.some(row => row.path === 'stage/raw.json'));
});
test('directory links refuse preservation', async t => {
  const stageRoot = path.join(root, 'linked'); await fs.mkdir(stageRoot);
  const ownTarget = path.join(root, 'owned-target'); await fs.mkdir(ownTarget);
  try { await fs.symlink(ownTarget, path.join(stageRoot, 'alias'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('Link creation unavailable'); return; } throw error; }
  await assert.rejects(preserveFailureReports({ stageRoot, destination: path.join(root, 'linked-out') }), /REPORT_LINK_OR_NONREGULAR/);
});
