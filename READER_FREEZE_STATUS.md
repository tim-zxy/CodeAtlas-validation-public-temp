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
