// Closed until real fixture identities are reviewed and pinned in the coordinator.
import assert from 'node:assert/strict';
import {runOwnedActualRequest} from './public-owned-actual.mjs';
try {
 const [command,source,work,request,requestSha256,coordinatorSha256]=process.argv.slice(2);
 assert.equal(process.argv.length,8);assert.equal(command,'collect');
 console.log(JSON.stringify(await runOwnedActualRequest(source,work,request,requestSha256,coordinatorSha256)));
} catch {
 console.error('PUBLIC_OWNED_ACTUAL_REFUSED_OR_FAILED: preserve evidence; no automatic retry');
 process.exitCode=1;
}
