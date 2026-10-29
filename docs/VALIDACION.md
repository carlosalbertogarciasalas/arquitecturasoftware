# Validación del prototipo local

Corte: 29 de octubre de 2026. Node.js 22.23.2, Windows, Edge automatizado. Esta evidencia corresponde al prototipo local sin PostgreSQL, según ADR-001; no acredita seguridad ni capacidad productiva.

## Resultados

| Verificación | Resultado observado |
|---|---|
| Compilación Next.js de producción | Correcta; página prerenderizada y endpoint diagnóstico dinámico |
| TypeScript sin caché incremental | Sin errores |
| Pruebas de dominio/IndexedDB emulado | 19 casos aprobados, ninguno fallido |
| Pruebas de navegador sobre build de producción | 3 recorridos aprobados: PDF/cola/recarga; registro/edición/cambio de perfil; móvil de 360 px sin desbordamiento horizontal |
| Inspección visual | Bienvenida, resumen de escritorio y pantalla móvil legibles; capturas en esta carpeta |
| Navegación | 100 movimientos; tres repeticiones de 100 iteraciones por estrategia; conjuntos equivalentes |
| Hilos | Dos workers distintos, mismo resultado que ejecución secuencial; costos de creación/comunicación incluidos |
| HTTP diagnóstico | Petición local al servidor de producción verificada; sin base conectada |

Las pruebas de dominio usan `fake-indexeddb` con transacciones y dos conexiones para carreras. Las pruebas de navegador usan IndexedDB real del navegador. El ensayo de caídas/leases emplea reloj controlado, sin esperar minutos. No se ha probado concurrencia entre distintos dispositivos: no comparten datos en este alcance.

## Relación con la aceptación T01–T17

| Criterios | Evidencia / alcance |
|---|---|
| T01, T04, T05, T07, T08, T14 | Registro persistente local, edición optimista, lote idempotente, saldo 80, solicitud durable y rollback comprobados |
| T02, T03, T17 | Separación lógica de perfiles y acciones de Fachada; **seguridad de servidor y acceso directo remoto pendientes** |
| T06 | PDF descargable marcado demo; no hay Storage ni enlaces firmados en esta variante |
| T09 | No existen configuración ni dependencias de POS/Supabase/PostgreSQL; app de datos locales |
| T10 | Persistencia entre conexiones/recargas comprobada; no se acredita recuperación remota ni backup de datos |
| T11 | Equivalencia y microbenchmark de algoritmos locales; pendiente prueba de carga/navegación en un despliegue público |
| T12 | Workers locales y llamada HTTP a localhost; no se acredita arquitectura distribuida desplegada en nube |
| T13 | Referencia única e inmutabilidad por módulo; sin identidad en configuración |
| T15 | Reclamación concurrente, recuperación, token obsoleto, resultado único, disponibilidad y agotamiento de intentos comprobados localmente |
| T16 | Notificación, cancelación, observador defectuoso, respuestas antiguas y cambio de perfil comprobados |

## Mediciones reproducibles

En el ensayo guardado, los dos workers tardaron aproximadamente 121 ms frente a 106 ms secuenciales. No hubo mejora; para esta carga, crear y comunicar workers cuesta más que el beneficio de paralelizar. La llamada HTTP local tardó unos 77 ms. Son muestras de una máquina, no promedios ni promesas de servicio. [Datos del ensayo](evidence/threads.json).

La estrategia por cursor recorre 20 páginas de cinco elementos para reconstruir los mismos 100 movimientos. Ambas estrategias ordenan en memoria; consultar todas las páginas implica más trabajo local que leer la lista completa. No se atribuye una mejora de rendimiento ni una reducción de carga remota inexistente. [Datos de navegación](evidence/navigation.json).

## Incidencias resueltas durante la verificación

La prueba integral detectó que la clave generada a partir de un documento incluía separadores `:` no aceptados por el validador. Se amplió el formato permitido, se añadió una prueba de regresión y el recorrido PDF/cola volvió a pasar. Una caché incremental de TypeScript conservaba un diagnóstico antiguo; el comando de verificación se ejecuta sin esa caché. La primera ejecución de navegador usó un servidor de desarrollo y se encontró falta de espacio de caché; la verificación final usa producción.

## Pendientes externos

Carlos desplegará en Vercel y comprobará la URL pública. Autenticación real, servidor de datos, RLS, almacenamiento privado, correo y conexión al monolito no forman parte de esta entrega. Informe académico final, video y aceptación del docente no se declaran completados por estas pruebas.
