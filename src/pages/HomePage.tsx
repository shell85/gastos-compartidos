import { useEffect, useState } from 'react';
import { ArrowRight, ReceiptText, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, PageTitle, Spinner } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { getBalances, getPendingExpenses } from '../services/data';
import { formatEuro } from '../lib/money';
import { formatDate, todayLocal } from '../lib/dates';
import type { ExpenseSummaryRow, UserBalanceRow } from '../types/database';

export function HomePage() {
  const { client } = useApp();
  const [balances, setBalances] = useState<UserBalanceRow[]>([]);
  const [pending, setPending] = useState<ExpenseSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showSpinner = true) {
    if (!client) return;
    if (showSpinner) setLoading(true); else setRefreshing(true);
    try {
      const [nextBalances, nextPending] = await Promise.all([getBalances(client), getPendingExpenses(client, todayLocal(), 1, 6)]);
      setBalances(nextBalances);
      setPending(nextPending);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => { void load(); }, [client]);

  if (loading) return <div className="grid min-h-[50vh] place-items-center"><Spinner className="h-7 w-7" /></div>;

  return <div className="space-y-7">
    <PageTitle title="Tus saldos" subtitle="Acumulados hasta hoy; los gastos futuros quedan fuera." action={<Button variant="ghost" className="px-3" onClick={() => void load(false)}>{refreshing ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}</Button>} />
    <div className="grid gap-3 sm:grid-cols-2">{balances.map((row) => <BalanceCard key={row.user_id} row={row} />)}</div>
    <div className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Gastos pendientes</h2><Link to="/expenses" className="flex items-center gap-1 text-sm font-semibold text-slate-500">Ver todos <ArrowRight className="h-4 w-4" /></Link></div>{pending.length ? <div className="grid gap-3">{pending.slice(0, 6).map((expense) => <PendingCard key={expense.id} expense={expense} />)}</div> : <EmptyState title="No hay gastos pendientes" description="Cuando haya un importe por pagar aparecerá aquí." />}</div>
  </div>;
}

function BalanceCard({ row }: { row: UserBalanceRow }) {
  const positive = Number(row.balance) > 0;
  const negative = Number(row.balance) < 0;
  return <Card className="p-5"><div className="flex items-center justify-between"><div><div className="text-sm font-semibold text-slate-500">{row.name}</div><div className={`mt-1 text-2xl font-extrabold tracking-tight ${positive ? 'text-emerald-600' : negative ? 'text-rose-600' : 'text-slate-900'}`}>{formatEuro(row.balance)}</div></div><div className={`grid h-11 w-11 place-items-center rounded-2xl ${positive ? 'bg-emerald-50 text-emerald-600' : negative ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}><ReceiptText className="h-5 w-5" /></div></div></Card>;
}

function PendingCard({ expense }: { expense: ExpenseSummaryRow }) {
  return <Link to={`/expenses/${expense.id}`} className="block"><Card className="p-4 transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start justify-between gap-4"><div><div className="font-bold text-slate-900">{expense.description}</div><div className="mt-1 text-xs text-slate-500">{formatDate(expense.expense_date)}</div></div><div className="text-right"><div className="font-bold">{formatEuro(expense.amount)}</div><div className="mt-1 text-xs font-semibold text-amber-600">Pendiente {formatEuro(expense.pending_total)}</div></div></div><div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-slate-900" style={{ width: `${Math.min(100, Math.max(0, Number(expense.paid_total) / Number(expense.amount) * 100))}%` }} /></div></Card></Link>;
}
