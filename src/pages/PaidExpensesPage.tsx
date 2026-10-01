import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, PageTitle, Spinner } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { getPaidExpenses, getPaidExpensesCount } from '../services/data';
import { formatDate } from '../lib/dates';
import { formatEuro } from '../lib/money';
import type { ExpenseSummaryRow } from '../types/database';
import type { Db } from '../services/data';
import { friendlyError } from '../lib/errors';

const PAGE_SIZE = 20;

export function PaidExpensesPage() {
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
    getPaidExpensesCount(client).then(setTotalCount).catch(() => setTotalCount(null));
    loadPage(client, 1).then(setExpenses).catch((e) => setError(friendlyError(e))).finally(() => setLoading(false));
  }, [client]);

  async function loadPage(cl: Db, pageNum: number) {
    const data = await getPaidExpenses(cl, pageNum, PAGE_SIZE);
    return data;
  }

  async function handleLoadMore() {
    if (!client || !totalCount) return;
    const nextPage = page + 1;
    if (expenses.length >= totalCount) return;
    setLoadingMore(true);
    try {
      const data = await getPaidExpenses(client, nextPage, PAGE_SIZE);
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
      <PageTitle title="Gastos pagados" subtitle="Consulta el detalle, participantes y pagos." />
      {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
      {loading ? (
        <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
      ) : expenses.length ? (
        <>
          <div className="grid gap-3">
            {expenses.map((expense) => (
              <Link key={expense.id} to={`/expenses/${expense.id}`}>
                <Card className="flex items-center gap-4 p-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{expense.description}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatDate(expense.expense_date)}</div>
                  </div>
                  <div className="text-right font-bold">{formatEuro(expense.amount)}</div>
                  <ChevronRight className="h-5 w-5 text-slate-300" />
                </Card>
              </Link>
            ))}
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
        <EmptyState title="Aún no hay gastos pagados" description="Los gastos totalmente pagados aparecerán aquí." />
      )}
    </div>
  );
}
