import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { assertPublicBytes } from './public-seed.mjs';

const limit = 16 * 1024 * 1024;
const transportNames = ['qualification.json', 'raw.json', 'input-feasibility.json', 'evidence-manifest.json', 'candidate.json', 'candidate-reconstructed.json'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => {
  for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(a[key], b[key], 'REPORT_CHANGED');
};
function safeName(name) {
  assert(/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(name) && !name.includes('..') && !name.endsWith('.') &&
    !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name), 'UNSAFE_REPORT_PATH');
}
async function checkedInfo(file, directory) {
  const stat = await fs.lstat(file, { bigint: true });
  assert(!stat.isSymbolicLink() && (directory ? stat.isDirectory() : stat.isFile()), 'REPORT_LINK_OR_NONREGULAR');
  assert.equal(await fs.realpath(file), file, 'REPORT_PATH_ALIAS');
  return stat;
}
function disjoint(a, b) {
  const relative = path.relative(a, b);
  return relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative);
}

export async function preserveFailureReports({ stageRoot, transportEvidenceRoot, destination }) {
  assert.equal(path.resolve(destination), destination, 'ABSOLUTE_DESTINATION_REQUIRED');
  await checkedInfo(path.dirname(destination), true);
  const sources = [['stage', stageRoot], ['transport', transportEvidenceRoot]];
  for (const [, root] of sources) if (root !== undefined) {
    assert.equal(path.resolve(root), root, 'ABSOLUTE_SOURCE_REQUIRED');
    assert(disjoint(root, destination) && disjoint(destination, root), 'REPORT_ROOTS_OVERLAP');
  }
  await fs.mkdir(destination); // EEXIST refuses any restart or adoption.
  const partialSkipped = [], files = [], inventory = [];
  async function walk(root, prefix, relative = '') {
    const directory = path.join(root, relative);
    const before = await checkedInfo(directory, true);
    const entries = (await fs.readdir(directory)).sort();
    const seen = new Set();
    for (const name of entries) {
      safeName(name);
      assert(!seen.has(name.toLowerCase()), 'REPORT_CASE_ALIAS'); seen.add(name.toLowerCase());
      const rel = relative ? relative + '/' + name : name;
      const file = path.join(root, rel);
      const stat = await fs.lstat(file, { bigint: true });
      assert(!stat.isSymbolicLink(), 'REPORT_LINK_OR_NONREGULAR');
      if (stat.isDirectory()) await walk(root, prefix, rel);
      else if (name.endsWith('.json')) files.push({ file, path: prefix + '/' + rel });
      // Other files, including SQLite/WAL, are never opened.
    }
    same(before, await checkedInfo(directory, true));
  }
  for (const [prefix, root] of sources) {
    if (root === undefined) { partialSkipped.push({ scope: prefix, reason: 'SOURCE_MISSING' }); continue; }
    try { await checkedInfo(root, true); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      partialSkipped.push({ scope: prefix, reason: 'SOURCE_MISSING' }); continue;
    }
    if (prefix === 'stage') await walk(root, prefix);
    else {
      const before = await checkedInfo(root, true);
      // Transport corpus, databases and unknown children are deliberately excluded.
      for (const name of transportNames) {
        const file = path.join(root, name);
        try { await checkedInfo(file, false); files.push({ file, path: prefix + '/' + name }); }
        catch (error) {
          if (error.code !== 'ENOENT') throw error;
          partialSkipped.push({ scope: prefix, path: name, reason: 'REPORT_MISSING' });
        }
      }
      same(before, await checkedInfo(root, true));
    }
  }
  for (const entry of files) {
    const before = await checkedInfo(entry.file, false);
    if (before.size > BigInt(limit)) {
      partialSkipped.push({ path: entry.path, reason: 'REPORT_EXCEEDS_16_MIB' }); continue;
    }
    const handle = await fs.open(entry.file, 'r');
    let bytes;
    try {
      same(before, await handle.stat({ bigint: true }));
      const chunks = [];
      let total = 0;
      while (true) {
        const chunk = Buffer.alloc(Math.min(64 * 1024, limit + 1 - total));
        const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
        if (!bytesRead) break;
        total += bytesRead;
        assert(total <= limit, 'REPORT_GREW_BEYOND_16_MIB');
        chunks.push(chunk.subarray(0, bytesRead));
      }
      bytes = Buffer.concat(chunks, total);
      same(before, await handle.stat({ bigint: true }));
      same(before, await checkedInfo(entry.file, false));
    } finally { await handle.close(); }
    assert.equal(BigInt(bytes.length), before.size, 'REPORT_CHANGED');
    assertPublicBytes(bytes);
    const target = path.join(destination, entry.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes, { flag: 'wx' });
    inventory.push({ path: entry.path, bytes: bytes.length, sha256: digest(bytes) });
  }
  const receipt = { schemaVersion: 1, scope: 'PARTIAL_FAILURE_DIAGNOSTICS_NOT_COMPLETE_EVIDENCE',
    cleanup: 'UNKNOWN_OR_NOT_CONFIRMED', partial: true, partialSkipped, inventory: [...inventory] };
  const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + '\n');
  assertPublicBytes(bytes);
  await fs.writeFile(path.join(destination, 'failure-retention.json'), bytes, { flag: 'wx' });
  inventory.push({ path: 'failure-retention.json', bytes: bytes.length, sha256: digest(bytes) });
  return { inventory, partialSkipped, scope: receipt.scope, cleanup: receipt.cleanup };
}

