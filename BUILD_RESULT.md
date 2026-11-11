# Build-only result, 2026-11-11

Run: https://github.com/tim-zxy/CodeAtlas-validation-public-temp/actions/runs/42939673302
Control commit: b79237e160ff7e233adf149af84b0bc3ef99a9ad
Source commit: 79da40105d480cce540ac636334dd9b6d3f54956
Result: FAILURE at NATIVE_BYTE_REPRODUCIBILITY_NOT_ESTABLISHED, elapsed7m33s.

All16 TypeScript projects compiled. Both locked serial Cargo dev builds completed
(53.05s and50.96s). All six lock/source digests and tracked-source checks passed.
Read-only generator4 discovery completed with8066 dependency records.

The two fresh builds used the same host, source and target path, retaining each
completed output before rebuilding. Their full executable SHA256 values differ:

- 70fcbe932adf6f2ba4653ecbf1376c7edd50a30a80235a733b282ba34d4ce259
- 6479eaa476912af69cf17b78c6e53db7d54c353ad1813afebfc7ebc803c7dca6

Cause is NOT established from whole-file hashes. Do not attribute it to timestamps,
PDB, semantics or a compiler defect without byte-level evidence. This experiment's
byte comparison is diagnostic, not a newly imposed qualification threshold. Existing
qualification still requires an authenticated exact selected binary and its own
complete evidence; this result grants none. TypeScript/cross-host reproducibility,
full OS provenance and R11 equivalence remain NOT_ESTABLISHED/NOT_CHECKED.

Observed image version: 20261103.298.1
MSVC toolset: 14.51.36231
Windows SDK: 10.0.26100.0
Topology digest: cf73f6ee1c246cc41b5d84035e56085f90e3ed5590bf93de00bd302b5596519c
Dependency catalog SHA256: ffb246f4a5c66349cb82eef1107b82f0bccebcda07156cc2c1d8a5779821c442

No formal sampling, Native execution, actual22, profile adoption, PACK, original
artifact transfer, release or CI-reference change occurred. Actions artifacts0,
caches0. Full safe metadata remains in the run log; no build binary was persisted.
A bounded scan found no known original account/path/token markers in that public
log; this is not general secret clearance.

Next: diagnose byte differences if reproducible rebuilds are required, or freeze
one explicitly identified new binary with full provenance and safe persistence.
Either path must retain original gates and separately approve formal qualification.
Do not substitute these two smoke input files for the existing complete case corpus.
