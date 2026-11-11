// Separate prepare/read-only entry. No route to profile adoption or PACK.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { prepareReview, assertFixedContext } from "./public-pack.mjs";
import { createProgress } from "./public-pack-progress.mjs";
export async function diagnose(source, work, { prepare = prepareReview, validate = assertFixedContext } = {}) {
  validate(source, work);
  await prepare(source, work);
  const progress = createProgress("PARENT");
  progress.enter("DIAGNOSTIC_FINAL_CHECK");
  for (const name of ["proposed-adopted-profiles.json", "catalog-build", "pack-attempt.json", "output"])
    await assert.rejects(fs.lstat(path.join(work, name)), e => e.code === "ENOENT");
  const result = { state: "PREPARE_REVIEW_ONLY_COMPLETE", candidateAdopted: false,
    packCreateCount: 0, previousAttempt: "UNKNOWN_UNCHANGED", cleanup: "NOT_ASSERTED" };
  await fs.writeFile(path.join(work, "diagnostic-result.json"), JSON.stringify(result)+"\n", { flag: "wx" });
  progress.enter("COMPLETE"); progress.finish();
  // Hard return: no continuation callback, CLI mode, adoption or PACK operation.
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  try {
    assert.equal(process.argv.length, 4);
    await diagnose(path.resolve(process.argv[2]), path.resolve(process.argv[3]));
  } catch { process.exitCode = 1; }
}
