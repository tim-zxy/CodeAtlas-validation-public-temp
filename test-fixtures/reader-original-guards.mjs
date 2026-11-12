// Test-only unchanged guard excerpts from CodeAtlas79da401 .github/qualification/r11-staged-pack.mjs.
// Full production helper and its configuration are loaded only from the frozen reader.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function confinedPath(root, relative) {
  assert.equal(path.resolve(root), root, 'Noncanonical owner root');
  assert.equal(typeof relative, 'string');
  assert(relative.length && !relative.includes('\\') && !relative.includes('\0'));
  assert(!path.isAbsolute(relative) && !/^[A-Za-z]:/.test(relative));
  assert(relative.split('/').every((part) => part && part !== '.' && part !== '..'));
  const resolved = path.resolve(root, relative);
  assert(resolved.startsWith(root + path.sep), 'Path escaped owner');
  return resolved;
}

const hashBuffer = Buffer.alloc(65536);
export function hashFile(file, allowHardlinks = false) {
  const before = fs.lstatSync(file, { bigint: true });
  assert(before.isFile() && !before.isSymbolicLink(), 'Nonregular protected file');
  if (!allowHardlinks) assert.equal(before.nlink, 1n, 'Protected file has hard links');
  assert.equal(fs.realpathSync.native(file), file, 'Protected path alias');
  const fd = fs.openSync(file, 'r'),
    digest = crypto.createHash('sha256');
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs', 'nlink'])
      assert.equal(opened[key], before[key], 'File changed before open');
    for (;;) {
      const size = fs.readSync(fd, hashBuffer, 0, hashBuffer.length, null);
      if (!size) break;
      digest.update(hashBuffer.subarray(0, size));
    }
    const after = fs.fstatSync(fd, { bigint: true }),
      current = fs.lstatSync(file, { bigint: true });
    for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs', 'nlink']) {
      assert.equal(after[key], before[key], 'File changed during hashing');
      assert.equal(current[key], before[key], 'File replaced during hashing');
    }
    return digest.digest('hex');
  } finally {
    fs.closeSync(fd);
  }
}

export async function inventoryTree(root, { allowLinks = false } = {}) {
  assert.equal(fs.realpathSync.native(root), root, 'Inventory root alias');
  const files = [],
    links = [],
    directories = [],
    identities = [];
  function visit(directory, relative = '') {
    for (const name of fs.readdirSync(directory).sort()) {
      const rel = relative ? relative + '/' + name : name,
        file = confinedPath(root, rel);
      const st = fs.lstatSync(file, { bigint: true });
      if (st.isSymbolicLink()) {
        assert(allowLinks, 'Linked payload member');
        const target = fs.realpathSync.native(file),
          targetRel = path.relative(root, target).split(path.sep).join('/');
        confinedPath(root, targetRel);
        links.push({ path: rel, target: targetRel });
      } else if (st.isDirectory()) {
        assert.equal(fs.realpathSync.native(file), file, 'Directory alias');
        directories.push(rel);
        visit(file, rel);
      } else {
        assert(st.isFile(), 'Unsupported file type');
        const sha256 = hashFile(file);
        files.push({ path: rel, bytes: Number(st.size), sha256 });
      }
      identities.push({
        path: rel,
        dev: String(st.dev),
        ino: String(st.ino),
        mtimeNs: String(st.mtimeNs),
        ctimeNs: String(st.ctimeNs),
        nlink: String(st.nlink),
      });
    }
  }
  visit(root);
  for (const list of [files, links, identities])
    list.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  directories.sort();
  return { files, links, directories, identities };
}

export function assertExactInventory(expected, actual) {
  assert.deepEqual(actual, expected, 'Inventory or physical identity changed');
}
export function assertToolSeal(file, expected) {
  assert.match(expected, /^[a-f0-9]{64}$/);
  assert.equal(hashFile(file), expected, 'Tool identity changed');
}
export function assertSeparateRoots(left, right) {
  for (const [a, b] of [
    [left, right],
    [right, left],
  ]) {
    assert.equal(path.resolve(a), a);
    assert.equal(path.resolve(b), b);
    const rel = path.relative(a, b);
    assert(
      rel && (path.isAbsolute(rel) || rel === '..' || rel.startsWith('..' + path.sep)),
      'Overlapping protected roots',
    );
  }
}
export async function createOwnedDirectory(root) {
  assert.equal(path.resolve(root), root, 'Noncanonical new root');
  assert.equal(
    fs.realpathSync.native(path.dirname(root)),
    path.dirname(root),
    'New root parent alias',
  );
  await fs.promises.mkdir(root);
  assert.equal(fs.realpathSync.native(root), root);
}

