# Reader-only public79 freeze
Preparation scope only. No PACK, actual22, new fixture release, upload or product
CI reference change. Existing source79da401 and qualification evidence stay fixed.

New manual .github/workflows/public-reader-freeze.yml uses standard windows-2025,
contents:read,75min job/60min freeze step, original ImageVersion20261103.298.1
and exact Node/PowerShell/tar upfront; the original seed verifier also checks all
eight tools and source/native/dependency identities. A mismatch stops; no fallback.
Original public-build -ReaderOnly returns before Native/Cargo build.
Existing assets are downloaded and verified, never created, replaced or moved.

Original prepareReview evaluates the existing evidence read-only, with zero
measurement workers. Approved profile assembly and only four allowed catalog
file changes reuse the tested original recipe, compiler and boundaries.
Original catalog/binding and all admission edges are checked.
The source/control/protected trees must remain physically and byte stable.

A new owned reader copies every member of the already-defined PUBLIC snapshot
(root .git is excluded there); each file becomes single-link, internal junction
targets retain their relative topology. The original actual inventoryTree checks
the ENTIRE new tree with no changed exclusions or relaxed hardlink requirement.
This is a newly constructed closure, NOT historical entire-tree byte equality.
The seed/dependency proof is repeated on the closed reader; dependencyRoots-only
new sidecar binding uses the original installer-equivalence validator. A separate
deny-only child proves original readCorpus22, copied profiles/admission edges and
dependency catalog on this closed graph. Original binding/evidence are unchanged.

Only fixed progress and typed hash/count/state fields are public. Build/fetch/
freeze subprocess output is captured through the existing bounded diagnostic
filter into private runner-local logs; no raw diagnostics, full manifest, reader,
binding or package contents are uploaded. All detailed results remain runner-local.
The reported digest is NOT a retained, reusable reader bundle: later reuse needs
a separately reviewed preservation/transfer path, never an assumed rebuild match.

Offline7/7 tests passed,0fail/cancel/skip/todo,790.7776ms. Syntax checks passed.
Independent review found raw build-diagnostic exposure; private outer wrappers
now cover every step and the narrow re-review found no remaining concrete issue.
Old Temp root draft workflow is NOT included; only .github/workflows is operative.

Real runner outcome is pending until separately recorded. No native qualification,
actual22 or phase acceptance is implied by these tests or workflow preparation.


## Recorded reader-only result
Run43140260952 at control dc23870dd80395bc7c3516293748cf1bd357251e completed success, attempt1,2026-11-12 02:16:37..02:38:17UTC. Reader digest e15e1bcd6ce9aa1897554b0fbcd3de67ab40ef11f886c71c44a5a8ac1543f8c4;11947files/585links/2194directories;8066dependencies;topology cf73f6ee1c246cc41b5d84035e56085f90e3ed5590bf93de00bd302b5596519c;22 readCorpus cases. Result READER_CLOSURE_VERIFIED_NOT_QUALIFIED,actual22/PACK/upload NOT_ATTEMPTED. No Actions artifact or reader release asset; not a retained reusable bundle. This supersedes the earlier pending-result sentence only. Original qualification/phase gates remain unchanged.

## Approved Public same-run continuation �� 2026-11-12

The historical run/pin statements above remain exact for their original path.
User approved a separate same-run construction/seal rule; see [PUBLIC_READER_TRUST_V1.md](PUBLIC_READER_TRUST_V1.md) and [CURRENT_STATUS.md](CURRENT_STATUS.md).
The new explicit owned workflow never accepts a caller-provided digest as authority.
It preserves original dependency/instance/topology, installer and acceptance gates;
old R11 and legacy seed remain unchanged. No new fixture or actual22 is authorized.
