import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { CursorHistory, FullHistory } from '../src/domain/strategy';
import type { Movement } from '../src/domain/model';
const data:Movement[]=Array.from({length:100},(_,i)=>({id:`movement-${i}`,profileId:'demo',points:i%2?100:-20,label:'Sintético',createdAt:i}));
const rows=[];
for(let run=1;run<=3;run++){
 for(const name of ['full','cursor']){
  const times=[];let totalPages=0;
  for(let repeat=0;repeat<100;repeat++){
   const start=performance.now();let result:Movement[]=[];let pages=0;
   if(name==='full'){result=new FullHistory().page(data).items;pages=1;}
   else{let cursor:string|undefined;do{const p=new CursorHistory().page(data,cursor,5);result.push(...p.items);cursor=p.next;pages++;}while(cursor);}
   times.push(performance.now()-start);totalPages=pages;assert.deepEqual(result,new FullHistory().page(data).items);
  }
  times.sort((a,b)=>a-b);rows.push({run,strategy:name,items:100,iterations:100,pagesToReadAll:totalPages,p50ms:times[49],p95ms:times[94],equivalent:true});
 }
}
await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/navigation.json',JSON.stringify({date:new Date().toISOString(),scope:'Algoritmo local en Node; excluye red, renderizado y base de datos. No es prueba de carga cloud.',rows},null,2)+'\n');console.log(rows);
