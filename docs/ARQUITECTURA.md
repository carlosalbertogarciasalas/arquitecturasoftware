# Arquitectura implementada — prototipo local v0.1.0

El repositorio contiene un canal de demostración independiente. No importa bibliotecas del monolito ni conoce su conexión de base de datos.

## Componentes y relaciones

| Componente | Responsabilidad | Relación |
|---|---|---|
| Next.js App Router | Página y entrega de recursos; diagnóstico `/api/demo/ping` | Sirve la aplicación; no almacena datos de clientes |
| Portal React | Bienvenida, perfil, puntos, comprobantes y laboratorio | Invoca la Fachada con el contexto demo seleccionado |
| LoyaltyFacade | Valida y coordina operaciones | Depende de Repository y DemoConfig; no conserva una sesión global |
| IndexedDbRepository | Leer y modificar el estado local | Transacciones readwrite serializadas por el navegador, incluso entre conexiones |
| Subject | Publicar snapshots autorizados por la lógica demo | VistaSaldo/History se suscriben; generación invalida respuestas de sesiones anteriores |
| SimulatedDeliveryAdapter | Espera breve y éxito/fallo sintético | Consumidor lo invoca después de reclamar un mensaje |
| FullHistory / CursorHistory | Orden y navegación | Interfaz HistoryStrategy; comparación reproducible |
| PDF-lib | Crear comprobante con advertencia fiscal | Carga bajo demanda; genera un Blob descargable en el navegador |

La estructura es `src/app` → `src/components` → `src/domain` → interfaz `Repository` ← `src/infrastructure`. El dominio no depende de React, Next.js ni APIs de un proveedor cloud. Los módulos de configuración y observación tienen ámbitos diferentes: Singleton de configuración por módulo; Subject por instancia del portal.

## Modelo local

IndexedDB `gmpos-clientes-demo-v1`, almacén `state`, clave `current`, versión de esquema 1. Guarda perfiles, movimientos, comprobantes, solicitudes, mensajes, resultados e identidades de lotes importados. El agrupamiento en una fila facilita atomicidad para un volumen de demo; no se propone para grandes volúmenes ni concurrencia comercial.

Registro normaliza correo y rechaza duplicados locales. Edición exige versión optimista. El lote welcome-v1 crea +100, −20 y un comprobante en una transacción; la clave incluye el perfil. Repetirlo no duplica efectos. No se admiten lotes externos ni se sincroniza con el POS.

## Flujo de mensajería implementado

1. Cliente solicita envío; Fachada comprueba pertenencia del documento y clave estable.
2. Una transacción inserta solicitud PENDIENTE y mensaje PENDIENTE, o retorna la solicitud existente. La acción termina sin consumir el mensaje.
3. Operador activa consumidor; `claim` reserva hasta diez mensajes con token UUID y lease de 60 segundos.
4. El adaptador simulado termina. `complete` valida token/plazo y confirma resultado único, mensaje PROCESADO y solicitud SIMULADO en una transacción.
5. Fallo: disponibilidad tras 5 s o 30 s. Tercer fallo termina FALLIDO. La siguiente activación recupera reservas vencidas; el token anterior no puede finalizar. Si vence la tercera reserva, el barrido la marca fallida.

Cerrar la pestaña puede interrumpir al consumidor, pero el mensaje reservado permanece hasta recuperarlo. La interfaz permite actualizar y activar de nuevo; no hay trabajo en segundo plano una vez cerrada la aplicación. Para una misma solicitud y clave, repetir devuelve el recibo existente; un resultado confirmado no vuelve a crearse.

## Diagramas de diseño y su interpretación

Los [UML editables en Lucid](https://lucid.app/lucidchart/0cdee5ed-b7bd-42b6-89b8-b3d80e9db70c/edit) conservan la arquitectura actual y las propuestas cloud:

| Vista | Aplicación en la variante local |
|---|---|
| [TB08 Singleton](https://lucid.app/lucidchart/0cdee5ed-b7bd-42b6-89b8-b3d80e9db70c/edit?pageId=O1FHt3azsbWK) | Implementado con DemoConfig; la copia de módulo se ejecuta en el navegador |
| [TB09.1 Mensajería](https://lucid.app/lucidchart/0cdee5ed-b7bd-42b6-89b8-b3d80e9db70c/edit?pageId=S1FHP38rKYQr) y [TB09.2 Recuperación](https://lucid.app/lucidchart/0cdee5ed-b7bd-42b6-89b8-b3d80e9db70c/edit?pageId=W1FHF6BXzdPK) | Invariantes de cola conservadas; PostgreSQL/HTTP protegidos se sustituyen por IndexedDB/Fachada local; no hay 202 HTTP de negocio |
| [TB10 Observador](https://lucid.app/lucidchart/0cdee5ed-b7bd-42b6-89b8-b3d80e9db70c/edit?pageId=11FH4CA6gUFM) | Implementado localmente; consulta a repositorio en lugar de API autenticada |
| [TB11 Fachada](https://lucid.app/lucidchart/0cdee5ed-b7bd-42b6-89b8-b3d80e9db70c/edit?pageId=51FHty4W79E1) | Fachada implementada; servicios pequeños integrados en sus métodos; controles locales sin RLS |

Estos enlaces describen el diseño previo y las diferencias se registran explícitamente en [ADR-001](ADR-001-prototipo-local.md). No se presentan como diagramas exactos de un despliegue PostgreSQL existente.

## Evolución posterior

La interfaz Repository define el punto inicial de sustitución, pero pasar a un servidor no consiste solo en cambiar un adaptador: las validaciones y transacciones deberán mudarse a un contexto confiable; autenticar cada petición y bloquear accesos directos. Las pruebas locales no sustituyen pruebas de RLS, autorización remota, cuotas o concurrencia distribuida.
