import test from "node:test";
import assert from "node:assert/strict";
import { assertPairedHoldoutGroup, reviewDiagnostics, reviewTimeoutMs } from "./public-pack-review.mjs";
const readDigest = "a".repeat(64), fullDigest = "b".repeat(64);
const candidate = { corpora: { FULL_TRANSPORT: { digest: fullDigest } }, groups: [
  { workspace: "READ_SEAL", caseName: "read", inputIdentity: readDigest },
  { workspace: "FULL_TRANSPORT", caseName: "full", inputIdentity: fullDigest },
] };
test("paired holdout uses row identity for READ and corpus identity for FULL", () => {
  assertPairedHoldoutGroup(candidate, "READ_SEAL", { name: "read", corpusPayloadDigest: readDigest });
  assertPairedHoldoutGroup(candidate, "FULL_TRANSPORT", { name: "full" });
  assert.throws(() => assertPairedHoldoutGroup(candidate, "READ_SEAL", { name: "read", corpusPayloadDigest: fullDigest }));
  assert.throws(() => assertPairedHoldoutGroup(candidate, "READ_SEAL", { name: "read" }));
  assert.throws(() => assertPairedHoldoutGroup(candidate, "FULL_TRANSPORT", { name: "other" }));
  assert.throws(() => assertPairedHoldoutGroup({ ...candidate, corpora: { FULL_TRANSPORT: { digest: readDigest } } }, "FULL_TRANSPORT", { name: "full" }));
  assert.throws(() => assertPairedHoldoutGroup(candidate, "OTHER", { name: "full" }));
});
test("failure diagnostics retain only bounded fixed stage labels", () => {
  const lines = "secret-path-or-token\nPACK_REVIEW_STAGE:NATIVE_BUILD\nPACK_REVIEW_STAGE:ORIGINAL_TRANSPORT_CANDIDATE\nREADONLY_PACK_REVIEW_FAILED:ORIGINAL_PAIRED162:ERR_ASSERTION\nPACK_REVIEW_STAGE:UNKNOWN\n";
  assert.deepEqual(reviewDiagnostics(Buffer.from(lines)), [
    "PACK_REVIEW_STAGE:NATIVE_BUILD", "PACK_REVIEW_STAGE:ORIGINAL_TRANSPORT_CANDIDATE",
    "READONLY_PACK_REVIEW_FAILED:ORIGINAL_PAIRED162:ERR_ASSERTION"
  ]);
  assert.deepEqual(reviewDiagnostics(undefined), []);
  assert(reviewDiagnostics(lines.repeat(100)).length <= 32);
  assert.equal(reviewTimeoutMs, 20 * 60 * 1000);
});
