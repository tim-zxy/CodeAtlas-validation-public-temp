# Public-safe CodeAtlas validation experiments

Only reviewed configuration and safe result metadata are stored here. No original
R11 ZIP/reader, developer-computer paths, user project data, secrets, release or
Actions artifact/cache upload is included. This does not grant production access.

## Build-only experiment

Manual public-candidate-build workflow checks out public source
79da40105d480cce540ac636334dd9b6d3f54956 with fixed action SHAs, Node24.15.0,
pnpm11.19.0 and Rust1.98.1. It compiles TypeScript once and Native twice, creates
only small synthetic Java/Python input files and uses read-only generator4 discovery.
It never executes Native, prepare, tests, formal sampling or actual22. Read BUILD_PLAN.md
and BUILD_RESULT.md for exact scope, reproducibility limits and observed failure.

## Tool-preflight experiment

Manual tool-preflight workflow checks three existing standard Windows tool hashes
without checking out project data or installing dependencies. The first run found
all three default tools different from R11; mismatches intentionally fail.

Both workflows use standard public windows-2025 only, contents:read, single-job
concurrency, finite soft timeouts and no automatic retry. They use no secret,
cache action, artifact upload or paid larger runner. Build outputs are temporary;
public logs contain only public build output and bounded tool/hash metadata.
No result is resource qualification, R11 equivalence or Phase 1 acceptance.
