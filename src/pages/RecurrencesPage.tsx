import { useEffect, useState } from 'react';
import { PauseCircle, PlayCircle, Repeat2 } from 'lucide-react';
import { Button, Card, PageTitle, Spinner } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { getRecurrences, toggleRecurrence } from '../services/data';
import { friendlyError } from '../lib/errors';
import { formatDate } from '../lib/dates';
import { formatEuro } from '../lib/money';
import type { RecurringExpenseRow } from '../types/database';

const labels: Record<string, string> = { weekly: 'Semanal', monthly: 'Mensual', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual' };

export function RecurrencesPage() {
  const { client, currentUser, users } = useApp();
  const [rows, setRows] = useState<(RecurringExpenseRow & { participants: { user_id: string }[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function load() { if (!client) return; setLoading(true); try { setRows(await getRecurrences(client)); } catch (e) { setError(friendlyError(e)); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [client]);
  async function toggle(id: string, active: boolean) { if (!client) return; try { await toggleRecurrence(client, id, active, currentUser?.id ?? null); await load(); } catch (e) { setError(friendlyError(e)); } }
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? 'Usuario inactivo';
  return <div className="space-y-6"><PageTitle title="Recurrencias" subtitle="Desactivarlas no elimina gastos ya creados." />{error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}{loading ? <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div> : rows.length ? <div className="grid gap-3">{rows.map((row) => <Card key={row.id} className="space-y-4 p-4"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700"><Repeat2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="font-bold">{row.description}</div><div className="mt-1 text-sm text-slate-500">{formatEuro(row.amount)} · {labels[row.frequency]}</div></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.active ? 'Activa' : 'Inactiva'}</span></div><div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2"><div>Desde {formatDate(row.start_date)}</div><div>Hasta {formatDate(row.end_date)}</div></div><div className="flex flex-wrap gap-2">{row.participants.map((p) => <span key={p.user_id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{userName(p.user_id)}</span>)}</div>{row.active ? <Button variant="secondary" onClick={() => void toggle(row.id, false)}><PauseCircle className="h-4 w-4" />Desactivar recurrencia</Button> : <Button variant="secondary" onClick={() => void toggle(row.id, true)}><PlayCircle className="h-4 w-4" />Activar recurrencia</Button>}</Card>)}</div> : <Card className="py-10 text-center"><div className="text-sm font-semibold text-slate-600">No hay recurrencias configuradas.</div></Card>}</div>;
}
