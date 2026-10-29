import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'GMPOS · Portal de clientes', description:'Prototipo de clientes y fidelización. Datos locales y envíos simulados.' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="es"><body>{children}</body></html>; }
