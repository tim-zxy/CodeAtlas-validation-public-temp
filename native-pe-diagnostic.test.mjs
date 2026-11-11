import test from "node:test";
import assert from "node:assert/strict";
import { inspectPe, comparePe } from "./native-pe-diagnostic.mjs";
function image() {
  const b = Buffer.alloc(0x600),
    pe = 0x80,
    opt = pe + 24,
    table = opt + 240;
  b.write("MZ");
  b.writeUInt32LE(pe, 60);
  b.write("PE\0\0", pe);
  b.writeUInt16LE(0x8664, pe + 4);
  b.writeUInt16LE(2, pe + 6);
  b.writeUInt32LE(101, pe + 8);
  b.writeUInt16LE(240, pe + 20);
  b.writeUInt16LE(0x20b, opt);
  b.writeUInt32LE(200, opt + 64);
  b.writeUInt32LE(16, opt + 108);
  b.writeUInt32LE(0x2000, opt + 112 + 48);
  b.writeUInt32LE(28, opt + 112 + 52);
  b.write(".text", table);
  b.writeUInt32LE(0x1000, table + 12);
  b.writeUInt32LE(0x100, table + 16);
  b.writeUInt32LE(0x200, table + 20);
  b.writeUInt32LE(0x60000020, table + 36);
  b.write(".rdata", table + 40);
  b.writeUInt32LE(0x2000, table + 52);
  b.writeUInt32LE(0x200, table + 56);
  b.writeUInt32LE(0x300, table + 60);
  b.writeUInt32LE(0x40000040, table + 76);
  b.fill(0xaa, 0x200, 0x300);
  b.writeUInt32LE(101, 0x304);
  b.writeUInt32LE(2, 0x30c);
  b.writeUInt32LE(64, 0x310);
  b.writeUInt32LE(0x340, 0x318);
  b.write("RSDS", 0x340);
  b.fill(1, 0x344, 0x354);
  b.writeUInt32LE(1, 0x354);
  b.write("C:/synthetic/symbols.pdb\0", 0x358);
  return b;
}
test("independent PE fixture: byte identity and metadata-only changes are distinguished", () => {
  const a = image(),
    b = Buffer.from(a);
  assert.equal(comparePe(a, b).classification, "BYTE_IDENTICAL");
  b.writeUInt32LE(102, 0x88);
  b.writeUInt32LE(201, 0xd8);
  b.writeUInt32LE(102, 0x304);
  b.fill(2, 0x344, 0x354);
  const r = comparePe(a, b);
  assert.equal(r.classification, "IDENTIFIED_PE_DEBUG_METADATA_ONLY");
  assert.equal(r.otherBytes, 0);
  assert.deepEqual(r.changedFields, {
    COFF_TIME_OR_REPRO_HASH: 1,
    OPTIONAL_CHECKSUM: 1,
    DEBUG_TIME_OR_HASH: 1,
    CODEVIEW_GUID_AGE: 16,
  });
  assert.equal(r.first.sections[0].sha256, r.second.sections[0].sha256);
  assert.equal(r.functionalEquivalence, "NOT_ESTABLISHED");
  assert.equal(r.formalGateEffect, "NONE");
  assert(!JSON.stringify(r).includes("synthetic/symbols"));
});
test("code, unrecognized data, PDB path or file-size changes cannot be hidden as metadata", () => {
  for (const offset of [0x205, 0x3d0, 0x359]) {
    const a = image(),
      b = Buffer.from(a);
    b[offset] ^= 1;
    const r = comparePe(a, b);
    assert.equal(r.classification, "NON_METADATA_DIFFERENCES");
    assert.equal(r.otherBytes, 1);
  }
  assert.equal(
    comparePe(image(), Buffer.concat([image(), Buffer.from([1])])).otherBytes,
    1,
  );
});
test("malformed offsets and overlapping metadata fail; REPRO entries prevent timestamp assumptions", () => {
  const executable = image();
  executable.writeUInt32LE(0x210, 0x318);
  assert.throws(() => inspectPe(executable), /EXECUTABLE_SECTION/);
  const b = image();
  b.writeUInt32LE(0x100000, 60);
  assert.throws(() => inspectPe(b));
  assert.throws(() => inspectPe(image().subarray(0, 200)));
  const repro = image();
  repro.writeUInt32LE(16, 0x30c);
  repro.writeUInt32LE(0, 0x310);
  assert.equal(
    inspectPe(repro).timestampIsWallClock,
    "NOT_ASSUMED_REPRO_ENTRY_PRESENT",
  );
  const overlap = image();
  overlap.writeUInt32LE(0x300, 0x318);
  overlap.write("RSDS", 0x300);
  assert.throws(() => inspectPe(overlap));
});
