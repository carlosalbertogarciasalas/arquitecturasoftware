import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL??(process.platform==='win32'?'msedge':'chromium')});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 await mkdir('docs/evidence',{recursive:true});
 await page.goto(process.argv[2]??'http://localhost:3100');
 await page.getByRole('button',{name:'Explorar como cliente'}).waitFor();
 await page.screenshot({path:'docs/evidence/bienvenida.png',fullPage:true});
 await page.getByRole('button',{name:'Explorar como cliente'}).click();
 await page.getByRole('heading',{name:'Hola, Alicia.'}).waitFor();
 await page.screenshot({path:'docs/evidence/resumen.png',fullPage:true});
 await page.getByRole('button',{name:'Salir',exact:true}).click();
 await page.getByRole('button',{name:'Abrir laboratorio de operador'}).click();
 await page.getByRole('heading',{name:'Cola de solicitudes'}).waitFor();
 await page.screenshot({path:'docs/evidence/laboratorio.png',fullPage:true});
 console.log('Tres capturas guardadas en docs/evidence.');
}finally{await browser.close();}
