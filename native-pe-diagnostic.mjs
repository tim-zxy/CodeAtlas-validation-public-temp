// Read-only PE comparison. Never executes or rewrites an image.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function span(bytes, offset, length) {
  assert(Number.isSafeInteger(offset) && Number.isSafeInteger(length));
  assert(
    offset >= 0 && length >= 0 && offset + length <= bytes.length,
    "PE_RANGE_INVALID",
  );
  return bytes.subarray(offset, offset + length);
}
export function inspectPe(bytes) {
  assert(Buffer.isBuffer(bytes) && bytes.length <= 128 * 1024 * 1024);
  assert.equal(span(bytes, 0, 2).toString("ascii"), "MZ");
  const pe = span(bytes, 60, 4).readUInt32LE();
  assert.equal(span(bytes, pe, 4).readUInt32LE(), 0x4550);
  const count = span(bytes, pe + 6, 2).readUInt16LE();
  assert(count > 0 && count <= 96);
  const optionalSize = span(bytes, pe + 20, 2).readUInt16LE();
  const optional = pe + 24;
  span(bytes, optional, optionalSize);
  const magic = span(bytes, optional, 2).readUInt16LE();
  assert([0x10b, 0x20b].includes(magic));
  const directoryBase = magic === 0x20b ? 112 : 96;
  assert(optionalSize >= directoryBase);
  const directoryCount = span(
    bytes,
    optional + directoryBase - 4,
    4,
  ).readUInt32LE();
  const ranges = [
    { kind: "COFF_TIME_OR_REPRO_HASH", offset: pe + 8, length: 4 },
    { kind: "OPTIONAL_CHECKSUM", offset: optional + 64, length: 4 },
  ];
  const sections = [];
  for (let index = 0; index < count; index++) {
    const header = optional + optionalSize + index * 40;
    span(bytes, header, 40);
    const name = span(bytes, header, 8).toString("ascii").replace(/\0.*$/s, "");
    const rawSize = bytes.readUInt32LE(header + 16),
      rawOffset = bytes.readUInt32LE(header + 20);
    span(bytes, rawOffset, rawSize);
    if (rawSize)
      assert(
        rawOffset >= optional + optionalSize + count * 40,
        "SECTION_OVERLAPS_HEADERS",
      );
    sections.push({
      name: /^[.A-Za-z0-9_$]{1,8}$/.test(name) ? name : "section-" + index,
      virtualAddress: bytes.readUInt32LE(header + 12),
      rawOffset,
      rawSize,
      characteristics: bytes.readUInt32LE(header + 36),
    });
  }
  const debug = [];
  if (directoryCount > 6) {
    assert(optionalSize >= directoryBase + 7 * 8);
    const directory = optional + directoryBase + 6 * 8;
    const rva = bytes.readUInt32LE(directory),
      size = bytes.readUInt32LE(directory + 4);
    if (size) {
      assert.equal(size % 28, 0);
      assert(size / 28 <= 256);
      const matches = sections.filter(
        (s) =>
          rva >= s.virtualAddress && rva - s.virtualAddress + size <= s.rawSize,
      );
      assert.equal(matches.length, 1, "DEBUG_DIRECTORY_UNMAPPED");
      const start = matches[0].rawOffset + rva - matches[0].virtualAddress;
      span(bytes, start, size);
      for (let at = start; at < start + size; at += 28) {
        const type = bytes.readUInt32LE(at + 12),
          length = bytes.readUInt32LE(at + 16),
          offset = bytes.readUInt32LE(at + 24);
        const record = {
          type,
          timeOrHashRaw: bytes.readUInt32LE(at + 4),
          bytes: length,
        };
        ranges.push({ kind: "DEBUG_TIME_OR_HASH", offset: at + 4, length: 4 });
        if (length) {
          const data = span(bytes, offset, length);
          assert(
            !sections.some(
              (s) =>
                (s.characteristics & 0x20000000) !== 0 &&
                offset < s.rawOffset + s.rawSize &&
                s.rawOffset < offset + length,
            ),
            "DEBUG_DATA_OVERLAPS_EXECUTABLE_SECTION",
          );
          record.payloadSha256 = hash(data);
          if (
            type === 2 &&
            length >= 24 &&
            data.subarray(0, 4).toString("ascii") === "RSDS"
          ) {
            record.guidHex = data.subarray(4, 20).toString("hex");
            record.age = data.readUInt32LE(20);
            record.pdbPathSha256 = hash(data.subarray(24));
            ranges.push({
              kind: "CODEVIEW_GUID_AGE",
              offset: offset + 4,
              length: 20,
            });
          } else if (type === 19 || type === 16) {
            ranges.push({
              kind: type === 19 ? "SYMBOL_FILE_HASH" : "REPRO_DEBUG_HASH",
              offset,
              length,
            });
          }
        }
        debug.push(record);
      }
    }
  }
  ranges.sort((a, b) => a.offset - b.offset);
  for (let i = 0; i < ranges.length; i++) {
    span(bytes, ranges[i].offset, ranges[i].length);
    if (i)
      assert(
        ranges[i - 1].offset + ranges[i - 1].length <= ranges[i].offset,
        "PE_METADATA_OVERLAP",
      );
  }
  return {
    bytes: bytes.length,
    sha256: hash(bytes),
    machine: bytes.readUInt16LE(pe + 4),
    magic,
    coffTimeOrHashRaw: bytes.readUInt32LE(pe + 8),
    checksum: bytes.readUInt32LE(optional + 64),
    timestampIsWallClock: debug.some((d) => d.type === 16)
      ? "NOT_ASSUMED_REPRO_ENTRY_PRESENT"
      : "NOT_PROVEN",
    sections: sections.map((s) => ({
      ...s,
      sha256: hash(span(bytes, s.rawOffset, s.rawSize)),
    })),
    debug,
    ranges,
  };
}
export function comparePe(a, b) {
  const first = inspectPe(a),
    second = inspectPe(b);
  const sameRanges =
    JSON.stringify(first.ranges) === JSON.stringify(second.ranges);
  const fields = {},
    samples = [];
  let changedBytes = 0,
    otherBytes = 0,
    cursor = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === b[i]) continue;
    changedBytes++;
    while (
      cursor < first.ranges.length &&
      i >= first.ranges[cursor].offset + first.ranges[cursor].length
    )
      cursor++;
    const range = first.ranges[cursor];
    const kind =
      sameRanges && range && i >= range.offset ? range.kind : "OTHER";
    fields[kind] = (fields[kind] ?? 0) + 1;
    if (kind === "OTHER") otherBytes++;
    const last = samples.at(-1);
    if (last && last.offset + last.bytes === i && last.kind === kind)
      last.bytes++;
    else if (samples.length < 24) samples.push({ offset: i, bytes: 1, kind });
  }
  return {
    scope: "PE_BYTE_CLASSIFICATION_ONLY",
    formalGateEffect: "NONE",
    functionalEquivalence: "NOT_ESTABLISHED",
    classification:
      changedBytes === 0
        ? "BYTE_IDENTICAL"
        : otherBytes === 0
          ? "IDENTIFIED_PE_DEBUG_METADATA_ONLY"
          : "NON_METADATA_DIFFERENCES",
    changedBytes,
    otherBytes,
    changedFields: fields,
    firstChangedRanges: samples,
    first,
    second,
  };
}
async function main() {
  const [, output] = process.argv.slice(2);
  const files = ["a", "b"].map((run) =>
    path.join(output, "native-" + run, "debug/codeatlas-native-analyzer.exe"),
  );
  for (const file of files)
    assert((await fs.stat(file)).size <= 128 * 1024 * 1024);
  const [a, b] = await Promise.all(files.map((file) => fs.readFile(file)));
  const report = {
    ...comparePe(a, b),
    buildReceipt: JSON.parse(
      await fs.readFile(path.join(output, "build-receipt.json"), "utf8"),
    ),
    qualification: "NOT_ATTEMPTED",
    sampling: "NOT_ATTEMPTED",
    binaryRewritten: false,
    persistedArtifact: "NONE",
  };
  await fs.writeFile(
    path.join(output, "pe-diagnostic.json"),
    JSON.stringify(report, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log("PUBLIC_PE_DIAGNOSTIC_BEGIN");
  console.log(JSON.stringify(report, null, 2));
  console.log("PUBLIC_PE_DIAGNOSTIC_END");
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  await main();
