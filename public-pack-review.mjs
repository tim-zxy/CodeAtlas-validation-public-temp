import assert from "node:assert/strict";

// Operational wrapper budget only; original qualification limits remain unchanged.
export const reviewTimeoutMs = 20 * 60 * 1000;
export const reviewStages = Object.freeze([
  "NATIVE_BUILD", "ORIGINAL_TRANSPORT_CORPUS", "ORIGINAL_TRANSPORT_CANDIDATE",
  "ORIGINAL_TRANSPORT_HOLDOUT", "ORIGINAL_TRANSPORT_PREFIX",
  "ORIGINAL_PAIRED162", "ORIGINAL_VERIFY90", "COPIED_CATALOG", "COPIED_BINDING", "COMPLETE",
]);
export function assertPairedHoldoutGroup(candidate, workspace, row) {
  assert(["READ_SEAL", "FULL_TRANSPORT"].includes(workspace));
  // Same identity selection as original buildNativeMemoryCandidate grouping.
  const identity = workspace === "READ_SEAL"
    ? row.corpusPayloadDigest : candidate.corpora.FULL_TRANSPORT.digest;
  assert.match(identity ?? "", /^[a-f0-9]{64}$/);
  assert(candidate.groups.some(g => g.workspace === workspace &&
    g.caseName === row.name && g.inputIdentity === identity), "Paired holdout input drift");
}
export function reviewDiagnostics(stderr) {
  const text = Buffer.isBuffer(stderr) ? stderr.toString("utf8") : String(stderr ?? "");
  return text.slice(-65536).split(/\r?\n/).filter(line => {
    const fields = line.split(":");
    if (!reviewStages.includes(fields[1])) return false;
    return (fields[0] === "PACK_REVIEW_STAGE" && fields.length === 2) ||
      (fields[0] === "READONLY_PACK_REVIEW_FAILED" && fields.length === 3 &&
        /^[A-Za-z_]{2,80}$/.test(fields[2]));
  }).slice(-32);
}
