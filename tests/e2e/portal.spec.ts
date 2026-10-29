import { test, expect } from '@playwright/test';
test('cliente, PDF, cola diferida y operador con persistencia entre recargas',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'Explorar como cliente'}).click();
 await expect(page.getByRole('heading',{name:'Hola, Alicia.'})).toBeVisible();
 await expect(page.locator('.points-number')).toContainText('80');
 await page.getByRole('button',{name:'Comprobantes',exact:true}).click();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar PDF'}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/DEMO-.*\.pdf/);
 await page.getByRole('button',{name:'Solicitar envío simulado'}).click();await expect(page.getByRole('status')).toContainText('pendiente');
 await expect(page.locator('.request .badge')).toHaveText('Pendiente');
 await page.reload();await page.getByRole('button',{name:'Abrir laboratorio de operador'}).click();
 await expect(page.locator('tbody tr')).toHaveCount(1);await page.getByRole('button',{name:'Procesar pendientes',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('1 completadas');await expect(page.locator('tbody .badge')).toHaveText('Procesado');
 await page.getByRole('button',{name:'Salir',exact:true}).click();await page.getByRole('button',{name:'Explorar como cliente'}).click();await page.getByRole('button',{name:'Comprobantes',exact:true}).click();
 await expect(page.locator('.request .badge')).toHaveText('Simulación completada');
 await page.getByRole('button',{name:'Solicitar envío simulado'}).click();await expect(page.locator('.request')).toHaveCount(1);
 expect(errors).toEqual([]);
});
test('registro, edición y cambio de perfil no muestran datos del cliente anterior',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Crear un nuevo perfil'}).click();await page.getByLabel('Nombre de ejemplo').fill('Laura Demo');await page.getByLabel('Correo de ejemplo').fill('laura@example.test');await page.getByRole('button',{name:'Crear perfil local'}).click();
 await expect(page.getByRole('heading',{name:'Hola, Laura.'})).toBeVisible();await expect(page.locator('.points-number')).toContainText('0');
 await page.getByRole('button',{name:'Mi perfil',exact:true}).click();await page.getByLabel('Nombre de ejemplo').fill('Laura Editada');await page.getByRole('button',{name:'Guardar cambios'}).click();await expect(page.getByRole('status')).toContainText('actualizado');
 await page.getByRole('button',{name:'Salir',exact:true}).click();await page.locator('#demo-profile').selectOption('demo-alicia');await page.getByRole('button',{name:'Explorar como cliente'}).click();await expect(page.locator('.points-number')).toContainText('80');
 await page.getByRole('button',{name:'Salir',exact:true}).click();await page.locator('#demo-profile').selectOption({label:'Laura Editada'});await page.getByRole('button',{name:'Explorar como cliente'}).click();await expect(page.locator('.points-number')).toContainText('0');await expect(page.getByRole('heading',{name:'Tu historia empieza aquí'})).toBeVisible();
});
test('pantalla móvil sin desbordamiento horizontal',async({page})=>{
 await page.setViewportSize({width:360,height:800});await page.goto('/');await page.getByRole('button',{name:'Explorar como cliente'}).click();
 await expect(page.getByRole('heading',{name:'Hola, Alicia.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/mobile.png',fullPage:true});
});
