// Same supported original PACK API as its CLI, with redacted failure location.
// No semantic gate or creation method is replaced.
import assert from "node:assert/strict";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {classifyPackFailure} from "./public-pack-result.mjs";
try {
  const [source,...args]=process.argv.slice(2);
  assert.equal(path.resolve(source),source);
  assert.equal(args.length,5);assert.equal(args[0],"pack");
  assert(!process.env.GH_TOKEN&&!process.env.GITHUB_TOKEN);
  const {runRefreshCi}=await import(pathToFileURL(path.join(source,"scripts/native-refresh-ci.mjs")).href);
  await runRefreshCi(args); // Also writes the original exclusive .manifest.json on success.
} catch(error) {
  const {kind,gate,line}=classifyPackFailure(error);
  console.error(`PACK_CHILD_FAILED:${kind}:${gate}:${line}`);
  process.exitCode=1;
}
