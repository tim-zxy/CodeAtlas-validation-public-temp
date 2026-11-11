import assert from "node:assert/strict";
// Operational soft budgets only; no qualification/resource formula is changed.
export const budget=Object.freeze({jobMinutes:65,controllerMs:50*60000,
  copiedReviewMs:5*60000,packMs:20*60000,inspectionMs:8*60000,cleanupMs:2*60000});
function requireRemaining(elapsed,needed) {
  assert(Number.isFinite(elapsed)&&elapsed>=0);
  if(budget.controllerMs-elapsed<needed)
    throw Object.assign(new Error("Insufficient operational budget"),{code:"OPERATION_BUDGET_EXHAUSTED"});
}
export const assertPackCanStart=elapsed=>requireRemaining(elapsed,budget.packMs+budget.inspectionMs+budget.cleanupMs);
export const assertInspectionCanStart=elapsed=>requireRemaining(elapsed,budget.inspectionMs+budget.cleanupMs);
