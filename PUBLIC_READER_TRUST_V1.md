# Public reader same-run trust v1

Accepted by explicit user approval on 2026-11-12 for implementation, independent
review and targeted preparation checks. This is an additive Public adapter rule,
not an amendment to the old R11 reader, measurements or acceptance standards.

## Fixed provenance before sealing

Only `constructRunLocalReader` in the reviewed control checkout can issue the
opaque owner. It runs the complete existing seed-only constructor: fixed product
source79da40105d480cce540ac636334dd9b6d3f54956, run attempt1, original image and eight
tool identities, existing seed/archive/member pins, independently rediscovered raw
dependency bytes, package instances and import topology, and exact approved profile
object9b2716123d15227808c35fe9dd24eb5393131192aca9aaa0f1d83a90db3077f4.
Only the four existing catalog byte changes are allowed. The original compiler,
profile admission checks and .d.ts preservation are unchanged. The new independent
closed copy has single-link files and confined relative junctions; the original
complete inventory includes every member without additional exclusions.

The reviewed workflow/control commit is the external trust root. The control Git
HEAD must match its run commit. Node preloads, NODE_PATH and execution flags refuse.
A caller hash/JSON receipt, a separate lease or a newly observed digest cannot
establish that provenance. A file digest identifies bytes, not human consent.

## Same-process, same-run lifetime

After all checks succeed, the constructor privately associates an empty opaque
token with a lease using a module-local WeakMap. The lease copies the verified full
physical inventory. It binds root and process/time-origin, GitHub run/attempt/control,
Node launch settings, source/control/seed snapshots and original tools/closure.
The full root-independent content digest is recorded for this construction only.
It is not required to equal a different build's temporary whole-tree digest.

`consumeRunLocalReader(owner, consumer)` removes the private token before use.
It checks the exact inventory and context before exposing the owned root/check
callback, and checks again after the awaited consumer. Consumers must await all
work and use `check` at existing stage/worker boundaries; no detached child work is
authorized. Any check/consumer failure latches STOPPED, even if caught by a consumer.
Wrong, copied, serialized, cross-process, repeated or concurrent owners refuse.
The exported lease helper alone provides consistency checks, not Public admission.

No transferable seal or user-supplied digest is accepted. A runner-local receipt
is informational; it cannot be reloaded as an owner in a later step/job/process.
The check-only CLI constructs, consumes a no-op with target-absence check, and
exits. A future actual coordinator must construct and consume in the same Node
process and preserve the original installer, opaque graph, stop and cleanup gates.

## Preserved acceptance and rollback

The old R11 static reader f3b38dfa119698daf1f0a2e942bf476922bee489bd334bde77e0463736cd5b75
and original source/evidence remain unchanged. Legacy `seed` still diagnoses its
historical e15e1bcd6ce9aa1897554b0fbcd3de67ab40ef11f886c71c44a5a8ac1543f8c4
pin; `owned` is explicit, not a fallback after legacy failure. Different generated
metadata does not excuse any dependency-byte/topology or within-run physical drift.

Frozen topology4 and ADR-019 installer requirements remain: exact dependencyRoots-
only replacement, original candidate/holdout/identity gates and actual22. This entry
never acquires/removes C:/CodeAtlas-P05-D5-R10. No Native rebuild, 406 remeasurement,
PACK, fixture publication, actual22, CI-reference switch or production access.
Failure preserves files/logs; no retry, automatic cleanup or UNKNOWN-to-SETTLED
conversion. Rollback disables only the new workflow/path and retains all receipts.
Snapshots do not prove OS handle confinement or atomic protection between checks.

## Evidence and public output

Targeted tests cover forged tokens, content/link/instance drift, context drift,
concurrent/repeated use, swallowed check errors, closed-copy topology and private
logs. Test doubles are not qualification evidence. Workflow is manual-only,
contents:read, standard windows-2025, 30min job/20min check; no artifact upload or
release permission. Output is typed bounded state/hash/count metadata only; raw
logs, inventory, paths and reader remain ephemeral on the runner.

Historical seed run43147262134 failed solely at the extra e15 whole-tree check,
observing d96881dc71fa5d0188ff0500160b44f7a126e81fc3796e05395f76407fe7abe0.
No old full inventory was retained: exact changed files are unknown. Official
pnpm11.19.0 writes clock-dependent workspace/modules metadata; that establishes
a mechanism, not a unique retrospective diff. New gate does not normalize files.

Authority references (unchanged frozen product):
- docs/handoff/adr/ADR-019-d5-exact-layout-ci-replay.md
- docs/superpowers/specs/2026-11-09-replay-topology-v4.md
- docs/superpowers/specs/2026-11-10-r11-actual-coordinator.md

These references are in tim-zxy/CodeAtlas at frozen source79da401. This document
controls only the approved additional Public binding. Phase1 remains4/21,
A6 NOT_QUALIFIED, E02 PROPOSED/uninstalled. No local test or reader-only CI closes
these gates. Fresh test/review/run evidence is tracked in CURRENT_STATUS.md.
