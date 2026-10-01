import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, CreditCard, Pencil, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Field, Modal, PageTitle, Select, Spinner, TextInput } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { deleteExpense, deletePayment, getExpense, getExpenseParticipants, getPayments, payRemaining, createPayment, updatePayment } from '../services/data';
import { formatEuro, isValidMoneyInput, normalizeMoneyForRpc } from '../lib/money';
import { formatDate, formatDateTime } from '../lib/dates';
import { friendlyError } from '../lib/errors';
import type { ExpenseParticipantRow, ExpenseSummaryRow, PaymentRow, UserRow } from '../types/database';

export function ExpenseDetailPage() {
  const { id } = useParams();
  const { client, users, activeUsers, currentUser } = useApp();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<ExpenseSummaryRow | null>(null);
  const [participants, setParticipants] = useState<ExpenseParticipantRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paidModal, setPaidModal] = useState(false);
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [paymentUserId, setPaymentUserId] = useState(currentUser?.id ?? activeUsers[0]?.id ?? '');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!client || !id) return;
    setLoading(true);
    try {
      const [e, p, pays] = await Promise.all([getExpense(client, id), getExpenseParticipants(client, id), getPayments(client, id)]);
      setExpense(e); setParticipants(p); setPayments(pays);
    } catch (e) { setError(friendlyError(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [client, id]);

  const userName = (userId: string) => users.find((u) => u.id === userId)?.name ?? 'Usuario inactivo';
  const pending = expense ? Number(expense.pending_total) : 0;

  async function savePayment() {
    if (!client || !id) return;
    if (!paymentUserId || !isValidMoneyInput(paymentAmount)) return setError('Introduce usuario e importe válidos.');
    setBusy(true); setError(null);
    try {
      await createPayment(client, id, paymentUserId, normalizeMoneyForRpc(paymentAmount), currentUser?.id ?? null);
      setPaymentModal(false); setPaymentAmount(''); await load();
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }

  async function markPaid() {
    if (!client || !id || !paymentUserId) return;
    setBusy(true); setError(null);
    try { await payRemaining(client, id, paymentUserId, currentUser?.id ?? null); setPaidModal(false); await load(); }
    catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }

  async function saveEdit() {
    if (!client || !editing || !isValidMoneyInput(paymentAmount)) return setError('Introduce un importe válido.');
    setBusy(true); setError(null);
    try { await updatePayment(client, editing.id, normalizeMoneyForRpc(paymentAmount), currentUser?.id ?? null); setEditing(null); setPaymentAmount(''); await load(); }
    catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }

  async function removePayment(payment: PaymentRow) {
    if (!client) return;
    if (!window.confirm(`¿Eliminar el pago de ${formatEuro(payment.amount)} de ${userName(payment.user_id)}?`)) return;
    setBusy(true); setError(null);
    try { await deletePayment(client, payment.id, currentUser?.id ?? null); await load(); }
    catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }

  async function removeExpense() {
    if (!client || !id || !expense) return;
    if (!window.confirm(`¿Eliminar "${expense.description}"? Esta operación eliminará también sus pagos y participantes. No se puede deshacer.`)) return;
    setBusy(true); setError(null);
    try { await deleteExpense(client, id, currentUser?.id ?? null); navigate('/'); }
    catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }

  if (loading) return <div className="grid min-h-[50vh] place-items-center"><Spinner className="h-7 w-7" /></div>;
  if (!expense) return <div className="space-y-4"><button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft className="h-4 w-4" />Volver</button><Card>Gasto no disponible.</Card></div>;
  return <div className="space-y-6">
    <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Volver</button>
    <PageTitle title={expense.description} subtitle={formatDate(expense.expense_date)} />
    {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div> : null}
    <Card className="space-y-4"><div className="grid grid-cols-3 gap-3"><Metric label="Total" value={formatEuro(expense.amount)} /><Metric label="Pagado" value={formatEuro(expense.paid_total)} /><Metric label="Pendiente" value={formatEuro(expense.pending_total)} emphasis={pending > 0} /></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, Number(expense.paid_total) / Number(expense.amount) * 100)}%` }} /></div></Card>
    <Card><h2 className="text-sm font-bold">Corresponde a</h2><div className="mt-4 divide-y divide-slate-100">{participants.map((p) => <div key={p.user_id} className="flex items-center justify-between py-3"><span className="font-medium">{userName(p.user_id)}</span><span className="font-bold">{formatEuro(p.assigned_amount)}</span></div>)}</div></Card>
    <Card><div className="flex items-center justify-between gap-4"><h2 className="text-sm font-bold">Pagos</h2><Button onClick={() => { setPaymentUserId(currentUser?.id ?? activeUsers[0]?.id ?? ''); setPaymentModal(true); }} disabled={pending <= 0}><CreditCard className="h-4 w-4" />Registrar pago</Button></div>{payments.length ? <div className="mt-4 divide-y divide-slate-100">{payments.map((payment) => <div key={payment.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><div className="font-semibold">{userName(payment.user_id)}</div><div className="text-xs text-slate-400">{formatDateTime(payment.paid_at)}</div></div><div className="font-bold">{formatEuro(payment.amount)}</div><button onClick={() => { setEditing(payment); setPaymentAmount(payment.amount); }} className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900" aria-label="Editar pago"><Pencil className="h-4 w-4" /></button><button onClick={() => void removePayment(payment)} className="grid h-10 w-10 place-items-center rounded-xl text-rose-400 hover:bg-rose-50 hover:text-rose-700" aria-label="Eliminar pago"><Trash2 className="h-4 w-4" /></button></div>)}</div> : <div className="py-7 text-center text-sm text-slate-400">Todavía no hay pagos.</div>}</Card>
    <div className="grid gap-3 sm:grid-cols-2"><Button onClick={() => setPaidModal(true)} disabled={pending <= 0}><CheckCircle2 className="h-4 w-4" />Marcar como pagado</Button><Button variant="danger" onClick={() => void removeExpense()} disabled={busy}><Trash2 className="h-4 w-4" />Eliminar gasto</Button></div>

    {paymentModal ? <Modal title="Registrar pago" onClose={() => setPaymentModal(false)}><div className="space-y-4"><Field label="Quién paga"><Select value={paymentUserId} onChange={(e) => setPaymentUserId(e.target.value)}>{activeUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field><Field label="Importe" hint={`Máximo pendiente: ${formatEuro(expense.pending_total)}`}><TextInput value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} inputMode="decimal" placeholder="0,00" autoFocus /></Field><Button className="w-full" disabled={busy} onClick={() => void savePayment()}>{busy ? 'Guardando…' : 'Registrar pago'}</Button></div></Modal> : null}
    {paidModal ? <Modal title="Marcar como pagado" onClose={() => setPaidModal(false)}><div className="space-y-4"><p className="text-sm leading-6 text-slate-600">Se creará un pago real por el importe pendiente. Importe: <strong>{formatEuro(expense.pending_total)}</strong>.</p><Field label="Quién realizará el pago restante"><Select value={paymentUserId} onChange={(e) => setPaymentUserId(e.target.value)}>{activeUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field><Button className="w-full" disabled={busy} onClick={() => void markPaid()}>{busy ? 'Guardando…' : 'Confirmar'}</Button></div></Modal> : null}
    {editing ? <Modal title="Modificar pago" onClose={() => setEditing(null)}><div className="space-y-4"><div className="rounded-2xl bg-slate-50 p-4 text-sm">{userName(editing.user_id)} · importe actual {formatEuro(editing.amount)}</div><Field label="Nuevo importe"><TextInput value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} inputMode="decimal" autoFocus /></Field><Button className="w-full" disabled={busy} onClick={() => void saveEdit()}>{busy ? 'Guardando…' : 'Guardar cambios'}</Button></div></Modal> : null}
  </div>;
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) { return <div><div className="text-xs font-semibold text-slate-400">{label}</div><div className={`mt-1 text-lg font-extrabold ${emphasis ? 'text-amber-600' : 'text-slate-950'}`}>{value}</div></div>; }
