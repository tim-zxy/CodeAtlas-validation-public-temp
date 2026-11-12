# Public validation preparation status

2026-11-12: user approved PUBLIC_READER_SAME_RUN_V1; controlling refinement and
acceptance/traceability mapping: [PUBLIC_READER_TRUST_V1.md](PUBLIC_READER_TRUST_V1.md).
Implementation: public-reader-seed.mjs private owner admission, public-reader-lease.mjs
once-only full-inventory lifetime, public-reader-private.ps1 bounded public output,
manual .github/workflows/public-reader-owned.yml check-only preparation.

Source79da401, original seed/assets/candidate/profile, old R11 and legacy seed pins
remain unchanged. New reader digest is sealed inside its trusted construction;
neither caller JSON nor digest can issue an owner. No normalization or exclusion.

First focused regression:18/18 pass,0fail/cancel/skip/todo,1120.5596ms on Node24.15.0.
Command: node --test public-reader-lease.test.mjs public-reader-seed.test.mjs public-reader-freeze.test.mjs
Default sandbox refused test-owned junction EPERM; normal platform approval allowed
the same unchanged test suite. No ACL/user-data change. Independent review and new
real owned-reader CI were pending at this first checkpoint; later evidence follows.

Existing PACK43130407133 is PACKED_DECODED_VERIFIED_NOT_QUALIFIED. No new fixture
release, actual22, Native build/sampling, production operation or CI switch occurred.
Phase1 4/21,A6 NOT_QUALIFIED,E02 PROPOSED/uninstalled. The next actual22 execution and
real fixture release/asset binding still require their own precise authorization.

## Approved fixture and one actual22 execution - 2026-11-12

User explicitly approved the exact public fixture plus one fresh-runner actual22.
Release442510821/tag p05-d5-fixture-d88650f7126cf531fcd6eaf820c8e87a103c950d2f9fcd7a79ca914c2001f5df
is public,non-draft,prerelease,non-latest,target6bcfc71. New asset738119268 is an
unchanged copy of old737583622:246167030bytes/SHA256b2e534f18d365f6fcd93f316e26833d4e56dfe172c82e5396d72e9fc5582e22c.
Server state uploaded/digest/size and local full ZIP/5577 decoded-member checks pass;
decoded954695422bytes. UTF8/UTF16/Latin1 marker checks pass without general safety
clearance. Old asset/evidence preserved; no user/private input or new PACK.

Original-schema approval (full5577 entries,source/native/candidate/raw/holdout)
has SHA256ef38e6dc8eb629d399cbba30784db964730b4eaa103b84c0d2643b5c9c42ded7.
Coordinator binds real IDs and retains source79da401 and original gates. Manual
public-owned-actual22.yml uses standardwindows-2025,contentsread,attempt1 only,
120minjob/110minexecution,shared serial concurrency, no artifact upload or CI switch.
Reviewed fixed coordinatorSHA bc4f9e55d8bcac917fd78cf735f39246c3f2b8582b8f01d4491b5ea670422efd.
Private wrapper seals request, rejects tokens in reader process, emits typed results
and at most160 numeric45s heartbeats within the existing256-line output cap. No
raw diagnostics or local manifests are uploaded. Failures preserve UNKNOWN/no retry.

Prelaunch focused28/28 pass4030.3676ms,followed by necessary mixed-separator launch
fix and focused5/5 pass3938.1876ms; independent review/narrow fix review no remaining
P1/P2. Original before/after closed-copy tests stay unchanged. Workflow and request
have not executed real actual22 at this source-record checkpoint. One dispatch
will be separately recorded; no result or cleanup success is inferred in advance.

Standard public runners are free per current official GitHub runner reference:
https://docs.github.com/en/actions/reference/runners/github-hosted-runners
No larger runner or private Actions quota is used. No phase/A6/E02 promotion.

## Final local verification and independent review

22/22 focused tests pass,0fail/cancel/skip/todo,2454.4204ms. Same command above;
added preload refusal, explicit read-only workflow, typed public output, array-field
leak rejection and a deferred late-check failure. JS/PowerShell syntax checks pass.
Independent review found two P2 issues (preload rejection and pending-check race),
both fixed and narrowly re-reviewed with no remaining P1/P2. Review was read-only;
test execution is separate evidence. New owned-reader cloud CI remains unexecuted
at this commit. No real actual22, PACK or fixture publication has followed.

## External synchronization blocked

Creating a Git tree for these10 reviewed source/test/workflow/record files in
tim-zxy/CodeAtlas-validation-public-temp was rejected before execution by platform
automatic review: public external publication was not considered explicitly covered
by the present implementation/verification approval. No tree SHA, commit, branch
update or reader-only CI was created. No alternate channel or retry was attempted.
Remote main remains last observed882060878c399b073c3ea6a9510c246be8e21a3e.
Local deliverables are ready; fresh specific authorization for the10-file public
source/workflow sync and one check-only CI is the remaining execution blocker.
This excludes assets, fixture release, ZIP transfer, actual22, PACK and CI switch.

## Synchronized and real reader-only result �� supersedes prior blocker

The supplied direct user authorization was accepted through the original platform
review path for one retry of the unexecuted tree creation. The10 reviewed files
were synchronized at ca98bbdbb676e4a45e8e1b1c1e0f0daf02c9aadc. No bypass, force push,
fixture/ZIP publication or real actual22 followed.

[Run43151784077](https://github.com/tim-zxy/CodeAtlas-validation-public-temp/actions/runs/43151784077)
completed success, attempt1,2026-11-12 03:59:18..04:02:37UTC (3m19s), job130962440535.
Build52469ms,fetch3168ms,owned construction/consumption99311ms. The reviewed
same-run owner completed before/after full physical inventory and context checks.
Receipt (informational only; not a reusable owner):

```json
{
  "state": "READER_RUN_LOCAL_SEALED_NOT_QUALIFIED",
  "sourceCommit": "79da40105d480cce540ac636334dd9b6d3f54956",
  "controlCommit": "ca98bbdbb676e4a45e8e1b1c1e0f0daf02c9aadc",
  "trustRule": "PUBLIC_READER_SAME_RUN_V1",
  "transferable": false,
  "readerContentSha256": "ba7d5b8c777c40daa81e50196c9164e976c7fd681e5d6e8da0a1e6d6d73f5a7c",
  "profileObjectSha256": "9b2716123d15227808c35fe9dd24eb5393131192aca9aaa0f1d83a90db3077f4",
  "topologyDigest": "cf73f6ee1c246cc41b5d84035e56085f90e3ed5590bf93de00bd302b5596519c",
  "files": 11947,
  "links": 585,
  "directories": 2194,
  "dependencyEntries": 8066,
  "cases": 0,
  "logicalLayoutAbsent": true,
  "ownerCheck": "CONSUMED_CHECK_ONLY",
  "actual22": "NOT_ATTEMPTED",
  "pack": "NOT_ATTEMPTED",
  "upload": "NOT_ATTEMPTED"
}
```

The new construction digest differs from historical e15/d968; no file exclusions,
normalization, dependency topology change or caller digest approval was used.
Exact profile9b2716 and topologycf73f6/8066 dependencies stayed bound. The original
actual target remained absent; no installer/corpus measurement was called. All
workflow steps/post cleanup ended success,0 artifacts. This does not prove arbitrary child/process-tree
cleanup or OS isolation; no user project was read.
Public-log marker checks found no local account path/key/token pattern; this is
not a general secret-clearance claim. Detailed inventory and private diagnostics
were runner-local and unretained. Owner died with the process; it cannot be reused
by later CI. Future actual must construct and consume anew in one process using
the original installer, approval/asset, stop and acceptance gates.

Old R11, source79da401 Native/406 evidence, PACK asset737583622 and product CI
reference are unchanged. Phase1 stays4/21,A6 NOT_QUALIFIED,E02 PROPOSED/uninstalled.
Remaining approvals are exact new fixture release/same-ZIP asset binding and real
actual22; none is inferred from this successful preparation. No further CI needed
for this record-only update.

## Same-process actual22 code preparation, no real execution (historical checkpoint)

New public-owned-actual.mjs binds the original actual bridge to the approved private
constructor/owner. New guarded launcher refuses before request reads/construction while real release/asset
IDs remain null. Success receipt is written only after consume/post-check completes.
Original R9 boundaries compose owner.check and original identity checks; every old
download/verify/install/read/approved-collect/validate/final gate remains. Legacy
R11 and prior prepared coordinator files are unchanged. No CI workflow is edited.

Fresh24/24 pass,0fail/cancel/skip/todo,2898.6739ms,Node24.15.0:
node --test public-owned-actual.test.mjs public-reader-lease.test.mjs public-reader-seed.test.mjs
Both new JS entry/module syntax checks pass. Tests use self-owned temp data and
original stop helper mirror95f31010a21d66ad0840b4565fbb62546d225bb553101bfa644bc8335d12db1e.
The9 new cases include all phase failures, final owner refusal before success,
downloader drift blocking install/workers, original API arguments and bounded
closed-launcher refusal. They do not execute Native/actual or read user data.
Independent review found missing per-boundary owner checks; fixed with the exact
R9 callback composition and a download-drift test; narrow re-review found no P1/P2.

[Exact future invocation, limitations and approval plan](PUBLIC_OWNED_ACTUAL_PREPARATION.md).
No cloud run, fixture publication, actual22, PACK, Native build/resampling or CI
switch followed. Real full-bridge install/measurement remains UNVERIFIED, and
release/asset binding + actual22 authorization + reviewed bounded-log launch wrapper
are still prerequisites. Phase1 4/21/A6 NOT_QUALIFIED/E02 PROPOSED remain unchanged.

## Final pre-dispatch regression for the approved one attempt

After the explicit fixture/execution approval above, the bounded launch wrapper,
fixed request, real approval/IDs and manual workflow were independently reviewed.
One Windows mixed-separator defect was fixed in the launcher and verified with
an actual stub subprocess; narrow review has no remaining P1/P2. Final combined
36/36 pass,0fail/cancel/skip/todo,3150.1007ms, including unchanged closed-copy/default-
log guards and new request/heartbeat/approval/workflow tests. PowerShell/JS syntax
passes. Command:
node --test public-owned-actual.test.mjs public-owned-actual-launch.test.mjs public-reader-lease.test.mjs public-reader-seed.test.mjs public-reader-freeze.test.mjs
No actual22 has been dispatched at this checkpoint; the next receipt/run identity
must be recorded independently. Historical pending/null-ID notes are superseded
only by the precise approval and fixed real fixture binding above, not by tests.

## One approved run stopped at request preparation, no actual22 started

[Run43158945120](https://github.com/tim-zxy/CodeAtlas-validation-public-temp/actions/runs/43158945120)
at exactb49abc015d12bbe36757d147909782919204d657,attempt1,2026-11-12
05:04:50..05:06:10UTC,job130985339252 ended FAILURE. Build39822ms/fetch2144ms
passed; actual wrapper emitted ACTUAL22_STEP_STOPPED_NOT_QUALIFIED:REQUEST.
No EXECUTE phase, reader constructor progress, actual report or actual observations.
The source branch stops before invoking the actual entry when request preparation
fails. No actual installation/Native measurement was started by this entry. No
global process-tree cleanup proof is inferred. Artifacts0; private logs were not
uploaded or retained. No automatic retry/second dispatch occurred. Fixture assets
remain intact and neither PACK nor main-project CI switch followed.

Exact request subcause remains UNKNOWN: old public diagnostics identify REQUEST
only. Repository attributes protected notices only; pinned LF JSON/coordinator can
therefore change bytes under Windows core.autocrlf checkout. A disposable-Git test
reproduces both wrong hashes with autocrlf=true and preserves both approved hashes
with two exact -text rules. This is a demonstrated compatibility defect, NOT proof
that this host's unrecorded Git config was the sole historical cause.

Offline fix adds only /public-actual-approval.json and /public-owned-actual.mjs
byte-preserving attributes. Approvalef38e6/coordinatorbc4f9e/ZIPb2e534 and all original
gates stay unchanged; no lower threshold, normalized-after-check bytes, new profile,
Native rebuild or sampling. Request diagnostics now preserve only a fixed stage/code
enum in an exclusive workspace receipt, after context validation, and the wrapper
releases only those typed enums. Unknown/private messages and arrays refuse.

Fresh focused6/6 pass,0fail/cancel/skip/todo,5910.065ms (request/typed logs including
malicious diagnostics, approval/workflow pins, normalized launch and autocrlf
checkout). Command: node --test public-owned-actual-launch.test.mjs
Independent narrow review no P1/P2. Real replay remains unverified; no new cloud
diagnostic or actual run has been executed. A new isolated attempt must be explicitly
coordinated before dispatch, preserving this failed run and the same fixture.
Phase1 remains4/21,A6 NOT_QUALIFIED,E02 PROPOSED/uninstalled.
