// Diagnostic sequencing only: zero Native/measurement/install/acceptance ports.
export async function runShortDiagnostic(ports,emit,now=()=>performance.now()) {
 const start=now();let ownerChecks=0,hashes=0;
 const send=(step,event,count,matched)=>emit(`SHORT_DIAG:${step}:${event}:${Math.max(0,Math.min(999999999,Math.floor(now()-start)))}:${count}:${matched}`);
 const step=async(id,count,operation)=>{
  send(id,1,count,0);
  try{const result=await operation();send(id,2,count,1);return result;}
  catch(error){send(id,3,count,0);throw error;}
 };
 const owner=await step(1,0,()=>ports.construct());
 await step(2,0,()=>ports.consume(owner,async reader=>{
  await step(3,1,()=>reader.check());ownerChecks++;
  await step(4,0,()=>ports.download(reader));
  for(let i=1;i<=2;i++){await step(4+i,i,()=>ports.hash(reader));hashes++;}
  await step(7,0,()=>ports.assertAbsent());
 }));
 await step(8,0,()=>ports.assertAbsent());
 return Object.freeze({ownerChecks,hashes,samples:0});
}
