import assert from "node:assert/strict";
import { writeSync } from "node:fs";
import { spawn } from "node:child_process";
import { reviewStages } from "./public-pack-review.mjs";
export const parentStages = Object.freeze([
  "READER_BUILD", "DIAGNOSTIC_FINAL_CHECK", "FETCH_FIXED_ASSETS", "EXTRACT_FIXED_INPUTS", "ZIP_VALIDATE", "ZIP_EXTRACT",
  "MEMBER_HASH", "MEMBER_PRIVACY", "SEED_VERIFY", "INPUT_PIN_VERIFY",
  "PRIOR_CLEANUP_VERIFY", "MATERIALIZE_PAYLOAD", "READER_INVENTORY_BEFORE",
  "ORIGINAL_READER_REVIEW", "ADOPT_APPROVED_PROFILE_COPY", "CATALOG_EMIT",
  "REVIEW_IDENTITY_RECHECK", "READER_DELTA_VERIFY", "READER_INVENTORY_AFTER", "RECHECK_SEED",
  "RECHECK_READER", "ONCE_ORIGINAL_PACK", "DECODE_AND_VERIFY", "ZIP_DECODE",
  "FINAL_CLEANUP_VERIFY", "FINAL_SEED_VERIFY", "FINAL_READER_VERIFY",
  "PUBLIC_SAVE", "COMPLETE",
]);
const stages = { PARENT: parentStages, READER: reviewStages };
const elapsed = value => {
  const n = Math.floor(value);
  assert(Number.isSafeInteger(n) && n >= 0);
  return n;
};
const output = line => writeSync(2, line + "\n");
export function createProgress(role, emit = output, now = () => performance.now()) {
  assert(Object.hasOwn(stages, role));
  const start = now(); let active, since, count = 0;
  const send = (stage, event, time, duration) => {
    assert(++count <= 256, "Progress event bound exceeded");
    emit(["PACK_PROGRESS", role, stage, event, elapsed(time - start), elapsed(duration)].join(":"));
  };
  return {
    enter(stage) {
      assert(stages[role].includes(stage));
      const time = now();
      if (active) send(active, "END", time, time - since);
      active = stage; since = time; send(stage, "BEGIN", time, 0);
    },
    finish() {
      if (!active) return;
      const time = now(); send(active, "END", time, time - since); active = undefined;
    },
  };
}
export function progressFilter(emit = output) {
  let partial = "", dropping = false, count = 0;
  return chunk => {
    // Parse only short ASCII frames. Do not retain or print arbitrary stderr.
    for (const byte of chunk) {
      if (byte === 10) {
        if (!dropping && count < 256) {
          const line = partial.endsWith("\r") ? partial.slice(0, -1) : partial;
          const f = line.split(":");
          const progress = f.length === 6 && f[0] === "PACK_PROGRESS" &&
            stages[f[1]]?.includes(f[2]) && ["BEGIN", "END"].includes(f[3]) &&
            f.slice(4).every(x => /^(0|[1-9][0-9]{0,9})$/.test(x));
          const failure = f.length === 3 && f[0] === "READONLY_PACK_REVIEW_FAILED" &&
            reviewStages.includes(f[1]) &&
            ["ERR_ASSERTION", "AssertionError", "Error", "TypeError", "ENOENT", "EACCES", "EPERM"].includes(f[2]);
          if (progress || failure) { emit(line); count++; }
        }
        partial = ""; dropping = false;
      } else if (!dropping) {
        if (byte < 13 || byte > 126 || partial.length >= 256) { partial = ""; dropping = true; }
        else partial += String.fromCharCode(byte);
      }
    }
  };
}
export function runProgressChild(executable, args, {
  timeoutMs, maxBuffer = 4_000_000, env = process.env, cwd,
  signal, onProgress = output, spawnChild = spawn,
} = {}) {
  assert(Number.isSafeInteger(timeoutMs) && timeoutMs > 0);
  return new Promise((resolve, reject) => {
    const child = spawnChild(executable, args, { cwd, env, signal,
      windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const chunks = []; let bytes = 0, failure, finished = false, grace;
    const finish = error => {
      if (finished) return; finished = true;
      clearTimeout(timer); clearTimeout(grace);
      if (error) reject(error); else resolve(Buffer.concat(chunks));
    };
    const awaitClose = () => {
      grace ??= setTimeout(() => finish(Object.assign(new Error("CLEANUP_UNKNOWN"),
        { code: "CLEANUP_UNKNOWN" })), 5000);
    };
    let stopping = false;
    const stop = code => {
      failure ??= Object.assign(new Error(code), { code });
      if (!stopping) { stopping = true; child.kill(); }
      awaitClose();
    };
    const timer = setTimeout(() => stop("ETIMEDOUT"), timeoutMs);
    const consume = progressFilter(onProgress);
    child.stdout.on("data", chunk => {
      bytes += chunk.length;
      if (bytes > maxBuffer) stop("STDOUT_LIMIT");
      else if (!failure) chunks.push(chunk);
    });
    child.stderr.on("data", chunk => {
      try { consume(chunk); } catch { stop("DIAGNOSTIC_FAILED"); }
    });
    child.on("error", error => {
      failure ??= error;
      // spawn already attempted termination on AbortSignal. Do not retry kill;
      // wait only the fixed grace period for close, otherwise retain UNKNOWN.
      if (child.pid) { stopping = true; awaitClose(); }
      else finish(failure);
    });
    child.on("close", (code, exitSignal) => {
      if (failure) finish(failure);
      else if (code !== 0 || exitSignal) finish(Object.assign(new Error("READONLY_CHILD_FAILED"),
        { code: "READONLY_CHILD_FAILED" }));
      else finish();
    });
  });
}
