# New candidate storage and qualification preparation

Status: design and synthetic transport proof only. No actual candidate retained,
published or qualified. No original R11 file, profile, approval or evidence changed.

## Minimal storage path

Build one exact public-source candidate in a clean controlled Windows job, then
retain its unchanged Native binary plus the complete reader/input closure. Never
rebuild between calibration, independent holdout, PACK and actual22. Identity is
full raw SHA256, not a normalized PE/code-only hash or a candidate Boolean.

Record source commit, all lock bytes, exact compiler/tool/SDK/image seals, complete
raw file inventory and dependency topology. Current experiment receipts are only
diagnostics, not qualified opaque build/capture owners. Use existing authenticated
constructors and prebuilt build-receipt verification; never synthesize authority
from a JSON receipt. Fail if a new host cannot match the required identities.

Prefer a dedicated prerelease, not latest, in this public validation repository.
Use content-addressed asset names; after upload bind actual repository/release/asset
IDs, asset name and size, complete SHA256, tag and target commit. Download by the
pinned asset ID, bound bytes before parsing/extraction, verify the exact checked
bytes, topology and seals before and after consumption. Never replace/clobber an
existing asset or silently fall back to a name-only URL, old R8/R11 or a rebuild.
A hash authenticates bytes, not permission or qualification.

This repository's releases are not immutable. Administrative mutation remains
possible; ID/tag/size/hash checks must refuse it. No immutable setting, token scope,
ACL or repository permission has been changed. Release storage/bandwidth has no
total-size limit in the published documentation; each file must remain under2GiB
and each release permits at most1000 assets. Oversize output must stop for review,
not be silently repartitioned into an unsupported qualification layout.
Avoid Actions artifacts/cache and LFS while their remaining allowances are unknown.
Reference: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases

The probe proves the current operator's existing credential can publish/read a
safe tiny asset. It does NOT prove or authorize hosted-runner write permission.
Publishing credentials must not be exposed to compiler/package build scripts.
Before a real build-and-save run, explicitly settle a least-privilege publishing
phase; no new PAT/secret, job contents:write or other permission is enabled here.

## Public-safe allowlist and retention

Construct new materials from the pinned already-public source and reviewed
synthetic corpus. Exclude original local readers/archives/databases/process logs,
home/cache directories, copied local build receipts, personal absolute paths,
credentials, runtime dumps and arbitrary ignored files. Include required project
and third-party license notices. Review the exact final inventory and byte output,
not only a no-hit regex scan. No original input is sanitized and relabeled as the
same R11 identity. If required private bytes cannot be removed without breaking
binding, stop and choose a new reviewed candidate/contract instead.

The two Echo smoke files are NOT the complete qualification corpus. Real inputs
must use the unchanged existing READ/FULL/VERIFY/Transport definitions and support
closure. Do not omit negative, failure/recovery, cancellation or holdout classes.

Releases have no automatic seven-day expiry. Seven days is a review checkpoint,
not a deletion guarantee. Keep the tiny probe until an explicit cleanup decision;
keep real candidate/evidence through qualification and handoff under an approved
retention policy. No automatic release/tag/evidence deletion is installed. Public
information may remain in caches/copies after later deletion; only public-safe
bytes may be uploaded in the first place. GitHub log retention is not configured
or guaranteed here; durable safe manifests must identify their retention separately.

## Current binding gaps

The existing R11 coordinator pins tim-zxy/CodeAtlas, exact R11 candidate/asset/body
hashes and layout11. It cannot be pointed at this repo/new binary by renaming files.
Prepare a separate, explicitly fixed candidate bridge using existing verification
functions; preserve the R11 entry and all historical pins. Review actual repository,
asset, source, tool and corpus identities before approval. This plan installs no
new generic trust/approval issuer and changes no frozen contract.

Current layout routing supports v1..v11; only v10/v11 select generator4. Do not invent
v12 or reuse old data as a new candidate. First determine whether an existing full
layout format can safely instantiate the new frozen bytes on a clean host with a
new attempt/candidate identity, keeping original local volumes forbidden. If a
format/finite-range extension is actually required, present that specific governed
change before implementation. Do not call prepare to implicitly rebuild or sample.

## Formal verification scope still requiring approval

Current source roster gives these observations, without running any worker:

| Family | Calibration | Independent holdout | Qualification | Total |
| --- | ---: | ---: | ---: | ---: |
| READ_SEAL | 13x5=65 | 13 | 0 | 78 |
| FULL_TRANSPORT | 14x5=70 | 14 | 0 | 84 |
| REFRESH_VERIFY | 15x5=75 | 15 | 0 | 90 |
| REFRESH_TRANSPORT | 22x5=110 | 22 | 22 | 154 |
| Total | 320 | 64 | 22 | 406 |

These are top-level observations, NOT process/call limits. The historical controlled
plan counted2066 Native +572 Node explicit launch slots=2638, excluding the outer
coordinator, implicit descendants and new build/transfer steps. Recompute the exact
new execution plan before authorization; do not claim2638 as a physical upper bound.
Workers use existing soft timeouts/stop checkpoints; no whole-batch hard RAM/time/
process-tree isolation is established. Failure, identity drift, timeout or cleanup
UNKNOWN stops later launches, preserves evidence and does not retry automatically.

Historical Transport alone took several hours. Standard public Windows compute is
free, but hosted jobs terminate at6hours. Split only at contract-supported independent
stage boundaries, using the same retained candidate and matched environment; do not
stitch interrupted/in-flight observations or weaken sampling to fit the clock.
If current contracts cannot support safe stage transfer, report that gap first.
Reference: https://docs.github.com/en/actions/reference/limits

The next explicit approval must name: exact final candidate/source/tool/corpus
identities and asset inventory/public visibility; legitimate prebuilt ownership and
layout/bridge; publication permission and retention; precise job/stage commands,
observation/preparation scope, time/disk/memory risks, stopping and evidence transfer.
Raw observations remain provisional. Numeric profile adoption, PACK, publication,
actual22 and CI-reference changes are distinct approvals unless specifically included.
No such formal action was executed by this preparation.

## Independent preparation review

Independent read-only review found no concrete P1/P2. Minimum unresolved items are
legitimate prebuilt owner/layout bridge, isolated publishing permission, complete
public-safe inventory/retention, and supported stage/evidence transfer with exact
execution bounds. Review covers this plan only, not real candidate publication or
formal qualification. No additional CI was triggered by the synthetic transfer test.


## Focused closure, not additional acceptance gates (2026-11-11)

Run42946657226, controls7215776f161688048f68d185b75ba09f17cf606f, passed in2m9s.
One actual cargo build --workspace, original v10 exclusive prebuilt acquisition,
54-file source/environment before-after checks and ORIGINAL Native-build verifier
passed. No prepare, analyzer, case worker, sampling or asset upload. This disposable
probe created its own receipt directory, so layoutFreshForBench=false; later bench
must acquire a fresh owner from the same retained binary, not adopt this probe root.
No v12 or frozen layout change was needed for this build/layout plumbing.

Current implementationDigest efcb8904bbb16ea0c11f2c21254540dfeefd6351a5c9e8eaf0aaa192fc029d9d
differs from the R11 profile/evidence identity571d757965c5743e60a92f49c795e1995fe3dbeea8d75189ffcda5f9dcd66e73.
Therefore that R11 cohort cannot qualify this current implementation. Preserve it,
not relabel it. Future evidence reuse is per exact complete identity, not a blanket
assumption that every development commit always needs all406 or only Transport154.

Existing policy retains five fresh calibration workers/class, independent holdouts
and the22 Transport qualifications:406 top-level observations. Post-PACK actual22
is a separate existing gate, not another calibration.2638 is historical explicit
launch accounting, not a target/gate/process-tree ceiling. Do not invent launches
to reach it or omit existing success-path preparation to reduce it. Current serial
worker/stage control and absolute-peak measurement conditions remain mandatory.

Fast path: batch product development first; reuse exact-source basic CI and narrow
tests; freeze a stable candidate once and retain it. Reuse unchanged complete
calibration/corpus/holdout evidence only after original identity gates match.
Use supported complete stage boundaries, not stitched interrupted Transport rows.
Ordinary development/basic CI on separate machines can run concurrently; same-host
heavy resource measurements cannot. Cross-host parallel sampling/merged evidence
has not been approved or closed by these serial controllers and is not assumed.

The generic original downloader already supports an explicitly pinned repository
argument and verifies real release/asset metadata; only the R11-specific wrapper is
fixed to its old asset. Do not edit that historical wrapper. No new generic trust
contract is needed merely to name the new repository. Real publication still needs
the narrow publishing permission and reviewed safe inventory/retention decision;
formal stage execution remains separately unapproved. No more byte-repro/tool
probes or blanket full tests are required for this unchanged plumbing.
