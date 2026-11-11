# Public-safe clean build experiment

Fixed public source: tim-zxy/CodeAtlas@79da40105d480cce540ac636334dd9b6d3f54956.
Uses standard windows-2025, SHA-pinned checkout/setup actions, Node24.15.0,
pnpm11.19.0 and Rust1.98.1. Six source/lock digests must match before and after.
Explicit MSVC environment/linker selection records compiler, SDK/header/library
and tool hashes plus hosted image version. This is not hermetic OS provenance.

One manual job, 25-minute soft timeout, one Cargo task at a time, fresh output,
no retry, cache action, secrets, release or artifact upload. Normal registry/tool
network fetches are required; full network isolation is not claimed. JS install
scripts are disabled; Cargo dependency build scripts/C compilers execute as part
of ordinary compilation. No Native executable, prepare, test, sampling or actual22
is launched. New synthetic Java/Python literals are created, never user inputs.

Reuse pnpm build and the existing read-only generator4 discovery; do not alter
frozen manifests or historical results. Two fresh Native builds use the same controlled target path, preserving each
completed target under a distinct new directory before proceeding. Both source and
destination are checked inside the new output owner; no deletion or overwrite.
This tests only same-host/same-path byte reproducibility, not cross-host equivalence. A mismatch fails and is preserved in safe log metadata;
no remapping, timestamp patching or updated expected digest makes it pass.
TypeScript is built once and hashed by catalog, not claimed byte-reproducible.
No binary/corpus is transferred from the original computer. Build outputs exist
only during this disposable job; the public log retains hashes and bounded
machine/tool metadata. A successful experiment is not a reusable qualification
package, resource profile, sampling approval, current-code acceptance or R11
identity equivalence. Next qualification requires separately fixed environment,
reviewed complete candidate and original gates; no thresholds are changed here.
