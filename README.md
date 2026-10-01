# Gastos compartidos

Aplicación PWA mobile-first para gestionar gastos compartidos, pagos, saldos, historial y gastos recurrentes. La aplicación no usa autenticación de Supabase y no tiene backend propio: el navegador se conecta directamente al proyecto Supabase configurado por la instalación.

## Estado de la implementación

Esta entrega contiene:

- Frontend React + TypeScript + Vite.
- Tailwind CSS 4 con diseño mobile-first.
- PWA con `vite-plugin-pwa` y service worker para recursos estáticos.
- Cliente Supabase inicializado dinámicamente desde URL + publishable/anon key guardadas en `localStorage`.
- Esquema PostgreSQL reproducible mediante una única migración.
- RLS habilitado en todas las tablas expuestas.
- Operaciones críticas encapsuladas en funciones PostgreSQL/RPC con `SECURITY DEFINER`, `search_path` fijado y permisos explícitos.
- Reparto determinista de céntimos ordenando por UUID.
- Protección transaccional contra sobrepagos y carreras entre pagos.
- Recurrencias idempotentes con `UNIQUE(recurring_expense_id, expense_date)` y recuperación de ocurrencias faltantes.
- Vista de saldos y de resúmenes de gastos.
- Pruebas unitarias locales para dinero, reparto y reglas de recurrencia.
- Smoke test de base de datos para ejecutar en un proyecto Supabase real.

La especificación exige que la lógica financiera quede protegida por PostgreSQL y que las migraciones, RPC, RLS, PWA y pruebas formen parte del proyecto. Esta estructura sigue ese orden y no sustituye las operaciones reales por mocks. 

## Requisitos

- Node.js 20.19+ o 22.12+.
- Un proyecto Supabase compatible.
- Supabase CLI para aplicar migraciones y ejecutar pruebas de base de datos.
- Conexión a internet para usar la aplicación.

## Instalación local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

La aplicación solicitará:

1. URL del proyecto Supabase.
2. Clave `publishable/anon`.

No introduzcas una `service_role` key. La clave se guarda únicamente en el navegador y no se copia a variables públicas de build.

## Crear el proyecto Supabase

Crea un proyecto vacío en Supabase y, desde la raíz de este proyecto, enlaza el proyecto con la Supabase CLI.

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
```

Aplica la migración:

```bash
supabase db push
```

La migración crea las tablas, índices, RLS, vistas, funciones RPC y el job diario de generación de recurrencias.

### Cron

El proyecto usa `pg_cron` directamente dentro de PostgreSQL. La migración programa `generate-recurring-expenses` a las 00:05 UTC y pasa explícitamente la fecha de negocio en zona `Europe/Madrid` a la función.

Si tu instalación utiliza otra zona horaria de negocio, modifica esa llamada en la migración antes del despliegue. Las fechas de gastos son `date`; los pagos y el historial son `timestamptz`.

La tarea es idempotente: puede ejecutarse varias veces y la restricción única evita duplicar una misma ocurrencia. Si el Cron se interrumpe, la función recorre todas las ocurrencias pendientes hasta la fecha de negocio actual.

## Pruebas

La validación está preparada en tres capas:

1. **Frontend/dominio** con Vitest.
2. **PostgreSQL/RLS/RPC** con pgTAP a través de `supabase test db`.
3. **Concurrencia real vía API** con dos clientes Supabase independientes, para comprobar que dos pagos simultáneos no superan el importe y que `pay_remaining_amount` sólo crea un pago.

Requisitos para la validación de Supabase local: Docker Desktop (o runtime compatible con API de Docker) y la Supabase CLI. La documentación actual de Supabase indica que el stack local se ejecuta en contenedores y que `supabase test db` ejecuta pgTAP en el Postgres local.

```bash
npm install
npm run supabase:start
npm run db:reset
npm run test:db
npm test
npm run build
npm run test:db:concurrency
```

O todo de una vez:

```bash
npm run verify:supabase
```

El script arranca el stack, resetea la base desde cero, ejecuta migraciones + seed, ejecuta todos los tests pgTAP, los tests de frontend, el build, la prueba real de concurrencia vía API y el lint de PostgreSQL.

En CI existe además `.github/workflows/supabase.yml`, que repite este flujo en un runner limpio.

## Arquitectura

```text
src/
├── components/
├── lib/
│   ├── AppContext.tsx
│   ├── config.ts
│   ├── dates.ts
│   ├── errors.ts
│   ├── money.ts
│   ├── repartition.ts
│   └── supabase.ts
├── pages/
├── services/
├── types/
└── main.tsx

supabase/
├── migrations/
└── tests/
```

Las lecturas utilizan las tablas/vistas protegidas por RLS. Las operaciones de escritura críticas utilizan RPC:

- `create_expense`
- `create_payment`
- `update_payment`
- `delete_payment`
- `pay_remaining_amount`
- `delete_expense`
- `create_user`
- `deactivate_user`
- `toggle_recurring_expense`
- `generate_recurring_expenses`

## Seguridad y modelo sin Auth

La instalación está deliberadamente basada en la idea de “usuarios locales” descrita en la especificación. Sin Supabase Auth no existe una identidad criptográficamente verificable para distinguir a Juan de Pedro.

Por ello:

- Las lecturas compartidas se permiten a `anon` mediante RLS.
- Las tablas no permiten inserts/updates/deletes directos al cliente.
- Las escrituras se ejecutan mediante RPC controladas.
- Las funciones `SECURITY DEFINER` fijan `search_path` y no se dejan ejecutables de forma pública.
- El historial registra el usuario local seleccionado, pero no se considera autenticación.

## Reglas de saldo

El saldo se calcula como:

```text
saldo = total pagado - total que le correspondía pagar
```

Sólo participan gastos cuya fecha es igual o anterior a la fecha de negocio actual. Los usuarios inactivos siguen apareciendo si tienen actividad histórica.

## Recurrencias

Las reglas implementadas son:

- semanal: `+7 días`;
- mensual: día `1` del mes siguiente;
- trimestral: siguiente frontera de trimestre (por ejemplo, `28/02/2026 -> 01/04/2026`);
- semestral: siguiente frontera semestral (por ejemplo, `28/02/2026 -> 01/07/2026`);
- anual: `1 de enero` del año siguiente.

La fecha final de la recurrencia es inclusiva.

## PWA

La PWA está configurada con caché de recursos estáticos y navegación de shell. La aplicación **no** ofrece operaciones offline: cualquier lectura o escritura de datos requiere conexión con Supabase.

## Despliegue

La aplicación es estática y puede desplegarse en un hosting compatible con Vite/PWA.

```bash
npm run build
```

Publica el contenido de `dist/` en el proveedor elegido y configura fallback de SPA hacia `index.html` cuando el proveedor lo requiera.

El proyecto Supabase debe tener la migración aplicada de forma independiente.

## Decisiones de implementación importantes

1. El backend financiero es PostgreSQL, no React.
2. Los importes se almacenan como `NUMERIC(12,2)`.
3. Los céntimos sobrantes se asignan de forma determinista por UUID.
4. El estado de un gasto se deriva de `payments`; no se almacena `status` en la tabla base.
5. Un usuario inactivo nunca se elimina físicamente.
6. Al eliminar un gasto, sus participantes y pagos se eliminan en cascada y el `audit_log` conserva un resumen suficiente para identificar lo eliminado.
7. “Marcar como pagado” crea un pago real por el pendiente; no altera un estado artificial.

## Limitaciones verificables en esta entrega

Sin un proyecto Supabase real no es posible ejecutar aquí las pruebas de concurrencia de PostgreSQL, comprobar el job `pg_cron` en una instancia gestionada ni hacer una prueba de integración contra la API Data. La migración y el smoke test quedan preparados para realizar esas comprobaciones al enlazar un proyecto real.
