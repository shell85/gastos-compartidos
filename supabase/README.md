# Supabase local y pruebas

Este directorio contiene la configuración local, migraciones, seed y tests de base de datos.

## Arrancar

```bash
npm install
npx supabase start
```

Supabase local necesita un runtime compatible con Docker.

## Reset reproducible

```bash
npx supabase db reset
```

Esto elimina el estado local, reaplica todas las migraciones y vuelve a ejecutar `supabase/seed.sql`.

## pgTAP

```bash
npx supabase test db
```

Los tests de `supabase/tests/` cubren estructura, integridad, reparto, pagos, saldos, recurrencias, RLS y superficie RPC. Cada archivo se ejecuta de forma aislada por la CLI.

## Concurrencia real

Después de `supabase start`, ejecuta:

```bash
npm run test:db:concurrency
```

El script descubre `API_URL` y `ANON_KEY` mediante `supabase status -o env` y usa dos clientes Supabase independientes. Esto prueba la serialización real de PostgreSQL a través del API local, no una simulación en memoria.

## Lint

```bash
npx supabase db lint
```

## Migración

La migración crea las tablas, constraints, índices, funciones RPC, vistas, RLS y el job diario de `pg_cron`.
