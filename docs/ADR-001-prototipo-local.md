# ADR-001 — Prototipo local, sin PostgreSQL

Fecha: 29 de octubre de 2026. Estado: implementada por instrucción expresa de Carlos.

## Decisión y motivo

Durante la implementación, Carlos indicó: «este prototipo no lo vamos a conectar con Postgres todavía». El primer entregable se adapta a una demostración autocontenida que se puede publicar en GitHub y después montar en Vercel sin configurar servicios de datos.

Se conserva Next.js/React/TypeScript y se sustituye temporalmente Supabase Auth, PostgreSQL y Storage por selección de perfiles demo, IndexedDB y generación de PDF en el navegador. La elección reduce dependencias para mostrar los flujos. No cumple las garantías de identidad y aislamiento productivo del diseño previo.

## Cambios respecto al rector v0.11

| Diseño previo | Prototipo implementado |
|---|---|
| Auth real y sesión verificada en servidor | Perfil seleccionado en memoria; al recargar vuelve a bienvenida |
| Tablas PostgreSQL, RLS y RPC | Estado local en IndexedDB; una transacción readwrite para cada operación atómica |
| Cola PostgreSQL y consumidor en una Function | Cola IndexedDB y consumidor activado por el operador en el navegador |
| Lease y token de reclamación | Lease de 60 s, token UUID, máximo tres intentos; redelivery y finalización idempotente |
| Documentos en Storage privado y URL temporal | PDF de ejemplo generado en el navegador, sin firma ni almacenamiento remoto |
| API de negocio con permisos y límites compartidos | Fachada local; controles de rol demostrativos, no una frontera de seguridad |
| Ensayo de red entre servicios cloud | Ensayo local de dos workers y petición al endpoint de diagnóstico |

## Consecuencias

La demo funciona sin claves. Dos perfiles tienen aislamiento lógico en las pantallas, pero todos sus registros están en el mismo navegador y son inspeccionables. No habrá contraseñas guardadas localmente ni afirmaciones de seguridad de servidor. La UI indica las limitaciones y solicita datos ficticios.

La persistencia depende del origen, de las cuotas y de la conservación del almacenamiento por el navegador. El consumidor requiere una pestaña activa y una acción explícita. Mensajería no significa correo real ni broker distribuido. Los reintentos no se programan en Vercel.

Para la etapa conectada: implementar identidad real, repositorio de servidor, contratos HTTP, RLS/privilegios, rate limiting compartido, archivos privados, cola de servidor y pruebas negativas de acceso directo. Revalidar diagramas y aceptación antes de conectar datos reales. No migrar automáticamente los perfiles demo como identidades verificadas.
