// Tokenless original-reader review. Never starts Native, mutates evidence or grants run authority.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { pathToFileURL } from "node:url";
const [source, work] = process.argv.slice(2);
assert(!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN);
const require = createRequire(import.meta.url),
  audit = { subprocess: 0, mutation: 0, network: 0 };
const deny = (kind) => () => {
  audit[kind]++;
  throw Error("READONLY_PACK_ROLE_REFUSED_" + kind.toUpperCase());
};
for (const name of [
  "spawn",
  "spawnSync",
  "exec",
  "execSync",
  "execFile",
  "execFileSync",
  "fork",
])
  require("node:child_process")[name] = deny("subprocess");
for (const name of [
  "writeFile",
  "appendFile",
  "mkdir",
  "mkdtemp",
  "rename",
  "copyFile",
  "unlink",
  "rm",
  "rmdir",
  "chmod",
  "chown",
  "symlink",
  "link",
  "truncate",
  "cp",
]) {
  for (const n of [name, name + "Sync"]) if (fs[n]) fs[n] = deny("mutation");
  if (fs.promises[name]) fs.promises[name] = deny("mutation");
}
for (const [mod, names] of [
  ["net", ["connect", "createConnection"]],
  ["dgram", ["createSocket"]],
  ["http", ["request", "get"]],
  ["https", ["request", "get"]],
])
  for (const name of names) require("node:" + mod)[name] = deny("network");
globalThis.fetch = deny("network");
syncBuiltinESMExports();
const json = (p) => JSON.parse(fs.readFileSync(p, "utf8")),
  hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex"),
  imp = (p) => import(pathToFileURL(path.join(source, p)).href);
const logical = "C:/CodeAtlas-P05-D5-R10";
const root = path.join(logical, "evidence");
let phase = "NATIVE_BUILD";
try {
  const layouts = await imp("scripts/helpers/native-refresh-ci-layout.mjs");
  const layout = await layouts.readRefreshCiPackLayoutAt(path.resolve(logical));
  const ctx = layouts.refreshCiFixtureContext(layout);
  const pack = await imp("scripts/helpers/native-refresh-ci-pack.mjs");
  await pack.verifyRefreshCiNativeBuildAt(layout, source);
  phase = "ORIGINAL_TRANSPORT_CORPUS";
  const replay = await imp(
    "packages/runtime/test/helpers/native-refresh-transport-replay.mjs",
  );
  const values = await replay.readRefreshTransportReplayCorpus(
    path.join(root, "corpus/artifacts/manifest.json"),
    path.join(root, "corpus/local-binding.json"),
    ctx,
  );
  const identity = values[0].identity;
  const memory = await imp("scripts/native-refresh-transport-memory.mjs");
  const transport = json(path.join(root, "candidate.json"));
  assert.deepEqual(
    await memory.buildRefreshTransportCandidate(
      path.join(root, transport.manifest.path),
      root,
      identity,
      ctx,
    ),
    transport,
  );
  const qual = json(path.join(root, "qualification.json"));
  assert.deepEqual(qual.failures, []);
  assert(qual.cases.every((c) => c.passed === true));
  assert.deepEqual(
    qual.cases.map((c) => c.name).sort(),
    [...memory.refreshTransportCases].sort(),
  );
  const raw = json(path.join(root, "raw.json")),
    held = json(path.join(root, "review/holdout.json"));
  assert.equal(raw.observations.length, 110);
  assert.deepEqual(raw.failures, []);
  assert.equal(held.observations.length, 22);
  assert.deepEqual(held.failures, []);
  assert.equal(held.candidateSha256, hash(path.join(root, "candidate.json")));
  assert.deepEqual(held.environment, transport.environment);
  assert.deepEqual(held.corpus, transport.corpus);
  assert.deepEqual(
    held.observations.map((c) => c.name).sort(),
    [...memory.refreshTransportCases].sort(),
  );
  phase = "ORIGINAL_TRANSPORT_PREFIX";
  const prefix = await replay.createRefreshTransportPrefixAudit(
      root,
      identity,
      ctx,
    ),
    origins = [];
  for (const row of [...raw.observations, ...held.observations]) {
    memory.validateRefreshTransportObservation(row, identity);
    if (row.name === "d-cancel") origins.push(await prefix(row));
    else assert.equal(row.outputProof, null);
  }
  assert.equal(origins.length, 6);
  assert.equal(new Set(origins.map((x) => x.artifactSha256)).size, 6);
  assert.equal(new Set(origins.map((x) => x.processNonce)).size, 6);
  for (const row of held.observations) {
    assert.equal(row.repetition, 0);
    assert(row.peakResidentBytes <= transport.reservationBytes);
  }
  phase = "ORIGINAL_PAIRED162";
  const pairedRoot = path.join(work, "READ_FULL162-evidence/stage/paired");
  const paired = json(path.join(pairedRoot, "candidate.json"));
  const pairedApi = await imp("scripts/native-memory-profile.mjs");
  assert.deepEqual(
    await pairedApi.buildNativeMemoryCandidate(
      path.join(pairedRoot, "manifest.json"),
      pairedRoot,
    ),
    paired,
  );
  const pairedHold = json(
    path.join(
      work,
      "READ_FULL162-evidence/stage/paired-holdout/observations.json",
    ),
  );
  assert.equal(pairedHold.observations.length, 27);
  assert.equal(
    pairedHold.candidateEvidenceDigest,
    hash(path.join(pairedRoot, "candidate.json")),
  );
  assert.deepEqual(pairedHold.failures, []);
  assert.deepEqual(pairedHold.environment, paired.environment);
  assert.deepEqual(pairedHold.corpora, paired.corpora);
  for (const { workspace, observation: r } of pairedHold.observations) {
    pairedApi.validateNativeMemoryObservation(r, workspace, paired.environment);
    assert(r.peakResidentBytes <= paired.reservationBytes);
    assert(
      paired.groups.some(
        (g) =>
          g.workspace === workspace &&
          g.caseName === r.name &&
          g.inputIdentity === r.corpusPayloadDigest,
      ),
    );
  }
  phase = "ORIGINAL_VERIFY90";
  const verifyRoot = path.join(work, "VERIFY90-evidence/stage/verify");
  const verification = json(path.join(verifyRoot, "candidate.json"));
  const verifyApi = await imp("scripts/native-refresh-verification-memory.mjs");
  const vi = await verifyApi.verificationEvidenceIdentity();
  assert.deepEqual(
    await verifyApi.buildVerificationCandidate(
      path.join(verifyRoot, "manifest.json"),
      verifyRoot,
      vi,
    ),
    verification,
  );
  const verifyHold = json(
    path.join(work, "VERIFY90-evidence/stage/verify-holdout/holdout.json"),
  );
  assert.equal(verifyHold.observations.length, 15);
  assert.deepEqual(verifyHold.failures, []);
  assert.equal(
    verifyHold.candidateSha256,
    hash(path.join(verifyRoot, "candidate.json")),
  );
  assert.deepEqual(verifyHold.environment, verification.environment);
  assert.deepEqual(verifyHold.corpus, verification.corpus);
  for (const r of verifyHold.observations) {
    verifyApi.validateVerificationObservation(r, vi);
    assert(r.peakResidentBytes <= verification.reservationBytes);
  }
  assert.deepEqual(audit, { subprocess: 0, mutation: 0, network: 0 });
  console.log(
    JSON.stringify({
      state: "ORIGINAL_REVIEW_CONSISTENT",
      data: {
        paired,
        verification,
        transport,
        fullPeak: Math.max(
          ...json(path.join(pairedRoot, "full.json")).observations.map(
            (r) => r.peakResidentBytes,
          ),
        ),
      },
      audit,
    }),
  );
} catch (e) {
  console.error(
    "READONLY_PACK_REVIEW_FAILED:" + phase + ":" + (e.code ?? e.name),
  );
  process.exitCode = 1;
}
