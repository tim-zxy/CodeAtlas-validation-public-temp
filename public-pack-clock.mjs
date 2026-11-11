import assert from "node:assert/strict";
import {readOwnedJson} from "./public-pack-result.mjs";
import {budget} from "./public-pack-budget.mjs";
export const clockName="codeatlas-public-pack-clock.json";
export function elapsedClock(stamp,expected,wallNow=Date.now(),monotonicNow=()=>performance.now()) {
  assert.deepEqual(Object.keys(stamp).sort(),["attempt","controlCommit","runId","startedUtcMs"]);
  for(const key of ["runId","attempt","controlCommit"])assert.equal(stamp[key],expected[key]);
  assert.match(stamp.runId,/^[1-9][0-9]{0,19}$/);
  assert.match(stamp.attempt,/^[1-9][0-9]{0,3}$/);
  assert.match(stamp.controlCommit,/^[a-f0-9]{40}$/);
  assert(Number.isSafeInteger(stamp.startedUtcMs)&&stamp.startedUtcMs>=0);
  const offset=wallNow-stamp.startedUtcMs;
  assert(Number.isFinite(offset)&&offset>=0&&offset<=budget.usableJobMs);
  const start=monotonicNow();
  return ()=>{const delta=monotonicNow()-start;assert(Number.isFinite(delta)&&delta>=0);return offset+delta;};
}
export async function readJobElapsedClock(file,expected) {
  return elapsedClock(await readOwnedJson(file,4096),expected);
}
