// Consistency guard only. Public admission additionally requires the private
// constructor-owned token in public-reader-seed.mjs; this helper cannot mint it.
import assert from "node:assert/strict";

export function createReaderLease({root,inventory,inspect,compare,verifyContext}) {
 const sealed=structuredClone(inventory);
 let state="READY";
 const pending=new Set();
 const verify=async()=>{
  assert(state==="CHECKING"||state==="CONSUMING","Reader lease is not active");
  try {await verifyContext();compare(sealed,await inspect(root));}
  catch(error) {state="STOPPED";throw error;}
 };
 const check=async()=>{
  assert.equal(state,"CONSUMING","Reader lease is not active");
  const job=verify();pending.add(job);
  job.then(()=>pending.delete(job),()=>{});return job;
 };
 return Object.freeze({
  async consume(consumer) {
   assert.equal(state,"READY","Reader lease is spent or busy");
   assert.equal(typeof consumer,"function");
   state="CHECKING";
   try {
    await verify();state="CONSUMING";
    const result=await consumer(Object.freeze({root,check}));
    assert.equal(state,"CONSUMING","Reader lease stopped during consumption");
    state="CHECKING";await Promise.all(pending);await verify();
    assert.equal(state,"CHECKING");state="CONSUMED";return result;
   } catch(error) {state="STOPPED";throw error;}
  },
 });
}
