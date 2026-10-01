# Matriz de pruebas

| Especificación | Cobertura | Nivel |
|---|---|---|
| Gasto compartido pagado por una persona | `002_financial_rules.sql` | PostgreSQL/RPC |
| Gasto individual pagado por otra persona | `002_financial_rules.sql` | PostgreSQL/RPC |
| Combinación de gastos y saldos | `002_financial_rules.sql` | PostgreSQL/view |
| Pagos parciales | `002_financial_rules.sql` | PostgreSQL/RPC |
| Intento de superar importe | `002_financial_rules.sql` | PostgreSQL/RPC |
| Dos pagos simultáneos | `scripts/test-supabase-concurrency.mjs` | API + PostgreSQL |
| Eliminar gasto con pagos | `002_financial_rules.sql`, `005_integrity.sql` | PostgreSQL/RPC |
| Modificar pago | `002_financial_rules.sql` | PostgreSQL/RPC |
| Eliminar pago | `002_financial_rules.sql` | PostgreSQL/RPC |
| Gasto futuro fuera del saldo | `002_financial_rules.sql` | PostgreSQL/view |
| Recurrencia semanal | `003_recurrences.sql` | PostgreSQL |
| Recurrencia mensual | `003_recurrences.sql` | PostgreSQL |
| Recurrencia trimestral | `003_recurrences.sql` | PostgreSQL |
| Recurrencia semestral | `003_recurrences.sql` | PostgreSQL |
| Recurrencia anual | `003_recurrences.sql` | PostgreSQL |
| Fecha final inclusiva | `003_recurrences.sql` | PostgreSQL |
| Cron ejecutado varias veces | `003_recurrences.sql` | PostgreSQL |
| Recuperación tras fallo del Cron | `003_recurrences.sql` | PostgreSQL |
| Usuario desactivado | `003_recurrences.sql`, `005_integrity.sql` | PostgreSQL/RPC |
| Reparto de importe no divisible | `002_financial_rules.sql` | PostgreSQL |
| Gasto con pagos iniciales | `002_financial_rules.sql` | PostgreSQL/RPC |
| Dos `mark as paid` simultáneos | `scripts/test-supabase-concurrency.mjs` | API + PostgreSQL |

Además, `001_schema.sql` comprueba estructura/RLS/funciones y `004_rls.sql` comprueba que el navegador no dispone de una superficie de escritura directa sobre las tablas.

## Corrección verificada del test financiero

El saldo tras Supermercado (Juan +300 / Pedro -300) y Taxi (Juan +200 asignado, Pedro paga 200) debe ser Juan +100 / Pedro -100, según `balance = total_paid - total_assigned`. El test `002_financial_rules.sql` refleja ahora esa fórmula.
