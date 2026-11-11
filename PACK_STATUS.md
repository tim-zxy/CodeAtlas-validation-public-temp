# Controlled PACK status

Run43005700469 at control3c3f406/source79da401 failed before profile adoption or original PACK Create. Frozen reader build, fixed asset download and seed/tool verification completed. The wrapper rejected valid empty stderr members during payload mapping; no numeric profile was adopted, no package was created or uploaded. Target asset is absent. Final process cleanup receipt was not reached; do not claim SETTLED for this attempt. Original406 evidence and old release assets are unchanged.

Offline diagnosis reproduced the exact failing assertion on the pinned original inventories:200 zero-byte stderr files. The original frozen pack contract permits nonnegative byte counts. The isolated wrapper fix changes only >0 to >=0 and adds an empty-stderr regression; negative counts, path, alias, size and SHA checks remain. Regression RED beforefix, four tests GREEN afterward; real full input metadata maps5577 unique members,954695422bytes, including154 original license members. No sampling or PACK was run by these checks.

This commit prepares the fix only. Do not rerun workflow automatically. Any new approved recovery must use a new hosted owner, preserve run43005700469, and keep the original once-only Create/no retry boundary. actual22, production installation and CI-reference changes remain outside scope.


## Read-only review recovery

Run 43007747317 stopped before profile adoption and PACK Create: the new read-only child wrapper hit its 300000 ms operational timeout. Exact internal stage was not recorded. No ZIP was uploaded; final cleanup remains UNKNOWN. All historical input assets and failed runs are retained.

The next control revision preserves every original validator and adds bounded fixed-stage diagnostics, captured stderr with allowlisted output, and a 20 minute read-only operational timeout within the existing 45 minute job limit. FULL holdout binding now uses the original whole-corpus digest; READ continues to use its row payload digest, matching original candidate grouping. This static wrapper defect is not proven to have caused the prior timeout.

Eight focused tests pass, including real lightweight child stderr suppression and invalid identity cases. All original 27 paired holdout identity groups match the corrected selector. No real qualification or PACK is executed by these tests. A newly approved recovery must use another fresh hosted runner and exclusive roots; failure stops without automatic retry. No actual22, production installation or CI reference switch is included.


## Independent optimized attempt

The canceled run43026387962 remains UNKNOWN for candidate adoption, PACK invocation and application cleanup. It is not resumed. A new standard hosted Windows job uses a fresh exclusive reader/work/C layout and a new control/run identity, retaining old evidence/assets. The original product source and all qualification gates remain frozen.

The first complete semantic review remains. The second supplemental full semantic repetition is replaced by the original contract's copied-catalog/profile/binding role plus immediate byte/physical-instance/topology checks. Actual emitted profiles and four admission boundaries are checked in a fresh module graph. Original PACK still performs all its original checks and an exclusive latch.

Operational limits: workflow65min, original review20min, copied review5min, PACK child20min. Before output/latch creation require30min in the controller's50min planning envelope; inspection requires10min. Failure, drift or UNKNOWN stops with no automatic retry. No hard whole-process-tree isolation or cleanup guarantee is claimed. Actual22, production install and product CI switch remain outside this operation. The reviewed control artifacts match27 unique focused tests; new copied-role integration is not claimed passed before execution.


## Result protocol correction

Run43057538451 completed/failure. Original full semantics and copied catalog/binding/physical boundary checks passed. Original PACK entry was invoked once; the outer controller stopped with GUARD_FAILED. CLI exit status and actual ZIP Create outcome are UNKNOWN because the old controller suppressed the inner status and tried to parse stdout.

A definite protocol defect was identified in the independent controller: the original pack CLI returns its result and writes the exclusive ZIP.manifest.json, but its main entry does not print JSON. Parsing silent stdout can therefore fail after a successful Create. This does not prove it was the only cause of this run. The publish step was skipped and the target release asset is absent; cleanup remains UNKNOWN and old runs/evidence are preserved.

The minimal correction consumes the original exclusive manifest after a successful child exit, with canonical path, single-link, bounded size and open/read/close identity checks. All candidate/holdout pins, inventory, ZIP digest and independent decode gates remain. A small independent child wrapper calls the identical supported runRefreshCi API once with the same pack arguments; on failure it emits only a fixed kind, public gate ID and source line, never raw message/stack. It does not replace any gate or Create implementation. Lightweight silent-success/API-once/invalid-sidecar/redaction tests and independent code review passed. Any subsequent execution is a separately assessed fresh attempt, never resumption or overwrite of a failed one;65min/20min operational bounds remain.


## Actual elapsed-time accounting correction

Run43064327968 stopped at OPERATION_BUDGET_EXHAUSTED before output/latch creation: no PACK entry or ZIP Create was called in that run. Complete original semantics (1139.944s), copied graph (91.287s) and identity checks passed. The slower runner made preparation exceed the old20min per-process pre-latch allowance; the65min job itself still had sufficient room. Cleanup has no final application receipt and remains UNKNOWN.

The operation keeps the same65min global ceiling,20min PACK soft limit and30min start reserve. A context-bound, exclusive clock is recorded immediately after control checkout, and all actual bootstrap/preparation time is charged to a60min usable wall envelope, leaving platform/post-job headroom. Missing, altered, future, expired or wrong-run clocks refuse; there is no per-process fallback. No qualification gate, formula, candidate, binding or Native identity changes. A separate5min read-only unit workflow exercises clock and receipt fixtures only; it does not build Native, sample, create a validation ZIP or upload artifacts. Further real attempts are assessed separately and preserve old UNKNOWNs.
