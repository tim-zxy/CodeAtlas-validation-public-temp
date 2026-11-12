// Fixed-fixture launcher; requires matching explicit execution authorization.
import assert from 'node:assert/strict';
import path from 'node:path';
import {runOwnedActualRequest} from './public-owned-actual.mjs';
import {actualDiagnostics} from './public-actual-diagnostics.mjs';
actualDiagnostics.enable();let succeeded=false;
const heartbeat=setInterval(()=>actualDiagnostics.heartbeat(),45000);
heartbeat.unref();
try {
 const [command,source,work,request,requestSha256,coordinatorSha256]=process.argv.slice(2);
 assert.equal(process.argv.length,8);assert.equal(command,'collect');
 console.log(JSON.stringify(await runOwnedActualRequest(path.resolve(source),path.resolve(work),request,requestSha256,coordinatorSha256)));
 succeeded=true;
} catch {
 console.error('PUBLIC_OWNED_ACTUAL_REFUSED_OR_FAILED: preserve evidence; no automatic retry');
 process.exitCode=1;
} finally {clearInterval(heartbeat);actualDiagnostics.finish(succeeded);}
