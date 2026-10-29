import { Worker, isMainThread, parentPort, workerData, threadId } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const calculate = (start,end) => Array.from({length:end-start},(_,i)=>{let x=`demo-${start+i}`;for(let j=0;j<30;j++)x=createHash('sha256').update(x).digest('hex');return x;});
if(!isMainThread){parentPort.postMessage({threadId,hashes:calculate(workerData.start,workerData.end)});parentPort.close();}
else {
 const workers=[];
 const spawn=(start,end)=>new Promise((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:{start,end}});workers.push(w);let result;w.on('message',m=>{result=m;});w.once('error',reject);w.once('exit',code=>code===0&&result?resolve(result):reject(new Error(`Worker finalizó sin resultado: ${code}`)));});
 try{
  const t0=performance.now(),sequential=calculate(0,2000),sequentialMs=performance.now()-t0;
  const t1=performance.now(),parts=await Promise.all([spawn(0,1000),spawn(1000,2000)]),parallelMs=performance.now()-t1;
  assert.deepEqual(parts.flatMap(p=>p.hashes),sequential);assert.equal(new Set(parts.map(p=>p.threadId)).size,2);
  const url=process.argv[2];let network={executed:false};
  if(url){const start=performance.now();const response=await fetch(new URL('/api/demo/ping',url),{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);const body=await response.json();assert.equal(body.databaseConnected,false);network={executed:true,url:new URL('/api/demo/ping',url).href,elapsedMs:performance.now()-start,body};}
  const report={date:new Date().toISOString(),scope:'ensayo local; no mide capacidad cloud',items:2000,iterationsPerItem:30,sequentialMs,parallelMs,includesWorkerStartupAndCommunication:true,threadIds:parts.map(p=>p.threadId),equivalent:true,network};
  await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/threads.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await Promise.all(workers.map(w=>w.terminate()));}
}
