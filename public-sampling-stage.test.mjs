import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

test('import is inert and exports executeStage', async () => {
  const runner = await import('./public-sampling-stage.mjs');
  assert.equal(typeof runner.executeStage, 'function');
});
test('unknown stage refuses before identity or imports', async () => {
  const { executeStage } = await import('./public-sampling-stage.mjs');
  let called = false;
  await assert.rejects(executeStage('OTHER', { verifyIdentity: () => { called = true; } }), /Unsupported stage/);
  assert.equal(called, false);
});
test('identity callback is mandatory before source import', async () => {
  const { executeStage } = await import('./public-sampling-stage.mjs');
  await assert.rejects(executeStage('VERIFY90', { source: path.resolve('absent-source') }), /Identity callback required/);
});
test('identity rejection propagates before filesystem or source access', async () => {
  const { executeStage } = await import('./public-sampling-stage.mjs');
  const denied = new Error('identity denied');
  await assert.rejects(executeStage('READ_FULL162', {
    source: path.resolve('absent-source'), output: path.resolve('absent-output'),
    verifyIdentity: async () => { throw denied; },
  }), error => error === denied);
});
