# Bounded Native byte-difference diagnosis

Previous run42939673302 retained only whole-file hashes; the actual binaries are
not available for retrospective byte comparison. Hypothesis to test: the mismatch
may be confined to PE/debug metadata rather than executable or other payload bytes.
No cause is assumed before the new data. One fresh diagnostic pair cannot prove
that the previous unavailable pair differed for exactly the same reason.

One manual public windows-2025 job, 15-minute soft timeout, same pinned public
source79da401 and original build arguments, same-path fresh serial builds. Skip
TypeScript, pnpm and repeated full SDK inventory; preserve tool/version/lock seals.
No linker-flag, timestamp or image patch is attempted. No Native executable,
prepare, formal case, sampling or actual22 is launched. No artifact/cache upload.

The standard-library inspector reads bounded compiler outputs, hashes sections,
records PE/debug fields and classifies every differing byte. Identified metadata
ranges must match in both images; unknown/code/data/PDB-path changes stay OTHER.
PDB paths and raw payloads are never printed. No image is rewritten. REPRO debug
entries prohibit assuming a timestamp field is real wall-clock time.
Reference: https://learn.microsoft.com/en-us/windows/win32/debug/pe-format

Synthetic inspector tests passed3/3 and independent final review found no P1/P2.
Classification is BYTE_CLASSIFICATION_ONLY, functionalEquivalence NOT_ESTABLISHED,
formalGateEffect NONE. A metadata difference does not create an acceptance gate;
existing qualification binds an exact chosen binary and still needs its own full
evidence. Stop and report if the bounded diagnostic cannot establish the cause.
Original source/R11 evidence and earlier failed run remain unchanged.
