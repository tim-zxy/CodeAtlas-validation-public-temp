# Temporary public-safe tool preflight

This repository is intended only for a standard windows-2025 runner tool-seal check.
No project checkout, original R11 ZIP/reader, local paths, user data, dependency
installation, package scripts, Native build, sampling or actual22 is included.
The workflow is manual-only, contents:read, single-job and five-minute timeout.
It uploads no artifacts, uses no cache, secret or release, and emits only tool
roles, public executable hashes and qualification=NOT_ATTEMPTED.

A mismatching seal intentionally fails. Matching these three executable files
alone does not establish complete DLL/runtime provenance, reader identity, memory
qualification, actual22, current-source equivalence or Phase 1 acceptance.

R11 still binds exact original reader topology, ZIP/member digests, environment,
candidate, corpus and real release/asset metadata. Sanitizing or rebuilding those
inputs cannot reuse their frozen approval without explicit identity/equivalence
verification. This preflight never downloads or publishes those inputs.

Before dispatch: independently verify the repository is public and the runner is
the standard windows-2025 label. Do not change to a larger runner, add caches or
artifact storage, publish original data, or broaden token permissions implicitly.
The account's billing settings and remaining storage are not currently readable.