import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceSha = "a4b54bfc4319d2f25c498cc03cabc4a3f539e38a";
const tests = [
  "packages/runtime/test/native-refresh-composition.test.mjs",
  "packages/runtime/test/native-refresh-transport-memory.test.mjs",
  "packages/runtime/test/native-refresh-transport-replay.test.mjs",
  "packages/runtime/test/native-refresh-d-context.test.mjs",
  "scripts/test-native-refresh-transport-memory.mjs",
  "scripts/test-native-refresh-ci-layout.mjs",
  "scripts/test-native-refresh-ci-pack.mjs",
  "scripts/test-native-refresh-ci.mjs",
];

export function redact(value) {
  return String(value)
    .replace(/(?:https?:\/\/)[^\s'"<>]+/g, "<URL>")
    .replace(/[A-Za-z]:[\\/][^\s'"<>]*/g, "<PATH>")
    .replace(/\/(?:home|Users|tmp)\/[^\s'"<>]*/g, "<PATH>")
    .replace(/(?:github_pat_|gh[pousr]_|AKIA)[A-Za-z0-9_]+/g, "<REDACTED>")
    .replace(/[A-Za-z0-9+/=_-]{128,}/g, "<LONG_VALUE>")
    .slice(0, 600);
}

export function failures(text) {
  const lines = text.split(/\r?\n/);
  const selected = [];
  for (let i = 0; i < lines.length && selected.length < 12; i++) {
    if (/^\s*not ok\b|^\s*(?:error:|failureType:)|Error:/.test(lines[i])) {
      selected.push(lines.slice(Math.max(0, i - 1), i + 28).map(redact));
      i += 27;
    }
  }
  return selected;
}

async function main(stage) {
  assert(["install", "build", "test"].includes(stage));
  assert.equal(process.argv.length, 3);
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(
    process.env.GITHUB_REPOSITORY,
    "tim-zxy/CodeAtlas-validation-public-temp",
  );
  assert.equal(process.env.GITHUB_RUN_ATTEMPT, "1");
  assert.equal(process.version, "v24.15.0");
  assert(!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN);
  const workspace = await realpath(process.env.GITHUB_WORKSPACE);
  const root = path.join(workspace, "source");
  assert.equal(await realpath(root), root);
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(head.status, 0);
  assert.equal(head.stdout.trim(), sourceSha);
  const output = path.join(workspace, "diagnostic");
  await mkdir(output, { recursive: true });
  const raw = path.join(output, "raw");
  const safe = path.join(output, "safe");
  await mkdir(raw, { recursive: true });
  await mkdir(safe, { recursive: true });
  const report = {
    schemaVersion: 1,
    sourceSha,
    runId: process.env.GITHUB_RUN_ID,
    stage,
    qualification: false,
    actual22: false,
    results: [],
    cleanup: "NOT_PROVEN",
  };
  const save = () =>
    writeFile(
      path.join(safe, stage + ".json"),
      JSON.stringify(report, null, 2) + "\n",
    );
  const temp = path.join(root, ".superpowers/native-memory/refresh-regression");
  const env = { ...process.env, TEMP: temp, TMP: temp };
  await mkdir(env.TEMP, { recursive: true });
  delete env.NODE_OPTIONS;
  delete env.GITHUB_TOKEN;
  delete env.GH_TOKEN;
  async function invoke(name, executable, args, timeout) {
    const started = Date.now();
    const child = spawnSync(executable, args, {
      cwd: root,
      env,
      encoding: "utf8",
      windowsHide: true,
      timeout,
      maxBuffer: 20 * 1024 * 1024,
    });
    const stdout = child.stdout ?? "";
    const stderr = child.stderr ?? "";
    await writeFile(path.join(raw, name + ".stdout.txt"), stdout, {
      flag: "wx",
    });
    await writeFile(path.join(raw, name + ".stderr.txt"), stderr, {
      flag: "wx",
    });
    const row = {
      name,
      testFile: stage === "test" ? tests[report.results.length] : null,
      exitCode: child.status,
      signal: child.signal,
      errorCode: child.error?.code ?? null,
      elapsedMs: Date.now() - started,
      stdoutSha256: createHash("sha256").update(stdout).digest("hex"),
      stderrSha256: createHash("sha256").update(stderr).digest("hex"),
      failures: failures(stdout + "\n" + stderr),
      totals: stdout
        .split(/\r?\n/)
        .filter((line) =>
          /^# (?:tests|pass|fail|cancelled|skipped|todo) \d+$/.test(line),
        )
        .map(redact),
    };
    report.results.push(row);
    await save();
    console.log(
      JSON.stringify({
        stage,
        name,
        exitCode: row.exitCode,
        errorCode: row.errorCode,
        elapsedMs: row.elapsedMs,
      }),
    );
    if (child.status !== 0 || child.signal || child.error) {
      process.exitCode = 1;
      return false;
    }
    return true;
  }
  if (stage === "install") {
    await invoke(
      "dependencies",
      process.env.ComSpec,
      ["/d", "/s", "/c", "pnpm install --frozen-lockfile --ignore-scripts"],
      300_000,
    );
  } else if (stage === "build") {
    if (
      !(await invoke(
        "typescript",
        process.env.ComSpec,
        ["/d", "/s", "/c", "pnpm build"],
        300_000,
      ))
    )
      return;
    await invoke(
      "native",
      "cargo",
      ["build", "--workspace", "--jobs", "1"],
      480_000,
    );
  } else {
    const declared = JSON.parse(
      await readFile(path.join(root, "package.json"), "utf8"),
    ).scripts["test:native-refresh"];
    assert.equal(
      declared,
      "node --test --test-concurrency=1 " + tests.join(" "),
    );
    const groupStarted = Date.now();
    for (let index = 0; index < tests.length; index++) {
      const remaining = 20 * 60_000 - (Date.now() - groupStarted);
      if (remaining <= 0) {
        report.stopped = "GROUP_TIMEOUT";
        process.exitCode = 1;
        await save();
        return;
      }
      if (
        !(await invoke(
          "file-" + (index + 1),
          process.execPath,
          [
            "--test",
            "--test-reporter=tap",
            "--test-concurrency=1",
            tests[index],
          ],
          Math.min(15 * 60_000, remaining),
        ))
      )
        return;
    }
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv[2]).catch(() => {
    console.error("DIAGNOSTIC_STOPPED_WITHOUT_RETRY");
    process.exitCode = 1;
  });
}
