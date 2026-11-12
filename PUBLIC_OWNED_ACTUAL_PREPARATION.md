# Same-process Public actual22 preparation

Code/offline scope only,2026-11-12. This adds wiring under the already-approved
PUBLIC_READER_SAME_RUN_V1 rule; it changes no R11 measurement, candidate, installer,
acceptance criterion, profile, fixture release or CI workflow.

## Implemented call path

public-owned-actual-entry.mjs -> runOwnedActualRequest -> readiness guard -> trusted
constructRunLocalReader -> consumeRunLocalReader -> hash-check/import the original
helper and all actual modules from that single reader graph -> original sealed
request/approval, environment and fixed Public candidate/archive bindings ->
exclusive output/attempt -> original R9 stage/worker control -> DOWNLOAD ->
VERIFY_PACK -> INSTALL -> READ -> approved COLLECT -> VALIDATE -> VERIFY_AFTER ->
owner final post-consumption verification -> success receipt.

The new private adapter reuses the prepared public coordinator bodies and exact
existing downloader/installer/replay/report-validator calls. It accepts no injected
module graph, digest approval, owner DTO or alternate dependency root in the real
entry. The request's readerRoot must be the owner root. Original ZIP-tool seals,
temporary PATH/cwd restoration, layout confinement, file instance checks, immutable
inputs, attempt latch and absence/refusal rules remain.

R9 identity callbacks compose owner.check before the original input identity check.
Every existing stage/worker boundary therefore detects source/control/seed/context
or full-reader drift before permitting another operation. A running original
installer/worker is not preempted; its internal work and original bounds remain.
Checks do not add measurements, reconstruct evidence or change successful outputs.

Success receipt is outside consume: even a successful report followed by owner
post-check failure becomes STOPPED_NOT_QUALIFIED, never ACTUAL22_VERIFIED. Failure
keeps cleanup UNKNOWN and forbids retry; stop-receipt failure does not prevent an
attempt to preserve UNKNOWN in the still-owned output. Existing/partial results
are never overwritten. Unknown directory ownership stops receipt writes.

## Closed execution surface

Real releaseId/assetId are still null. The first readiness guard refuses before
construction, request reads, network or output (static control imports read pin
files). Source/candidate/Native/ZIP pins
remain the existing public79 identities; no historical full-reader e15 comparison
is imposed by this new path. Original R11 and old prepared coordinator are intact.

After separate approvals, real IDs, original approval validation and reviewed
fixed control/workflow exist, the intended invocation is (no Node startup flags):

    node control/public-owned-actual-entry.mjs collect <fixed-source-root> <fixed-pack-work> <sealed-request.json> <request-sha256> <coordinator-sha256>

coordinator-sha256 is public-owned-actual.mjs, not a caller-issued credential.
The launcher/control commit must also be reviewed and sealed externally. request
schema1 retains readerRoot,approvalPath,approvalSha256,outputRoot,powershellPath.
Source/work are fixed by the existing GitHub context; readerRoot is the newly
constructed sibling reader-freeze/reader. Output is fresh/exclusive, outside the
reader and every protected layout; approval remains outside output. No eval/import
startup flags or caller-provided module loader are accepted.

No CI configuration was changed and this command was NOT used for real data or
actual measurements. The eventual launch needs the existing private bounded-log
wrapper extended/reviewed for this entry; do not put raw child diagnostics into
public stdout. No real execution is ready just because this code exists.

## Minimum decisions still required

1. Create a non-latest prerelease in the temporary public repository with exact tag
   p05-d5-fixture-d88650f7126cf531fcd6eaf820c8e87a103c950d2f9fcd7a79ca914c2001f5df.
   Copy the existing reviewed ZIP without rebuilding: asset737583622,
   codeatlas-p05-d5-public-79da401.zip,246167030bytes,
   SHA256 b2e534f18d365f6fcd93f316e26833d4e56dfe172c82e5396d72e9fc5582e22c.
   Validate actual new release/asset IDs and original approval schema. Existing
   seed-tag asset cannot be relabelled or used as if it already had those IDs.
   Public asset retention remains until an explicitly authorized deletion; no
   deletion is implied. No new private/local data may be introduced.
2. Authorize one fresh standard Windows runner for actual22, exact pinned source,
   image/tools and same-process owner; reuse original qualification406/Native/ZIP
   only for their matching identity. Keep original installer and validation gates,
   stop on first failure/drift/UNKNOWN, no automatic retry or CI reference switch.
   Use synthetic inputs only, no user repository/database or production access.
3. Review the eventual manual workflow/private-log wrapper and exact saved public
   summary. Keep contents:read for execution; release creation is separate, never
   an excuse to widen its token. Proposed results are bounded hashes/count/status;
   detailed original outputs remain runner-local unless separately approved.

## Time/resource envelope, estimate only

Observed owned-reader-only preparation was3m19s (run43151784077); it did not install
or measure. The original installer still reconstructs candidate/holdout evidence;
this is not optional and its real workload is not just the22 actual observations.
Actual22 means22 formal results, not a total subprocess launch bound.

Owner boundary checks add full inventories/seed/source/tool checks. Two such
checks took about31s together in the preparation run; extrapolating dozens of
boundary checks adds roughly10�C25min, not yet measured with actual22. Avoid claiming
that this is free or fits every soft child limit. Existing worker60s and Native
request10s are preserved and do not bound an entire INSTALL or the whole job.

Recommend a120min outer job envelope for the first combined run, rough60�C120min
planning range, not a proven maximum or new acceptance threshold. Job cancellation
may lose final cleanup receipts and must remain UNKNOWN. No whole-batch hard RAM,
process-tree or network isolation is claimed. CPU/RAM/disk overhead and runner
quota/policy must be checked at execution. No build,406 resampling or PACK follows.

## Offline evidence

Synthetic sequence tests cover exact original stages/APIs, failures at all phases,
owner drift before/after and during download, no later install/worker, final-owner
refusal before success receipt, and bounded closed-launcher rejection. Real fixture
IDs remain absent. Test doubles never produce real quality or cleanup evidence.
Independent review found a missing owner boundary callback; it was fixed and
narrowly re-reviewed without remaining P1/P2. Fresh results are in CURRENT_STATUS.md.
Real full-bridge installation/measurement has NOT been tested. Phase1 remains4/21,
A6 NOT_QUALIFIED,E02 PROPOSED/uninstalled. No cloud run or external publication
was triggered by this preparation.

## Later explicit execution approval and real fixture binding

The user subsequently approved creation of this exact public fixture and one
actual22 on a fresh standard Windows runner. Historical null-ID/not-authorized
statements above describe the earlier preparation checkpoint only. The implemented
launcher now has fixed real release442510821/asset738119268, unchanged ZIP and full
original approval. CURRENT_STATUS.md records exact pins, tests and dispatch/result.
Manual workflow120min/step110min and typed private-log wrapper are now prepared;
no permission or quality gate is widened. A failure/UNKNOWN consumes this attempt,
never authorizes another dispatch. Source79da401, old R11 and all original evidence
remain fixed. Public fixture creation alone is not actual/phase acceptance.

## Failed request preparation and preserved attempt

The one approved job43158945120 failed in REQUEST before calling the reader/actual
entry. No retry occurred. Two exact attributes now preserve the already-approved
JSON/coordinator bytes under Windows checkout; a self-owned Git test proves that
defect/fix, but unretained private logs prevent a conclusive historical root cause.
New fixed stage/code diagnostics aid a future explicitly coordinated attempt
without publishing raw logs. No digest, installer, observation, threshold, asset or
qualification standard changed. See CURRENT_STATUS.md for exact evidence/state.
