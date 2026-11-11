import test from "node:test";
import assert from "node:assert/strict";
const api = await import("./public-pack.mjs").catch(() => ({}));
const hash = "a".repeat(64);
test("original empty stderr evidence remains an exact zero-byte package member", () => {
  const empty = {
    path: "transport/corpus/artifacts/case/trial-0.stderr",
    bytes: 0,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  };
  const out = api.payloadEntries(
    [empty],
    { bytes: 4, sha256: hash },
    { bytes: 2, sha256: hash },
  );
  assert.deepEqual(
    out.find((x) => x.bytes === 0),
    { ...empty, path: "evidence/corpus/artifacts/case/trial-0.stderr" },
  );
  assert.throws(() =>
    api.payloadEntries(
      [{ ...empty, bytes: -1 }],
      { bytes: 4, sha256: hash },
      { bytes: 2, sha256: hash },
    ),
  );
});
test("redistributed Native retains the original reviewed license bytes", () => {
  const license = {
    path: "evidence/licenses/owned/LICENSE",
    bytes: 7,
    sha256: hash,
  };
  const out = api.payloadEntries(
    [],
    { path: "native/codeatlas-native-analyzer.exe", bytes: 4, sha256: hash },
    { path: "holdout.json", bytes: 2, sha256: hash },
    [license],
  );
  assert.deepEqual(
    out.find((x) => x.path === license.path),
    license,
  );
  assert.throws(() =>
    api.payloadEntries(
      [],
      { bytes: 4, sha256: hash },
      { bytes: 2, sha256: hash },
      [{ ...license, path: "evidence/other" }],
    ),
  );
});
function data() {
  const env = { node: "v24.15.0" };
  const candidate = (n) => ({
    environment: env,
    policyRevision: "p05-native-memory-high-water-range-v1",
    observedPeakBytes: n - 1024,
    fluctuationAllowanceBytes: 1024,
    reservationBytes: n,
  });
  return {
    paired: {
      ...candidate(234979328),
      corpora: {
        READ_SEAL: { digest: hash },
        FULL_TRANSPORT: { revision: "full", digest: hash },
      },
    },
    verification: {
      ...candidate(431362048),
      corpus: { revision: "verify", digest: hash },
    },
    transport: {
      ...candidate(375701504),
      corpus: { revision: "transport", digest: hash },
    },
    fullPeak: 200000000,
  };
}
test("only the three exact reviewed candidate values can construct copied-reader profile entries", () => {
  assert.equal(typeof api.makePublicProfiles, "function");
  const entries = api.makePublicProfiles(data());
  assert.equal(entries.metadata.reservationBytes, 234979328);
  assert.equal(entries.verification.reservationBytes, 431362048);
  assert.equal(entries.transport.reservationBytes, 375701504);
  for (const change of [
    (x) => x.transport.reservationBytes++,
    (x) => (x.verification.environment = { node: "other" }),
    (x) => (x.paired.fluctuationAllowanceBytes = 0),
    (x) => (x.fullPeak = 300000000),
  ]) {
    const x = data();
    change(x);
    assert.throws(() => api.makePublicProfiles(x));
  }
});
test("payload mapping preserves every original Transport byte and adds only Native and identical holdout", () => {
  assert.equal(typeof api.payloadEntries, "function");
  const original = [
    { path: "transport/corpus/local-binding.json", bytes: 2, sha256: hash },
    { path: "transport/raw.json", bytes: 3, sha256: hash },
    { path: "stage/cleanup-confirmed.json", bytes: 5, sha256: hash },
  ];
  const out = api.payloadEntries(
    original,
    { path: "native/codeatlas-native-analyzer.exe", bytes: 4, sha256: hash },
    { path: "stage/transport-holdout/holdout.json", bytes: 6, sha256: hash },
  );
  assert.deepEqual(
    out.map((x) => x.path),
    [
      "evidence/corpus/local-binding.json",
      "evidence/raw.json",
      "evidence/review/holdout.json",
      "native/codeatlas-native-analyzer.exe",
    ],
  );
  assert.equal(out[0].sha256, hash);
  for (const path of [
    "transport/../escape",
    "transport/C:/escape",
    "transport/a-wal",
    "transport/a\\b",
    "transport/RAW.json",
  ])
    assert.throws(() =>
      api.payloadEntries(
        [...original, { path, bytes: 1, sha256: hash }],
        {
          path: "native/codeatlas-native-analyzer.exe",
          bytes: 4,
          sha256: hash,
        },
        { path: "holdout.json", bytes: 6, sha256: hash },
      ),
    );
});

test("async readonly wrapper preserves fixed arguments, budget, empty tokens and parsed output", async () => {
  const result = await api.readRole("unused-source", "unused-work", async (_exe,args,options) => {
    assert.equal(args[1], "unused-source"); assert.equal(args[2], "unused-work");
    assert.equal(options.timeoutMs, 1200000);
    assert.equal(options.maxBuffer, 4_000_000);
    assert.equal(options.env.GH_TOKEN, ""); assert.equal(options.env.GITHUB_TOKEN, "");
    return Buffer.from('{"state":"ORIGINAL_REVIEW_CONSISTENT"}');
  });
  assert.equal(result.state, "ORIGINAL_REVIEW_CONSISTENT");
  const failure=Object.assign(new Error("fixed"),{code:"ETIMEDOUT"});
  await assert.rejects(api.readRole("unused", "unused",async()=>{throw failure;}), e=>e===failure);
});

test("copied role is explicit, fresh-child scoped and bounded without a full review fallback",async()=>{
 const r=await api.readRole("owned-source","owned-work",async(_exe,args,options)=>{
  assert.equal(args[3],"catalog-binding");assert.equal(options.timeoutMs,300000);
  assert.equal(options.env.GH_TOKEN,"");assert.equal(options.env.GITHUB_TOKEN,"");
  return Buffer.from('{"state":"COPIED_CATALOG_AND_BINDING_VERIFIED"}');
 },"catalog-binding");
 assert.equal(r.state,"COPIED_CATALOG_AND_BINDING_VERIFIED");
 await assert.rejects(api.readRole("unused","unused",async()=>Buffer.from('{}'),"unknown"));
});
