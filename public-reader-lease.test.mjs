import test from "node:test";
import assert from "node:assert/strict";
import {createReaderLease} from "./public-reader-lease.mjs";
import {consumeRunLocalReader} from "./public-reader-seed.mjs";

function fixture(){
 const initial={files:[{path:"file",sha256:"a",identity:{ino:1}}],links:[],directories:[]};
 let current=structuredClone(initial),context=true,checks=0;
 const lease=createReaderLease({root:"owned-test-root",inventory:initial,
  inspect:async()=>structuredClone(current),compare:assert.deepEqual,
  verifyContext:async()=>{checks++;assert(context,"Changed context");}});
 return {lease,initial,get checks(){return checks;},change:f=>f(current),invalidate:()=>{context=false;}};
}
test("run-local seal checks before, during and after consumption, exactly once",async()=>{
 const f=fixture();
 assert.equal(await f.lease.consume(async({root,check})=>{assert.equal(root,"owned-test-root");await check();return 7;}),7);
 assert.equal(f.checks,3);await assert.rejects(f.lease.consume(()=>{}),/spent or busy/);
});
test("seal is copied, and content, instance, link and directory drift all refuse before consumer",async()=>{
 for(const drift of [x=>x.files[0].sha256="b",x=>x.files[0].identity.ino=2,x=>x.links.push({path:"alias",target:"file"}),x=>x.directories.push("extra")]){
  const f=fixture();f.change(drift);let called=false;
  await assert.rejects(f.lease.consume(()=>{called=true;}));assert.equal(called,false);
  await assert.rejects(f.lease.consume(()=>{}),/spent or busy/);
 }
 const f=fixture();f.initial.files[0].sha256="caller-mutation";
 await f.lease.consume(()=>{});
});
test("context changes, consumer failure and post-use mutation latch refusal",async()=>{
 const a=fixture();a.invalidate();await assert.rejects(a.lease.consume(()=>{}),/Changed context/);
 const b=fixture();await assert.rejects(b.lease.consume(()=>{throw Error("UNKNOWN");}),/UNKNOWN/);
 const c=fixture();await assert.rejects(c.lease.consume(()=>c.change(x=>x.files[0].sha256="changed")));
 for(const f of [a,b,c])await assert.rejects(f.lease.consume(()=>{}),/spent or busy/);
});
test("concurrent use refuses; retained check cannot be used after consumption",async()=>{
 const f=fixture();let release,inside,check;
 const entered=new Promise(r=>inside=r),pending=f.lease.consume(async r=>{check=r.check;inside();await new Promise(r=>release=r);});
 await entered;await assert.rejects(f.lease.consume(()=>{}),/spent or busy/);release();await pending;
 await assert.rejects(check(),/not active/);
});
test("JSON, caller digest, copied token and independently created lease cannot authorize a Public reader",async()=>{
 for(const owner of [{},{readerContentSha256:"a".repeat(64)},JSON.parse('{}'),fixture().lease])
  await assert.rejects(consumeRunLocalReader(owner,()=>{}),/Unknown run-local reader owner/);
});
test("catching a failed check cannot restore a consumed operation",async()=>{
 const f=fixture();
 await assert.rejects(f.lease.consume(async({check})=>{
  f.change(x=>x.files[0].sha256="changed");await assert.rejects(check());
  f.change(x=>x.files[0].sha256="a");
 }));
 await assert.rejects(f.lease.consume(()=>{}),/spent or busy/);
});
test("a detached boundary check must settle before success; late failure refuses",async()=>{
 let calls=0,failLate,started,settled=false;
 const inCheck=new Promise(r=>started=r);
 const lease=createReaderLease({root:"owned-test-root",inventory:{},inspect:async()=>({}),compare:assert.deepEqual,
  verifyContext:async()=>{if(++calls===2){started();await new Promise((_,reject)=>failLate=reject);}}});
 const operation=lease.consume(({check})=>{void check().catch(()=>{});return "must-not-return";});
 operation.then(()=>settled=true,()=>settled=true);
 await inCheck;await new Promise(r=>setImmediate(r));assert.equal(settled,false);
 failLate(Error("late context drift"));await assert.rejects(operation,/late context drift/);
 await assert.rejects(lease.consume(()=>{}),/spent or busy/);
});
