# Verification checklist

## Preparado

- [x] Frontend TypeScript + Vite.
- [x] PWA.
- [x] Migration SQL reproducible.
- [x] RPC transaccionales para operaciones críticas.
- [x] RLS + grants explícitos.
- [x] pgTAP tests de esquema, reglas financieras, recurrencias, RLS e integridad.
- [x] Seed reproducible para desarrollo local.
- [x] Script de concurrencia usando dos clientes Supabase independientes.
- [x] GitHub Actions para repetir el proceso en CI.
- [x] Supabase CLI incluido como dependencia de desarrollo (`2.118.0`).

## Verificación pendiente de ejecutar con Docker/Supabase local

Este entorno de ChatGPT no expone un runtime Docker ni el binario Supabase CLI operativo, así que la prueba real de PostgreSQL/pg_cron/RLS y concurrencia no se puede ejecutar aquí. El repositorio queda preparado para ejecutarla localmente o en CI con `npm run verify:supabase`.

## Nota sobre recurrencias

La especificación contiene una inconsistencia textual: para trimestral/semestral describe “tres/seis meses después”, pero los ejemplos concretos fijan `28/02/2026 -> 01/04/2026` y `28/02/2026 -> 01/07/2026`. Los tests usan los ejemplos concretos como criterio de aceptación y la función `next_recurrence_date` se ha alineado con esas fechas.

## Matriz detallada

Consulta `docs/TEST-MATRIX.md` para la correspondencia entre los escenarios de aceptación de la especificación y cada prueba ejecutable.
