# A1 fixed-source qualification preparation

Source: `a1f8fa950d1eea6699ced3ece058f06c53c1c6e1`.
Independent entry: `.github/workflows/public-a1-qualification.yml`.
Original source79 controls, releases, observations and actual22 stay unchanged.

Build one new candidate from public source with exact lock seals, Node24.15.0,
pnpm11.19.0 and Rust1.98.1, one Cargo build job. Preserve that exact seed and
tool/build identity for all stages. Separate a1 build/seed/transport files retain
the original implementation, replacing only fixed source/lock and module bindings.
Previous-source retained seeds refuse. No old observation or candidate is reused.

Original serial stages: READ_FULL162 (65+70+27), VERIFY90 (75+15),
TRANSPORT154 (22+110+22). Worker failure, identity drift or UNKNOWN stops forward
execution. Cooperative stage limit330minutes and hosted job360minutes remain;
no hard process-tree or memory isolation is claimed. No automatic retry.

Only reviewed public-source build seeds, synthetic input/evidence and required
licenses are published in this temporary public repository. Original public
allowlist/content checks and tokenless cleanup guard remain. No local worktree,
user database, personal path, credential or private log is an input. Standard
Windows runner only; no Actions cache/artifact storage or larger runner selected.
Prereleases are not latest; historical releases/assets are not replaced/deleted.

Targeted local validation:16tests,15pass,0fail,1existing Windows link-creation
unavailable skip,594.6994ms. Includes old-source seed refusal, pins/manual-only
workflow checks, public-content refusal and existing seed/stage/failure cases.
Command: `node --test --test-reporter=tap --test-concurrency=1 a1-qualification.test.mjs public-seed.test.mjs public-sampling-stage.test.mjs public-failure.test.mjs`.
Formal execution is not claimed by these lightweight tests.

Independent read-only review found no blocking P1/P2; JS syntax and PowerShell
static parse pass. Original control files remain byte-identical. Asset fetch and
publication use the existing step-scoped token; sampling and cleanup reject it.

Results remain candidates for review. Numeric adoption, profile installation,
PACK, actual22, main-repository fixture and CI-reference changes are not authorized
by this batch and are not present in its workflow. Phase acceptance unchanged.
