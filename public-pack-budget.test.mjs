import test from "node:test";
import assert from "node:assert/strict";
import {budget,assertPackCanStart,assertInspectionCanStart} from "./public-pack-budget.mjs";
test("finite operational budget reserves full verification/cleanup before consuming attempt",()=>{
 assert.equal(budget.jobMinutes,65);assert.equal(budget.usableJobMs,60*60000);
 assert.equal(budget.packMs,20*60000);assert.equal(budget.copiedReviewMs,5*60000);
 assertPackCanStart(30*60000);
 assert.throws(()=>assertPackCanStart(30*60000+1),e=>e.code==="OPERATION_BUDGET_EXHAUSTED");
 assertInspectionCanStart(50*60000);
 assert.throws(()=>assertInspectionCanStart(50*60000+1));
 for(const v of [-1,NaN,Infinity])assert.throws(()=>assertPackCanStart(v));
});

test("actual guard precedes output/latch and original PACK keeps its source entry", async()=>{
 const fs=await import("node:fs/promises");const source=await fs.readFile(new URL("./public-pack.mjs",import.meta.url),"utf8");
 const start=source.indexOf("assertPackCanStart(elapsedBudget())");
 assert(start>=0);assert(start<source.indexOf('await fs.mkdir(path.join(work, "output"))'));
 assert(start<source.indexOf('path.join(work, "pack-attempt.json")'));
 assert(source.includes('timeout: budget.packMs'));
 assert(source.includes('path.join(import.meta.dirname, "public-pack-create.mjs")'));
});

test("observed slow preparation fits actual wall time while a genuinely late attempt refuses",()=>{
 assertPackCanStart(28*60000);
 assert.throws(()=>assertPackCanStart(36*60000),e=>e.code==="OPERATION_BUDGET_EXHAUSTED");
});
