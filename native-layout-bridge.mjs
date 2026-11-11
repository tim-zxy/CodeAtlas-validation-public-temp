// Build/layout plumbing only; never invokes prepare, a case worker or Native Analyzer.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const [mode, source, output] = process.argv.slice(2);
assert(["before", "after"].includes(mode));
assert.equal(process.env.GITHUB_ACTIONS, "true", "HOSTED_WORKFLOW_ONLY");
assert.equal(
  process.env.GITHUB_REPOSITORY,
  "tim-zxy/CodeAtlas-validation-public-temp",
);
const imp = (p) => import(pathToFileURL(path.join(source, p)));
const layoutApi = await imp("scripts/helpers/native-refresh-ci-layout.mjs");
const packApi = await imp("scripts/helpers/native-refresh-ci-pack.mjs");
const replay = await imp(
  "packages/runtime/test/helpers/native-refresh-transport-replay.mjs",
);
const runtime = await imp("packages/runtime/dist/native-metadata-admission.js");
const revision = "p05-d5-exact-layout-v10";
const root = layoutApi.refreshCiLayoutRootForRevision(revision);
const snapshotPath = path.join(output, "native-source-before.json");
const hash = (b) => createHash("sha256").update(b).digest("hex");
if (mode === "before") {
  await assert.rejects(fs.lstat(root), (e) => e.code === "ENOENT");
  const snapshot = {
    sourceFiles: await packApi.discoverRefreshCiNativeSourceAt(source),
    environment: runtime.nativeMetadataEnvironment(),
  };
  await fs.writeFile(snapshotPath, replay.encodeRefreshReplayJson(snapshot), {
    flag: "wx",
  });
} else {
  const original = replay.decodeRefreshReplayJson(
    await fs.readFile(snapshotPath),
  );
  const processRecord = JSON.parse(
    await fs.readFile(path.join(output, "native-process-result.json"), "utf8"),
  );
  assert.equal(processRecord.status, 0);
  assert.equal(processRecord.command, "cargo");
  assert.deepEqual(processRecord.args, ["build", "--workspace"]);
  assert.deepEqual(
    await packApi.discoverRefreshCiNativeSourceAt(source),
    original.sourceFiles,
  );
  assert.deepEqual(runtime.nativeMetadataEnvironment(), original.environment);
  const layout = await layoutApi.acquireRefreshCiLayout(revision);
  const receipt = {
    schemaVersion: 1,
    environment: original.environment,
    native: {
      path: "native/codeatlas-native-analyzer.exe",
      sha256: layout.nativeSha256,
      sourceFiles: original.sourceFiles,
      toolchain: processRecord.toolchain,
      build: { command: processRecord.command, args: processRecord.args },
    },
  };
  // Disposable build-only probe: bench normally creates this directory.
  // A later formal bench needs a fresh owned layout; this root is not reusable.
  await fs.mkdir(layout.evidenceRoot);
  const receiptBytes = replay.encodeRefreshReplayJson(receipt);
  await fs.writeFile(
    path.join(layout.evidenceRoot, "native-build.json"),
    receiptBytes,
    { flag: "wx" },
  );
  const checked = await packApi.verifyRefreshCiNativeBuildAt(layout, source);
  assert.deepEqual(checked, receipt);
  const result = {
    scope: "EXISTING_V10_PREBUILT_LAYOUT_BUILD_IDENTITY_ONLY",
    status: "VERIFIED_NOT_QUALIFIED",
    layoutRevision: revision,
    sourceFiles: original.sourceFiles.length,
    nativeSha256: layout.nativeSha256,
    buildReceiptSha256: hash(receiptBytes),
    actualBuildCommand: processRecord.command,
    actualBuildArgs: processRecord.args,
    layoutAcquisition: "ORIGINAL_EXCLUSIVE_COPY",
    layoutFreshForBench: false,
    environment: original.environment,
    nativeAnalyzerExecuted: false,
    prepareCalled: false,
    caseWorkersStarted: 0,
    profileAdopted: false,
    artifactUploaded: false,
  };
  await fs.writeFile(
    path.join(output, "layout-bridge-result.json"),
    JSON.stringify(result, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log("PUBLIC_LAYOUT_BRIDGE_BEGIN");
  console.log(JSON.stringify(result, null, 2));
  console.log("PUBLIC_LAYOUT_BRIDGE_END");
}
