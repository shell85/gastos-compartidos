import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, PageTitle, Spinner } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { getPaidExpenses } from '../services/data';
import { formatDate } from '../lib/dates';
import { formatEuro } from '../lib/money';
import type { ExpenseSummaryRow } from '../types/database';
import { friendlyError } from '../lib/errors';

export function PaidExpensesPage() {
  const { client } = useApp();
  const [expenses, setExpenses] = useState<ExpenseSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!client) return;
    getPaidExpenses(client).then(setExpenses).catch((e) => setError(friendlyError(e))).finally(() => setLoading(false));
  }, [client]);
  return <div className="space-y-6"><PageTitle title="Gastos pagados" subtitle="Consulta el detalle, participantes y pagos." />{error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}{loading ? <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div> : expenses.length ? <div className="grid gap-3">{expenses.map((expense) => <Link key={expense.id} to={`/expenses/${expense.id}`}><Card className="flex items-center gap-4 p-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="truncate font-bold">{expense.description}</div><div className="mt-1 text-xs text-slate-500">{formatDate(expense.expense_date)}</div></div><div className="text-right font-bold">{formatEuro(expense.amount)}</div><ChevronRight className="h-5 w-5 text-slate-300" /></Card></Link>)}</div> : <EmptyState title="Aún no hay gastos pagados" description="Los gastos totalmente pagados aparecerán aquí." />}</div>;
}
