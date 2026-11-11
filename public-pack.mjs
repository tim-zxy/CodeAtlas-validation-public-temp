// Independent once-only packaging. No measurement, actual22 or production entry.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createReadStream, readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  sourceCommit,
  repository,
  sha,
  assertPublicBytes,
  originalZip,
  verifySeed,
} from "./public-seed.mjs";
import { retainedSeed } from "./retained-seed.mjs";
import { reviewTimeoutMs } from "./public-pack-review.mjs";
import { createProgress, runProgressChild } from "./public-pack-progress.mjs";
const pins = JSON.parse(
  readFileSync(new URL("./public-pack-pins.json", import.meta.url), "utf8"),
);
const api = "https://api.github.com/repos/" + repository;
const target = "codeatlas-p05-d5-public-79da401.zip";
let phase = "START";
const progress = createProgress("PARENT");
const stage = name => { phase = name; progress.enter(name); };
const read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const save = (p, x) =>
  fs.writeFile(p, JSON.stringify(x, null, 2) + "\n", { flag: "wx" });
const imp = (root, file) => import(pathToFileURL(path.join(root, file)).href);
const hfile = async (p) => {
  const h = createHash("sha256");
  for await (const b of createReadStream(p)) h.update(b);
  return h.digest("hex");
};
const pin = (asset, member) => pins.inputPins[asset + ":" + member].sha256;
export function makePublicProfiles({
  paired,
  verification,
  transport,
  fullPeak,
}) {
  assert.deepEqual(paired.environment, verification.environment);
  assert.deepEqual(paired.environment, transport.environment);
  for (const [c, n] of [
    [paired, 234979328],
    [verification, 431362048],
    [transport, 375701504],
  ]) {
    assert.equal(c.reservationBytes, n);
    assert.equal(c.policyRevision, "p05-native-memory-high-water-range-v1");
    assert(
      Number.isSafeInteger(c.observedPeakBytes) && c.observedPeakBytes > 0,
    );
    assert(
      Number.isSafeInteger(c.fluctuationAllowanceBytes) &&
        c.fluctuationAllowanceBytes >= 0,
    );
    assert.equal(c.observedPeakBytes + c.fluctuationAllowanceBytes, n);
  }
  assert(
    Number.isSafeInteger(fullPeak) &&
      fullPeak > 0 &&
      fullPeak <= paired.reservationBytes,
  );
  const common = (c) => ({
    ...c.environment,
    memoryPolicyRevision: c.policyRevision,
    peakMethod: "resourceUsage.maxRSS",
    peakUnits: "bytes",
    reservationBytes: c.reservationBytes,
    observedPeakBytes: c.observedPeakBytes,
    fluctuationAllowanceBytes: c.fluctuationAllowanceBytes,
  });
  return {
    metadata: {
      ...common(paired),
      corpusDigest: paired.corpora.READ_SEAL.digest,
      evidenceDigest: pin(
        "READ_FULL162-evidence.zip",
        "stage/paired/read.json",
      ),
      fullTransportCorpusRevision: paired.corpora.FULL_TRANSPORT.revision,
      fullTransportCorpusDigest: paired.corpora.FULL_TRANSPORT.digest,
      fullTransportEvidenceDigest: pin(
        "READ_FULL162-evidence.zip",
        "stage/paired/full.json",
      ),
      fullTransportPeakBytes: fullPeak,
      memoryCandidateEvidenceDigest: pin(
        "READ_FULL162-evidence.zip",
        "stage/paired/candidate.json",
      ),
    },
    verification: {
      ...common(verification),
      workspace: "REFRESH_VERIFY",
      verificationCorpusRevision: verification.corpus.revision,
      verificationCorpusDigest: verification.corpus.digest,
      evidenceDigest: pin("VERIFY90-evidence.zip", "stage/verify/raw.json"),
      memoryCandidateEvidenceDigest: pin(
        "VERIFY90-evidence.zip",
        "stage/verify/candidate.json",
      ),
    },
    transport: {
      ...common(transport),
      workspace: "REFRESH_TRANSPORT",
      transportCorpusRevision: transport.corpus.revision,
      transportCorpusDigest: transport.corpus.digest,
      evidenceDigest: pin("TRANSPORT154-evidence.zip", "transport/raw.json"),
      memoryCandidateEvidenceDigest: pin(
        "TRANSPORT154-evidence.zip",
        "transport/candidate.json",
      ),
    },
  };
}
function cleanRelative(p) {
  assert(typeof p === "string" && p && !/[:\\\0]/.test(p));
  assert(p.split("/").every((x) => x && x !== "." && x !== ".."));
  assert(!/-(wal|shm|journal)$/i.test(p));
  return p;
}
export function payloadEntries(inventory, native, holdout, licenses = []) {
  const out = inventory
    .filter((x) => x.path.startsWith("transport/"))
    .map((x) => ({
      ...x,
      path: "evidence/" + cleanRelative(x.path.slice(10)),
    }));
  for (const entry of licenses)
    assert(entry.path.startsWith("evidence/licenses/"));
  out.push(
    ...licenses,
    { ...native, path: "native/codeatlas-native-analyzer.exe" },
    { ...holdout, path: "evidence/review/holdout.json" },
  );
  const seen = new Set();
  for (const x of out) {
    cleanRelative(x.path);
    assert(!seen.has(x.path.toLowerCase()));
    seen.add(x.path.toLowerCase());
    assert(Number.isSafeInteger(x.bytes) && x.bytes >= 0);
    assert(/^[a-f0-9]{64}$/.test(x.sha256));
  }
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
async function request(url, options = {}) {
  const r = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(process.env.GH_TOKEN
        ? { Authorization: "Bearer " + process.env.GH_TOKEN }
        : {}),
      ...options.headers,
    },
    signal: AbortSignal.timeout(180000),
  });
  assert(r.ok, "GITHUB_REQUEST_FAILED_" + r.status);
  return r;
}
async function release() {
  const r = await (
    await request(api + "/releases/" + retainedSeed.releaseId)
  ).json();
  assert.equal(r.id, 441241421);
  assert.equal(r.draft, false);
  assert.equal(r.prerelease, true);
  assert.equal(r.target_commitish, retainedSeed.producerCommit);
  assert.equal(r.tag_name, "build-seed-" + retainedSeed.archiveSha256);
  const t = await (await request(api + "/git/ref/tags/" + r.tag_name)).json();
  assert.equal(t.object.sha, retainedSeed.producerCommit);
  return r;
}
async function assets() {
  const a = await (
    await request(api + "/releases/" + retainedSeed.releaseId + "/assets")
  ).json();
  assert(!a.some((x) => x.name === target), "TARGET_ASSET_ALREADY_EXISTS");
  return a;
}
async function regular(p) {
  const s = await fs.lstat(p);
  assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1);
  assert.equal(await fs.realpath(p), p);
  assert(s.size < 128 * 1024 * 1024);
  return fs.readFile(p);
}
async function inventory(root, rel = "", allowLinks = false) {
  const files = [],
    links = [];
  for (const e of await fs.readdir(path.join(root, rel), {
    withFileTypes: true,
  })) {
    if (rel === "" && e.name === ".git") continue;
    const name = rel ? rel + "/" + e.name : e.name;
    const p = path.join(root, name);
    if (e.isSymbolicLink()) {
      assert(allowLinks);
      const target = path
        .relative(root, await fs.realpath(p))
        .split(path.sep)
        .join("/");
      cleanRelative(target);
      links.push({ path: name, target });
    } else if (e.isDirectory()) {
      const child = await inventory(root, name, allowLinks);
      files.push(...child.files);
      links.push(...child.links);
    } else {
      assert(e.isFile());
      const s = await fs.stat(p);
      files.push({ path: name, bytes: s.size, sha256: await hfile(p) });
    }
  }
  return {
    files: files.sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
    ),
    links: links.sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
    ),
  };
}
async function checkMembers(root, entries, privacy = true) {
  progress.enter("MEMBER_HASH");
  const actual = await inventory(root);
  assert.deepEqual(actual.links, []);
  assert.deepEqual(actual.files, entries);
  if (privacy) progress.enter("MEMBER_PRIVACY");
  if (privacy)
    for (const e of entries)
      assertPublicBytes(await regular(path.join(root, e.path)));
}
async function extract(source, work, asset, seed = false) {
  const zip = path.join(work, "downloads", asset.name);
  assert.equal(await hfile(zip), asset.sha256);
  assert.equal((await fs.stat(zip)).size, asset.bytes);
  const tar = path.join(process.env.SystemRoot, "System32/tar.exe");
  const member = seed ? "seed.json" : "handoff.json";
  const bytes = execFileSync(tar, ["-xOf", zip, "--", member], {
    windowsHide: true,
    maxBuffer: 4_000_000,
    timeout: 30000,
  });
  assertPublicBytes(bytes);
  const record = JSON.parse(bytes);
  if (seed) {
    assert.equal(sha(bytes), retainedSeed.manifestSha256);
    assert.equal(record.controlCommit, retainedSeed.producerCommit);
  } else {
    assert.equal(record.sourceCommit, sourceCommit);
    assert.equal(
      record.controlCommit,
      "c8f9e8fa2b90494bdd800968bc413424374b8566",
    );
    assert.equal(record.seedManifestSha256, retainedSeed.manifestSha256);
  }
  const entries = [
    ...record.inventory,
    { path: member, bytes: bytes.length, sha256: sha(bytes) },
  ].sort((a, b) => (a.path < b.path ? -1 : 1));
  for (const e of entries) cleanRelative(e.path);
  assert.equal(
    new Set(entries.map((x) => x.path.toLowerCase())).size,
    entries.length,
  );
  progress.enter("ZIP_VALIDATE");
  await originalZip(source, "Validate", zip, entries);
  const dest = path.join(work, asset.name.replace(".zip", ""));
  await fs.mkdir(dest);
  progress.enter("ZIP_EXTRACT");
  await originalZip(source, "Extract", zip, entries, dest);
  await checkMembers(dest, entries);
  if (seed) await fs.mkdir(path.join(dest, "temp"));
  return { root: dest, entries, record };
}
async function noProcesses(source) {
  const script =
    "$p = Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne " +
    process.pid +
    ' -and ($_.Name -eq "codeatlas-native-analyzer.exe" -or ($_.Name -eq "node.exe" -and $_.CommandLine -like "*' +
    source +
    '*")) }; if ($p) { exit 17 }';
  execFileSync(
    "pwsh.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { windowsHide: true, timeout: 15000, maxBuffer: 10000 },
  );
}
export async function readRole(source, work, execute = runProgressChild) {
  const bytes = await execute(process.execPath,
    [path.join(import.meta.dirname, "public-pack-reader.mjs"), source, work], {
      env: { ...process.env, GH_TOKEN: "", GITHUB_TOKEN: "" },
      timeoutMs: reviewTimeoutMs, maxBuffer: 4_000_000,
    });
  return JSON.parse(bytes);
}
export async function prepareReview(source, work) {
    stage("EXTRACT_FIXED_INPUTS");
    assert(!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN);
    assert.equal(
      (await read(path.join(work, "fetched.json"))).controlCommit,
      process.env.GITHUB_SHA,
    );
    await noProcesses(source);
    const loaded = [];
    for (const [i, a] of pins.assets.entries())
      loaded.push(await extract(source, work, a, i === 0));
    const [seed, paired, verification, transport] = loaded;
    stage("SEED_VERIFY");
    await verifySeed(
      source,
      seed.root,
      retainedSeed.manifestSha256,
      retainedSeed.producerCommit,
    );
    stage("INPUT_PIN_VERIFY");
    for (const [key, p] of Object.entries(pins.inputPins)) {
      const [name, member] = key.split(":");
      const item = loaded[pins.assets.findIndex((a) => a.name === name)];
      const file = path.join(item.root, member);
      assert.equal(await hfile(file), p.sha256);
      assert.equal((await fs.stat(file)).size, p.bytes);
    }
    stage("PRIOR_CLEANUP_VERIFY");
    for (const x of loaded.slice(1)) {
      const clean = await read(
        path.join(x.root, "stage/cleanup-confirmed.json"),
      );
      assert.equal(clean.state, "SETTLED");
      assert.deepEqual(clean.remainingProcesses, []);
      assert.equal(
        (await read(path.join(x.root, "stage/stage-result.json"))).status,
        "CANDIDATES_REVIEW_REQUIRED",
      );
    }
    assert.equal(
      (await read(path.join(transport.root, "stage/cleanup-confirmed.json")))
        .transportTempEmpty,
      true,
    );
    // New exclusive layout only; original read-only ownership is created later.
    const logical = pins.logicalRoot;
    await fs.mkdir(logical);
    await fs.mkdir(path.join(logical, "native"));
    await fs.mkdir(path.join(logical, "evidence"));
    await fs.mkdir(path.join(logical, "temp"));
    const native = seed.record.inventory.find(
      (e) => e.path === "native/codeatlas-native-analyzer.exe",
    );
    const hold = transport.record.inventory.find(
      (e) => e.path === "stage/transport-holdout/holdout.json",
    );
    stage("MATERIALIZE_PAYLOAD");
    const licenses = seed.record.inventory.filter((e) =>
      e.path.startsWith("evidence/licenses/"),
    );
    assert(licenses.length > 0);
    const expected = payloadEntries(
      transport.record.inventory,
      native,
      hold,
      licenses,
    );
    for (const e of expected) {
      const dest = path.join(logical, e.path);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      const from =
        e.path.startsWith("native/") || e.path.startsWith("evidence/licenses/")
          ? path.join(seed.root, e.path)
          : e.path === "evidence/review/holdout.json"
            ? path.join(transport.root, hold.path)
            : path.join(transport.root, "transport", e.path.slice(9));
      await fs.copyFile(from, dest, 1);
    }
    await checkMembers(logical, expected);
    await save(path.join(work, "payload-expected.json"), expected);
    stage("READER_INVENTORY_BEFORE");
    const before = await inventory(source, "", true);
    stage("ORIGINAL_READER_REVIEW");
    const checked = await readRole(source, work);
    assert.equal(checked.state, "ORIGINAL_REVIEW_CONSISTENT");
    return { checked, seed, expected, before, logical };
}
export function assertFixedContext(source, work) {
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.GITHUB_REPOSITORY, repository);
  assert.equal(process.env.GITHUB_RUN_ATTEMPT, "1");
  assert.equal(source, pins.readerRoot);
  assert.equal(work, path.join(path.dirname(source), "pack-work"));
  assert.equal(
    execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: source,
      encoding: "utf8",
      env: { ...process.env, GH_TOKEN: "", GITHUB_TOKEN: "" },
    }).trim(),
    sourceCommit,
  );
}
async function main() {
  const [mode, sourceArg, workArg] = process.argv.slice(2);
  assert(["fetch", "pack", "publish"].includes(mode));
  const source = path.resolve(sourceArg), work = path.resolve(workArg);
  assertFixedContext(source, work);
  if (mode === "fetch") {
    stage("FETCH_FIXED_ASSETS");
    assert(process.env.GH_TOKEN);
    await release();
    const current = await assets();
    await fs.mkdir(path.join(work, "downloads"));
    for (const p of pins.assets) {
      const meta = current.find((a) => a.id === p.id);
      assert(
        meta &&
          meta.name === p.name &&
          meta.size === p.bytes &&
          meta.digest === "sha256:" + p.sha256 &&
          meta.state === "uploaded",
      );
      const response = await request(api + "/releases/assets/" + p.id, {
        headers: { Accept: "application/octet-stream" },
      });
      const f = await fs.open(path.join(work, "downloads", p.name), "wx");
      const h = createHash("sha256");
      let n = 0;
      try {
        for await (const b of response.body) {
          n += b.length;
          assert(n <= p.bytes);
          h.update(b);
          await f.write(b);
        }
        assert.equal(n, p.bytes);
        assert.equal(h.digest("hex"), p.sha256);
      } finally {
        await f.close();
      }
    }
    await save(path.join(work, "fetched.json"), {
      controlCommit: process.env.GITHUB_SHA,
      assets: pins.assets,
    });
    stage("COMPLETE"); progress.finish();
    console.log("PACK_INPUT_ASSETS_FETCHED");
    return;
  }
  if (mode === "pack") {
    const { checked, seed, expected, before, logical } = await prepareReview(source, work);
    const generic = await imp(
      source,
      ".github/qualification/r11-staged-pack.mjs",
    );
    const profiles = makePublicProfiles(checked.data);
    stage("ADOPT_APPROVED_PROFILE_COPY");
    await save(path.join(work, "proposed-adopted-profiles.json"), profiles);
    const profileSource = path.join(
      source,
      "packages/runtime/src/native-metadata-profiles.ts",
    );
    await fs.writeFile(
      profileSource,
      generic.insertProfileEntries(
        await fs.readFile(profileSource, "utf8"),
        profiles,
      ),
    );
    stage("CATALOG_EMIT");
    const emitted = await generic.emitCatalog(
      source,
      path.join(work, "catalog-build"),
    );
    for (const [name, text] of emitted)
      if (name !== "native-metadata-profiles.d.ts")
        await fs.writeFile(
          path.join(source, "packages/runtime/dist", name),
          text,
        );
    stage("READER_INVENTORY_AFTER");
    const after = await inventory(source, "", true);
    stage("READER_DELTA_VERIFY");
    generic.assertReaderDelta(before.files, after.files);
    assert.deepEqual(after.links, before.links);
    stage("RECHECK_SEED");
    await verifySeed(
      source,
      seed.root,
      retainedSeed.manifestSha256,
      retainedSeed.producerCommit,
    );
    stage("RECHECK_READER");
    assert.deepEqual(await readRole(source, work), checked);
    await fs.mkdir(path.join(work, "output"));
    stage("ONCE_ORIGINAL_PACK");
    await save(path.join(work, "pack-attempt.json"), {
      policy: "ONE_CREATE_NO_RETRY",
      sourceCommit,
      controlCommit: process.env.GITHUB_SHA,
    });
    const zip = path.join(work, "output", target);
    const text = execFileSync(
      process.execPath,
      [
        path.join(source, "scripts/native-refresh-ci.mjs"),
        "pack",
        path.join(logical, "evidence/candidate.json"),
        path.join(logical, "evidence/review/holdout.json"),
        zip,
        "p05-d5-exact-layout-v10",
      ],
      {
        cwd: source,
        windowsHide: true,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 300000,
        maxBuffer: 8_000_000,
      },
    );
    const result = JSON.parse(text);
    assert.deepEqual(result.archive.entries, expected);
    assert(result.archive.bytes < 512 * 1024 * 1024);
    assert.equal(await hfile(zip), result.archive.sha256);
    const inspection = path.join(work, "inspection");
    stage("DECODE_AND_VERIFY");
    await fs.mkdir(inspection);
    stage("ZIP_DECODE");
    await originalZip(source, "Extract", zip, expected, inspection);
    await checkMembers(inspection, expected);
    await checkMembers(logical, expected);
    stage("FINAL_CLEANUP_VERIFY");
    assert.deepEqual(await fs.readdir(path.join(logical, "temp")), []);
    await noProcesses(source);
    stage("FINAL_SEED_VERIFY");
    await verifySeed(
      source,
      seed.root,
      retainedSeed.manifestSha256,
      retainedSeed.producerCommit,
    );
    stage("FINAL_READER_VERIFY");
    const final = await inventory(source, "", true);
    assert.deepEqual(final, after);
    await save(path.join(work, "pack-ready.json"), {
      state: "PACKED_DECODED_VERIFIED_NOT_QUALIFIED",
      sourceCommit,
      controlCommit: process.env.GITHUB_SHA,
      archive: result.archive,
      candidateSha256: result.candidateSha256,
      holdoutSha256: result.holdoutSha256,
      profileSha256: await hfile(
        path.join(work, "proposed-adopted-profiles.json"),
      ),
      cleanup: "SETTLED_FIXED_PROCESS_SCAN_NOT_HARD_ISOLATION",
    });
    stage("COMPLETE"); progress.finish();
    console.log(
      "PACKED_DECODED_VERIFIED_NOT_QUALIFIED:" +
        result.archive.sha256 +
        ":" +
        result.archive.bytes,
    );
    return;
  }
  phase = "UPLOAD_VERIFIED_RESULT";
  assert(process.env.GH_TOKEN);
  stage("PUBLIC_SAVE");
  const ready = await read(path.join(work, "pack-ready.json"));
  assert.equal(ready.state, "PACKED_DECODED_VERIFIED_NOT_QUALIFIED");
  assert.equal(ready.controlCommit, process.env.GITHUB_SHA);
  assert.equal(ready.sourceCommit, sourceCommit);
  const zip = path.join(work, "output", target);
  assert.equal(await hfile(zip), ready.archive.sha256);
  assert.equal((await fs.stat(zip)).size, ready.archive.bytes);
  assert(ready.archive.bytes < 512 * 1024 * 1024);
  const r = await release();
  await assets();
  await save(path.join(work, "upload-attempt.json"), {
    name: target,
    sha256: ready.archive.sha256,
    state: "STARTED_NO_RETRY",
  });
  const asset = await (
    await request(r.upload_url.replace(/\{.*$/, "") + "?name=" + target, {
      method: "POST",
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(ready.archive.bytes),
      },
      body: createReadStream(zip),
      duplex: "half",
    })
  ).json();
  assert.equal(asset.name, target);
  assert.equal(asset.state, "uploaded");
  assert.equal(asset.size, ready.archive.bytes);
  assert.equal(asset.digest, "sha256:" + ready.archive.sha256);
  await save(path.join(work, "published-pack.json"), {
    ...ready,
    releaseId: r.id,
    assetId: asset.id,
    name: asset.name,
  });
  console.log(
    JSON.stringify({
      state: ready.state,
      releaseId: r.id,
      assetId: asset.id,
      name: asset.name,
      bytes: asset.size,
      sha256: ready.archive.sha256,
      actual22: "NOT_ATTEMPTED",
      ciReference: "UNCHANGED",
    }),
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
)
  main().catch((error) => {
    const code = /^[A-Z_]{2,80}$/.test(error.code ?? "")
      ? error.code
      : "GUARD_FAILED";
    console.error("CONTROLLED_PACK_STOPPED_NO_RETRY:" + phase + ":" + code);
    process.exitCode = 1;
  });
