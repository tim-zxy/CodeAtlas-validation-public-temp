# Native byte-difference diagnosis result, 2026-11-11

Run: https://github.com/tim-zxy/CodeAtlas-validation-public-temp/actions/runs/42942119925
Controls: 9d3f1d2da0c131d7c45bedf0e5e90e1147052273
Source: 79da40105d480cce540ac636334dd9b6d3f54956
Result: SUCCESS,1m50s. Synthetic inspector tests3/3; both unmodified build commands
completed (39.89s,33.16s). One bounded reproduction only; no retry.

Exactly20 differing bytes in the fresh executable pair:

- COFF TimeDateStamp:1 byte.
- Three IMAGE_DEBUG_DIRECTORY TimeDateStamp fields:3 bytes.
- CodeView PDB GUID:16 bytes; PDB age remains1 and path hash is identical.
- All other bytes: identical. Both images have debug types2,12,13, no REPRO entry.

The recorded timestamps are 2026-11-11T01:54:21Z and01:54:54Z, corresponding to
the two links. The .text,.data,.pdata,.reloc hashes are identical. Only .rdata
contains the identified debug metadata differences; no unclassified differences
were found. Full executable SHA256 values remain different and unchanged:

- b8611b4a3a1c958545553ba833cf6612e15a813ce8d0361b03ae2b22811638f0
- aa91b09efb5d97601ef7e5f67e8d01e21d8c053edd7f46b321985043a6be1687

This reproduces digest drift caused by link-time timestamp/debug identity fields,
not a code/payload-byte difference in this pair. The original run's two binaries
were not retained, so their exact byte differences cannot be retrospectively
proved. Identical remaining bytes are not a runtime behavior/quality proof.
Reference: https://learn.microsoft.com/en-us/windows/win32/debug/pe-format

No source, linker flag, timestamp, GUID or binary was patched. No formal gate,
threshold, frozen R11 evidence or earlier failed run was changed. No Native
executable, formal sampling, actual22 or model ran. No binary/old reader/artifact
was uploaded; Actions artifacts0,caches0. Known original path/account/token marker
scan had no hits in the new public log; not general secret clearance.

## Lowest-cost next candidate identity

Do not add reproducible bytes as a qualification prerequisite or normalize PE
bytes for admission. Build one new candidate once, retain the complete unchanged
binary and reader, and bind their raw SHA256, source/locks/dependency topology,
toolchain/SDK/image and approved input corpus. All later measurements, PACK and
actual22 must consume that exact retained instance without rebuilding it. A new
build is a new identity, even when only debug metadata differs.

Before saving/uploading anything, define and review a public-safe allowlist and
retention channel; do not copy original local R11 files or reuse this expired
runner's unavailable binaries by hash. Qualification still requires the original
resource/calibration/holdout/cleanup/actual22 gates on the new exact identity,
with precise scope and resource authorization before formal sampling. Old R11
observations cannot be relabeled for the changed environment. Historical evidence
remains intact. No ABI/identity exclusion, core contract or acceptance change is
needed to use an exactly sealed prebuilt artifact under the existing approach.
