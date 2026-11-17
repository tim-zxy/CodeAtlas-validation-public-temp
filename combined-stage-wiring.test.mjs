import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { executeStage } from "./public-sampling-stage-combined-v1.mjs";
test("versioned stage import is inert and refuses unknown before identity", async () => {
  let checks = 0;
  await assert.rejects(
    () =>
      executeStage("INVALID", {
        verifyIdentity: () => {
          checks++;
        },
      }),
    /Unsupported stage/,
  );
  assert.equal(checks, 0);
});
test("versioned Transport stage retains build/budget/reconstruction gates and routes all four calls", async (t) => {
  const root = await fs.realpath(
    await fs.mkdtemp(path.join(tmpdir(), "combined-stage-test-")),
  );
  t.after(async () => {
    assert.ok(path.basename(root).startsWith("combined-stage-test-"));
    await fs.rm(root, { recursive: true });
  });
  const source = path.join(root, "source"),
    output = path.join(root, "output"),
    evidence = path.join(root, "evidence");
  await fs.mkdir(output);
  await fs.mkdir(evidence);
  const put = async (file, text) => {
    const p = path.join(source, file);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, text);
  };
  const originalEvidence = path.join(root, "original");
  await fs.mkdir(originalEvidence);
  const log = path.join(root, "calls.jsonl");
  const record = `import path from 'node:path';import fs from 'node:fs'; const record=x=>fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(x)+String.fromCharCode(10));`;
  await put("package.json", '{"type":"module"}');
  await put(
    "scripts/helpers/native-refresh-ci-layout.mjs",
    record +
      `export async function readRefreshCiPackLayoutAt(){record('read-layout');return {nativePath:'synthetic',evidenceRoot:${JSON.stringify(originalEvidence)}};} export function refreshCiLayoutRootForRevision(r){record(r);return 'synthetic';} export async function acquireRefreshCiLayoutAt(){record('acquire-layout');return {fixtureContext:{memoryBudgetBytes:100},evidenceRoot:${JSON.stringify(evidence)}};} export async function verifyRefreshCiLayoutOwnership(){record('verify-layout');}`,
  );
  await fs.writeFile(path.join(originalEvidence, "native-build.json"), "{}");
  await put(
    "scripts/helpers/native-refresh-ci-pack.mjs",
    record +
      `export async function verifyRefreshCiNativeBuildAt(){record('verify-build');}`,
  );
  await put(
    "scripts/native-refresh-ci.mjs",
    record +
      `export function checkRefreshCiCandidateBudget(...args){record(['budget',...args.slice(0,2)]);return {synthetic:true};}`,
  );
  await put(
    "packages/runtime/test/helpers/native-refresh-transport-replay.mjs",
    record +
      `
 export const refreshTransportCombinedExecutionRevision='p05-refresh-combined-offline-v1';
 export async function runRefreshTransportCommand(){throw Error('LEGACY_MUST_NOT_RUN');}
 export async function runRefreshTransportCombinedCommandV1(args){record(args.slice(0,2));if(args[0]==='bench'){fs.writeFileSync(path.join(args[1],'qualification.json'),JSON.stringify({cases:Array(22).fill({synthetic:true})}));fs.writeFileSync(path.join(args[1],'raw.json'),JSON.stringify({observations:Array(110).fill({synthetic:true})}));}if(args[0]==='collect'){fs.mkdirSync(args[3]);fs.writeFileSync(path.join(args[3],'holdout.json'),JSON.stringify({observations:Array(22).fill({synthetic:true})}));}return {reservationBytes:1,synthetic:true};}
 `.replace("import fs from", "import path from 'node:path';import fs from"),
  );
  const control = {
    stage: async (label, operation) => operation(),
    fail: async () => {},
  };
  const result = await executeStage("TRANSPORT154", {
    source,
    output,
    control,
    seed: {
      root: "synthetic",
      nativeSha256: "a".repeat(64),
      controllerSha256: "b".repeat(64),
    },
    verifyIdentity: async () => {},
  });
  assert.deepEqual(result.coverage, [22, 110, 22]);
  assert.equal(result.cleanup, "NOT_PROVEN");
  const calls = (await fs.readFile(log, "utf8"))
    .trim()
    .split("\n")
    .map((x) => JSON.parse(x));
  assert.equal(calls.filter((x) => x === "verify-build").length, 2);
  assert.equal(calls.filter((x) => x === "verify-layout").length, 1);
  assert.deepEqual(
    calls.filter(Array.isArray).map((x) => x[0]),
    ["bench", "candidate", "budget", "collect", "candidate"],
  );
  assert.ok(calls.includes("p05-d5-exact-layout-v10"));
});
