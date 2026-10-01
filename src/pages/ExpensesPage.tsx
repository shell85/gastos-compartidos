import { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, PageTitle, Spinner } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { getPendingExpenses, getPendingExpensesCount } from '../services/data';
import { friendlyError } from '../lib/errors';
import { todayLocal } from '../lib/dates';
import { formatDate } from '../lib/dates';
import { formatEuro } from '../lib/money';
import type { ExpenseSummaryRow } from '../types/database';
import type { Db } from '../services/data';

const PAGE_SIZE = 20;

export function ExpensesPage() {
  const { client } = useApp();
  const [expenses, setExpenses] = useState<ExpenseSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    if (!client) return;
    setLoading(true);
    setError(null);
    setPage(1);
    setExpenses([]);
    getPendingExpensesCount(client, todayLocal()).then(setTotalCount).catch(() => setTotalCount(null));
    loadPage(client, todayLocal(), 1).then(setExpenses).catch((e) => setError(friendlyError(e))).finally(() => setLoading(false));
  }, [client]);

  async function loadPage(cl: Db, today: string, pageNum: number) {
    const data = await getPendingExpenses(cl, today, pageNum, PAGE_SIZE);
    return data;
  }

  async function handleLoadMore() {
    if (!client || !totalCount) return;
    const nextPage = page + 1;
    if (expenses.length >= totalCount) return;
    setLoadingMore(true);
    try {
      const data = await getPendingExpenses(client, todayLocal(), nextPage, PAGE_SIZE);
      setExpenses((prev) => [...prev, ...data]);
      setPage(nextPage);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = totalCount !== null && expenses.length < totalCount;

  return (
    <div className="space-y-6">
      <PageTitle title="Gastos pendientes" subtitle="Todos los usuarios pueden ver todos los gastos pendientes." />
      {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
      {loading ? (
        <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
      ) : expenses.length ? (
        <>
          <div className="grid gap-3">
            {expenses.map((expense) => <ExpenseListCard key={expense.id} expense={expense} />)}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMore ? <Spinner className="h-4 w-4" /> : null}
                Cargar más ({totalCount! - expenses.length} restantes)
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState title="Todo al día" description="No hay gastos con importe pendiente y fecha hasta hoy." />
      )}
    </div>
  );
}

function ExpenseListCard({ expense }: { expense: ExpenseSummaryRow }) {
  return (
    <Link to={`/expenses/${expense.id}`}>
      <Card className="flex items-center gap-4 p-4 transition hover:shadow-lg">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold text-slate-900">{expense.description}</div>
          <div className="mt-1 text-xs text-slate-500">{formatDate(expense.expense_date)} · Pagado {formatEuro(expense.paid_total)}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold">{formatEuro(expense.pending_total)}</div>
          <div className="text-xs font-semibold text-slate-400">pendiente</div>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-300" />
      </Card>
    </Link>
  );
}
