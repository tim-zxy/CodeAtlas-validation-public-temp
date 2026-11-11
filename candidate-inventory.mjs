// Build-only diagnostic. No Native process, qualification worker or artifact upload.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
const [source, output] = process.argv.slice(2);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const receipt = JSON.parse(
  await fs.readFile(path.join(output, "build-receipt.json"), "utf8"),
);
const first = path.join(output, "native-a/debug/codeatlas-native-analyzer.exe");
const second = path.join(
  output,
  "native-b/debug/codeatlas-native-analyzer.exe",
);
const nativeHashes = await Promise.all(
  [first, second].map(async (file) => hash(await fs.readFile(file))),
);
const { discoverRefreshReplayDependenciesAt } = await import(
  pathToFileURL(
    path.join(
      source,
      "packages/runtime/test/helpers/native-refresh-transport-replay.mjs",
    ),
  )
);
const catalog = await discoverRefreshReplayDependenciesAt({
  repositoryPath: source,
  nativeExecutablePath: first,
  generatorRevision: "p05-refresh-replay-v4",
});
assert(
  catalog.dependencies.length > 0 && catalog.topology.instances.length > 0,
);
const inputs = path.join(output, "synthetic-inputs");
await fs.mkdir(inputs);
const values = [
  [
    "Echo.java",
    "final class Echo { static int twice(int x) { return x + x; } }\n",
  ],
  ["echo.py", "def twice(value):\n    return value + value\n"],
];
const inputFiles = [];
for (const [name, text] of values) {
  const bytes = Buffer.from(text);
  await fs.writeFile(path.join(inputs, name), bytes, { flag: "wx" });
  inputFiles.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
}
const manifest = {
  schemaVersion: 1,
  scope: "PUBLIC_SAFE_BUILD_ONLY_NOT_QUALIFIED",
  sourceCommit: receipt.sourceCommit,
  buildReceipt: receipt,
  syntheticInputs: inputFiles,
  nativeHashes,
  nativeByteReproducible: nativeHashes[0] === nativeHashes[1],
  nativeReproducibilityScope: "SAME_HOST_SAME_PATH_FRESH_TARGET_ONLY",
  crossHostReproducibility: "NOT_ESTABLISHED",
  typescriptByteReproducibility: "NOT_CHECKED",
  topologyDigest: catalog.topology.digest,
  dependencyCount: catalog.dependencies.length,
  dependencyCatalogSha256: hash(JSON.stringify(catalog.dependencies)),
  actual22: "NOT_ATTEMPTED",
  sampling: "NOT_ATTEMPTED",
  r11Equivalence: "NOT_ESTABLISHED",
  persistedArtifact: "NONE",
};
await fs.writeFile(
  path.join(output, "candidate-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
  { flag: "wx" },
);
console.log("PUBLIC_CANDIDATE_RESULT_BEGIN");
console.log(JSON.stringify(manifest, null, 2));
console.log("PUBLIC_CANDIDATE_RESULT_END");
if (!manifest.nativeByteReproducible)
  throw new Error("NATIVE_BYTE_REPRODUCIBILITY_NOT_ESTABLISHED");
