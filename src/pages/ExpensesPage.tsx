import { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, PageTitle, Spinner } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { getPendingExpenses } from '../services/data';
import { friendlyError } from '../lib/errors';
import { todayLocal } from '../lib/dates';
import { formatDate } from '../lib/dates';
import { formatEuro } from '../lib/money';
import type { ExpenseSummaryRow } from '../types/database';

export function ExpensesPage() {
  const { client } = useApp();
  const [expenses, setExpenses] = useState<ExpenseSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!client) return;
    setLoading(true);
    getPendingExpenses(client, todayLocal()).then(setExpenses).catch((e) => setError(friendlyError(e))).finally(() => setLoading(false));
  }, [client]);
  return <div className="space-y-6"><PageTitle title="Gastos pendientes" subtitle="Todos los usuarios pueden ver todos los gastos pendientes." />{error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}{loading ? <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div> : expenses.length ? <div className="grid gap-3">{expenses.map((expense) => <ExpenseListCard key={expense.id} expense={expense} />)}</div> : <EmptyState title="Todo al día" description="No hay gastos con importe pendiente y fecha hasta hoy." />}</div>;
}

function ExpenseListCard({ expense }: { expense: ExpenseSummaryRow }) {
  return <Link to={`/expenses/${expense.id}`}><Card className="flex items-center gap-4 p-4 transition hover:shadow-lg"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600"><CalendarDays className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="truncate font-bold text-slate-900">{expense.description}</div><div className="mt-1 text-xs text-slate-500">{formatDate(expense.expense_date)} · Pagado {formatEuro(expense.paid_total)}</div></div><div className="text-right"><div className="text-sm font-bold">{formatEuro(expense.pending_total)}</div><div className="text-xs font-semibold text-slate-400">pendiente</div></div><ChevronRight className="h-5 w-5 text-slate-300" /></Card></Link>;
}
