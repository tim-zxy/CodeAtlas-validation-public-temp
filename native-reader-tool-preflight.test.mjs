import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const workflow = readFileSync(
  new URL(
    "./.github/workflows/native-reader-tool-preflight.yml",
    import.meta.url,
  ),
  "utf8",
);
const marker = "        run: |\n";
assert.equal(workflow.split(marker).length, 2);
const body = workflow
  .slice(workflow.indexOf(marker) + marker.length)
  .split("\n")
  .map((line) => {
    if (!line) return "";
    assert(line.startsWith("          "));
    return line.slice(10);
  })
  .join("\n");
const module = { exports: {} };
// Loading defines functions only; it does not run main or invoke actual host probes.
new Function("require", "module", "exports", body)(
  createRequire(import.meta.url),
  module,
  module.exports,
);
const api = module.exports,
  e = api.expected;
const env = {
  ImageVersion: e.imageVersion,
  SystemRoot: "X:\\Windows",
  "ProgramFiles(x86)": "X:\\Programs",
};
const fakeCall = (file, args) =>
  file.endsWith("vswhere.exe")
    ? ["X:\\VS"]
    : ["X:\\synthetic-" + args.at(-1), "X:\\other"];
const matchingHash = (file) => {
  const role = file.endsWith("cl.exe")
    ? "cl"
    : file.endsWith("link.exe")
      ? "linker"
      : file.endsWith("rc.exe")
        ? "rc"
        : file.endsWith("tar.exe")
          ? "tar"
          : file.endsWith("node.exe")
            ? "node"
            : file.endsWith("pwsh.exe")
              ? "powershell"
              : file.endsWith("cargo")
                ? "cargo"
                : "rustc";
  return e.tools.find((x) => x.role === role).sha256;
};
test("all original image/tool identities match but never certify Native reuse", () => {
  assert.equal(
    createHash("sha256").update(JSON.stringify(e)).digest("hex"),
    "6b16c3f72fe17e3f54c7ad715ab5b0736bb3e13aa3dd7f11db752997348663cd",
  );
  const report = api.inspect(e, env, fakeCall, matchingHash);
  assert.equal(report.allMatch, true);
  assert.equal(report.image.observed, e.imageVersion);
  assert.equal(report.eligibleForNativeReuse, false);
  assert.equal(report.qualification, "NOT_ATTEMPTED");
  assert.equal(report.nativeExecuted, false);
  assert.deepEqual(
    report.tools.map((x) => x.role),
    api.roles,
  );
  for (const row of report.tools)
    assert.deepEqual(Object.keys(row), ["role", "status", "sha256", "matches"]);
});
test("each wrong tool hash, missing file and wrong image fails without raw path/error output", () => {
  for (const bad of e.tools) {
    const expected = structuredClone(e);
    expected.tools.find((x) => x.role === bad.role).sha256 = "0".repeat(64);
    const r = api.inspect(expected, env, fakeCall, matchingHash);
    assert.equal(r.allMatch, false);
    assert.equal(r.tools.find((x) => x.role === bad.role).matches, false);
  }
  const r = api.inspect(
    e,
    { ...env, ImageVersion: "PRIVATE_CANARY_X:/private" },
    fakeCall,
    () => {
      throw Error("PRIVATE_CANARY_X:/private");
    },
  );
  assert.equal(r.allMatch, false);
  assert.equal(r.image.observed, null);
  assert(!JSON.stringify(r).includes("PRIVATE_CANARY"));
  assert(r.tools.every((x) => x.status === "HASH_FAILED"));
});
test("resolver selection preserves original first-path, explicit toolchain and compiler rules", () => {
  const calls = [],
    memo = {};
  const call = (...args) => {
    calls.push(args);
    return fakeCall(...args);
  };
  for (const role of api.roles) api.resolveTool(e, role, env, call, memo);
  assert.equal(calls.length, 5);
  assert.deepEqual(calls[0], ["where.exe", ["node.exe"], 10000]);
  assert.deepEqual(calls[1], ["where.exe", ["pwsh.exe"], 10000]);
  assert.deepEqual(calls[2], [
    "rustup",
    ["which", "--toolchain", "1.98.1", "cargo"],
    10000,
  ]);
  assert.deepEqual(calls[3], [
    "rustup",
    ["which", "--toolchain", "1.98.1", "rustc"],
    10000,
  ]);
  assert.equal(calls[4][2], 15000);
  assert.deepEqual(calls[4][1], [
    "-latest",
    "-products",
    "*",
    "-requires",
    "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
    "-property",
    "installationPath",
  ]);
  assert(api.resolveTool(e, "cl", env, call, memo).includes(e.vcToolsVersion));
  assert(api.resolveTool(e, "rc", env, call, memo).includes(e.sdkVersion));
  assert.throws(() =>
    api.resolveTool(e, "cl", env, () => ["X:\\A", "X:\\B"], {}),
  );
});
test("uncertain resolver termination stops later probes and reports only bounded fixed fields", () => {
  let calls = 0;
  const r = api.inspect(
    e,
    env,
    () => {
      calls++;
      throw new api.ProbeFault(true);
    },
    matchingHash,
  );
  assert.equal(calls, 1);
  assert.equal(r.allMatch, false);
  assert.equal(r.resolverCleanup, "UNKNOWN");
  assert.equal(r.tools[0].status, "RESOLUTION_FAILED");
  assert(r.tools.slice(1).every((x) => x.status === "NOT_CHECKED"));
  assert(Buffer.byteLength(JSON.stringify(r)) < 8192);
});
test("workflow is manual, zero-permission, bounded and cannot checkout/install/build/publish", () => {
  assert(workflow.includes("  workflow_dispatch:\n"));
  assert(workflow.includes("permissions: {}"));
  assert(workflow.includes("timeout-minutes: 5"));
  assert(workflow.includes("runs-on: windows-2025"));
  assert(workflow.includes("github.run_attempt == 1"));
  assert(workflow.includes("cancel-in-progress: false"));
  assert(
    !/uses:|secrets\.|github\.token|contents:\s*write|upload-artifact|setup-node|toolchain.install|cargo.*build/.test(
      workflow,
    ),
  );
  assert(!/require\(['"](?:https?|net|tls|child_process[^'"]+)['"]/.test(body));
  assert(body.includes("stdio: ['ignore', 'pipe', 'pipe']"));
  assert(body.includes("maxBuffer: 10000"));
  assert(!/console\.|writeFile|appendFile|mkdir|execSync|spawn\(/.test(body));
});

test("Rustup queries forbid automatic install/trace and refuse missing existing metadata", () => {
  const env = {
    RUSTUP_HOME: "X:\\owned-rustup",
    RUSTUP_AUTO_INSTALL: "1",
    RUSTUP_TRACE_DIR: "X:\\synthetic-trace",
  };
  const seen = [];
  const child = api.rustupEnv(env, (file) => {
    seen.push(file);
    return { isDirectory: () => true, isFile: () => true };
  });
  assert.equal(child.RUSTUP_AUTO_INSTALL, "0");
  assert.equal(child.RUSTUP_TRACE_DIR, undefined);
  assert.equal(env.RUSTUP_AUTO_INSTALL, "1");
  assert.equal(env.RUSTUP_TRACE_DIR, "X:\\synthetic-trace");
  assert.equal(seen.length, 2);
  assert.throws(() => api.rustupEnv(env, () => ({ isDirectory: () => false })));
  assert.throws(() =>
    api.rustupEnv(env, () => {
      throw Error("PRIVATE_CANARY");
    }),
  );
});
