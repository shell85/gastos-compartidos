import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function localEnv() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY };
  }

  const output = execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['--no-install', 'supabase', 'status', '-o', 'env'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
  const values = Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
  const url = values.API_URL;
  const key = values.ANON_KEY;
  if (!url || !key) throw new Error('No se pudo obtener API_URL/ANON_KEY. Ejecuta `supabase start`.');
  return { url, key };
}

const { url, key } = localEnv();
const a = createClient(url, key);
const b = createClient(url, key);
const suffix = crypto.randomUUID();

async function mustRpc(client, fn, args) {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
}

async function query(client, table, columns = '*') {
  const { data, error } = await client.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

const payer1 = await mustRpc(a, 'create_user', { p_name: `Concurrent A ${suffix}` });
const payer2 = await mustRpc(a, 'create_user', { p_name: `Concurrent B ${suffix}` });
const expense = await mustRpc(a, 'create_expense', {
  p_description: `Concurrent payment ${suffix}`,
  p_amount: '600.00',
  p_expense_date: '2026-09-01',
  p_participants: [payer1],
  p_initial_payments: [],
  p_recurrence: null,
  p_created_by: payer1,
});

const results = await Promise.all([
  a.rpc('create_payment', {
    p_expense_id: expense,
    p_user_id: payer1,
    p_amount: '400.00',
    p_created_by: payer1,
  }),
  b.rpc('create_payment', {
    p_expense_id: expense,
    p_user_id: payer2,
    p_amount: '300.00',
    p_created_by: payer2,
  }),
]);

const successes = results.filter((r) => !r.error);
const failures = results.filter((r) => r.error);
if (successes.length !== 1 || failures.length !== 1) {
  throw new Error(`Concurrencia create_payment inválida: ${JSON.stringify(results)}`);
}

const paymentsResult = await a.from('payments').select('id, amount').eq('expense_id', expense);
if (paymentsResult.error) throw new Error(`payments: ${paymentsResult.error.message}`);
const payments = paymentsResult.data ?? [];
const paymentSum = payments.reduce((sum, p) => sum + Number(p.amount), 0);
if (Math.abs(paymentSum - 400) > 0.001 && Math.abs(paymentSum - 300) > 0.001) {
  throw new Error(`Sobrepago detectado en create_payment: ${paymentSum}`);
}

const expense2 = await mustRpc(a, 'create_expense', {
  p_description: `Concurrent remaining ${suffix}`,
  p_amount: '600.00',
  p_expense_date: '2026-09-02',
  p_participants: [payer1],
  p_initial_payments: [],
  p_recurrence: null,
  p_created_by: payer1,
});

const remaining = await Promise.all([
  a.rpc('pay_remaining_amount', { p_expense_id: expense2, p_user_id: payer1, p_actor_user_id: payer1 }),
  b.rpc('pay_remaining_amount', { p_expense_id: expense2, p_user_id: payer2, p_actor_user_id: payer2 }),
]);
const remainingSuccesses = remaining.filter((r) => !r.error);
const remainingFailures = remaining.filter((r) => r.error);
if (remainingSuccesses.length !== 1 || remainingFailures.length !== 1) {
  throw new Error(`Concurrencia pay_remaining inválida: ${JSON.stringify(remaining)}`);
}
const secondPayments = (await a.from('payments').select('amount').eq('expense_id', expense2)).data ?? [];
const secondSum = secondPayments.reduce((sum, p) => sum + Number(p.amount), 0);
if (Math.abs(secondSum - 600) > 0.001 || secondPayments.length !== 1) {
  throw new Error(`pay_remaining no fue atómico: sum=${secondSum}, rows=${secondPayments.length}`);
}

await mustRpc(a, 'delete_expense', { p_expense_id: expense, p_actor_user_id: payer1 });
await mustRpc(a, 'delete_expense', { p_expense_id: expense2, p_actor_user_id: payer1 });
await mustRpc(a, 'deactivate_user', { p_user_id: payer1, p_actor_user_id: payer2 });
await mustRpc(a, 'deactivate_user', { p_user_id: payer2, p_actor_user_id: null });

console.log('PASS: RPC concurrency tests: create_payment y pay_remaining_amount nunca permiten sobrepago.');
