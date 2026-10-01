import { useEffect, useMemo, useState } from 'react';
import { History, UserRound } from 'lucide-react';
import { Card, EmptyState, PageTitle, Spinner } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { getAuditLog, getAuditLogCount } from '../services/data';
import { formatDateTime } from '../lib/dates';
import type { AuditRow } from '../types/database';
import type { Db } from '../services/data';
import { friendlyError } from '../lib/errors';

const PAGE_SIZE = 50;

const actionText: Record<string, string> = {
  CREATE_EXPENSE: 'Creó un gasto',
  DELETE_EXPENSE: 'Eliminó un gasto',
  CREATE_PAYMENT: 'Registró un pago',
  UPDATE_PAYMENT: 'Modificó un pago',
  DELETE_PAYMENT: 'Eliminó un pago',
  MARK_EXPENSE_PAID: 'Marcó un gasto como pagado',
  CREATE_USER: 'Creó un usuario',
  UPDATE_USER: 'Actualizó un elemento',
  DEACTIVATE_USER: 'Desactivó un usuario',
  DEACTIVATE_RECURRENCE: 'Desactivó una recurrencia',
  ACTIVATE_RECURRENCE: 'Activó una recurrencia'
};

export function HistoryPage() {
  const { client, users } = useApp();
  const [items, setItems] = useState<AuditRow[]>([]);
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
    setItems([]);
    getAuditLogCount(client).then(setTotalCount).catch(() => setTotalCount(null));
    loadPage(client, 1).then(setItems).catch((e) => setError(friendlyError(e))).finally(() => setLoading(false));
  }, [client]);

  async function loadPage(cl: Db, pageNum: number) {
    const data = await getAuditLog(cl, pageNum, PAGE_SIZE);
    return data;
  }

  async function handleLoadMore() {
    if (!client || !totalCount) return;
    const nextPage = page + 1;
    if (items.length >= totalCount) return;
    setLoadingMore(true);
    try {
      const data = await getAuditLog(client, nextPage, PAGE_SIZE);
      setItems((prev) => [...prev, ...data]);
      setPage(nextPage);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoadingMore(false);
    }
  }

  const groups = useMemo(() => {
    const map = new Map<string, AuditRow[]>();
    for (const item of items) {
      const key = item.created_at.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [items]);

  function userName(id: string | null) { return users.find((u) => u.id === id)?.name ?? 'Sistema'; }
  const hasMore = totalCount !== null && items.length < totalCount;

  return (
    <div className="space-y-6">
      <PageTitle title="Historial" subtitle="Actividad reciente de la instalación." />
      {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
      {loading ? (
        <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
      ) : groups.length ? (
        <>
          <div className="space-y-6">
            {groups.map(([date, group]) => (
              <section key={date} className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date(`${date}T12:00:00`))}
                </h2>
                {group.map((item) => (
                  <Card key={item.id} className="flex gap-3 p-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                      <History className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-400">
                        {formatDateTime(item.created_at)} · {userName(item.user_id)}
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">{actionText[item.action] ?? item.action}</div>
                      <div className="mt-1 text-sm leading-5 text-slate-500">{item.description ?? ''}</div>
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                        <UserRound className="h-3.5 w-3.5" />{item.entity_type}
                      </div>
                    </div>
                  </Card>
                ))}
              </section>
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
                Cargar más ({totalCount! - items.length} restantes)
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState title="Sin actividad todavía" description="Las operaciones realizadas aparecerán aquí." />
      )}
    </div>
  );
}
