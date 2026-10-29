export const dynamic = 'force-dynamic';
export function GET() { return Response.json({service:'gmpos-clientes-demo',mode:'LOCAL_BROWSER_STORAGE',databaseConnected:false,timestamp:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}}); }
