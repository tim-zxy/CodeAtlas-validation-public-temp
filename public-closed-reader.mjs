// Tokenless original-reader review. Never starts Native, mutates evidence or grants run authority.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { pathToFileURL } from "node:url";
import { createProgress } from "./public-pack-progress.mjs";
import { assertCopiedProfiles, verifyCopiedCatalog } from "./public-pack-invariants.mjs";
const [source, work, bindingPath] = process.argv.slice(2);
assert.equal(process.argv.length,5);
assert(!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN);
const require = createRequire(import.meta.url),
  audit = { subprocess: 0, mutation: 0, network: 0 };
const deny = (kind) => () => {
  audit[kind]++;
  throw Error("READONLY_PACK_ROLE_REFUSED_" + kind.toUpperCase());
};
for (const name of [
  "spawn",
  "spawnSync",
  "exec",
  "execSync",
  "execFile",
  "execFileSync",
  "fork",
])
  require("node:child_process")[name] = deny("subprocess");
for (const name of [
  "writeFile",
  "appendFile",
  "mkdir",
  "mkdtemp",
  "rename",
  "copyFile",
  "unlink",
  "rm",
  "rmdir",
  "chmod",
  "chown",
  "symlink",
  "link",
  "truncate",
  "cp",
]) {
  for (const n of [name, name + "Sync"]) if (fs[n]) fs[n] = deny("mutation");
  if (fs.promises[name]) fs.promises[name] = deny("mutation");
}
for (const [mod, names] of [
  ["net", ["connect", "createConnection"]],
  ["dgram", ["createSocket"]],
  ["http", ["request", "get"]],
  ["https", ["request", "get"]],
])
  for (const name of names) require("node:" + mod)[name] = deny("network");
globalThis.fetch = deny("network");
syncBuiltinESMExports();
const json = (p) => JSON.parse(fs.readFileSync(p, "utf8")),
  imp = (p) => import(pathToFileURL(path.join(source, p)).href);
const logical = "C:/CodeAtlas-P05-D5-R10";
const root = path.join(logical, "evidence");
let phase;
const progress = createProgress("READER");
const stage = name => { phase = name; progress.enter(name); };
stage("NATIVE_BUILD");
try {
 const layouts=await imp("scripts/helpers/native-refresh-ci-layout.mjs");
 const layout=await layouts.readRefreshCiPackLayoutAt(path.resolve(logical));
 const ctx=layouts.refreshCiFixtureContext(layout);
 const pack=await imp("scripts/helpers/native-refresh-ci-pack.mjs");
 await pack.verifyRefreshCiNativeBuildAt(layout,source);
 const replay=await imp("packages/runtime/test/helpers/native-refresh-transport-replay.mjs");
 const generic=await imp(".github/qualification/r11-staged-pack.mjs");
 const manifest=json(path.join(root,"corpus/artifacts/manifest.json"));
 const original=json(path.join(root,"corpus/local-binding.json")),rebound=json(bindingPath);
 const catalog=await replay.discoverRefreshReplayDependencies(ctx,"p05-refresh-replay-v4");
 generic.assertReboundBinding(original,rebound,catalog.roots);
 stage("ORIGINAL_TRANSPORT_CORPUS");
 const values=await replay.readRefreshTransportReplayCorpus(path.join(root,"corpus/artifacts/manifest.json"),bindingPath,ctx);
 assert.equal(values.length,22);
 stage("COPIED_CATALOG");
 const runtime=await imp("packages/runtime/dist/native-metadata-admission.js");
 const actual=await imp("packages/runtime/dist/native-metadata-profiles.js");
 const profiles=json(path.join(work,"proposed-adopted-profiles.json"));
 assertCopiedProfiles(actual,profiles,runtime);
 assert.deepEqual(runtime.nativeMetadataEnvironment(),json(path.join(root,"candidate.json")).environment);
 stage("COPIED_BINDING");
 await verifyCopiedCatalog(replay,ctx,manifest,rebound);
 assert.deepEqual(audit,{subprocess:0,mutation:0,network:0});
 stage("COMPLETE");progress.finish();
 console.log(JSON.stringify({state:"CLOSED_READER_AND_BINDING_VERIFIED",audit,cases:values.length,
   topologyDigest:catalog.topology.digest,dependencyEntries:catalog.dependencies.length}));
}catch {console.error("CLOSED_READER_REFUSED");process.exitCode=1;}
