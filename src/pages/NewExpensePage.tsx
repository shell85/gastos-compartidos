import { useMemo, useState } from 'react';
import { ArrowLeft, Check, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Field, PageTitle, Select, TextInput } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { createExpense } from '../services/data';
import { friendlyError } from '../lib/errors';
import { formatEuro, isValidMoneyInput, normalizeMoneyForRpc } from '../lib/money';
import { splitEqual } from '../lib/repartition';
import { todayLocal } from '../lib/dates';
import type { Frequency, UserRow } from '../types/database';

interface InitialPayment { userId: string; amount: string }

const frequencies: Array<{ value: Frequency; label: string }> = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' }
];

export function NewExpensePage() {
  const { client, currentUser, activeUsers } = useApp();
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayLocal());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<Frequency | ''>('');
  const [endDate, setEndDate] = useState('');
  const [payments, setPayments] = useState<InitialPayment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const split = useMemo(() => isValidMoneyInput(amount) ? splitEqual(amount, selectedIds) : [], [amount, selectedIds]);
  const totalInitial = useMemo(() => payments.reduce((sum, item) => sum + Number(item.amount.replace(',', '.') || 0), 0), [payments]);

  function toggleParticipant(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]);
    setPayments((prev) => prev.filter((payment) => payment.userId !== id));
  }

  function setPayment(userId: string, value: string) {
    setPayments((prev) => {
      const without = prev.filter((item) => item.userId !== userId);
      return value.trim() ? [...without, { userId, amount: value }] : without;
    });
  }

  async function handleSubmit() {
    if (!client) return;
    setError(null);
    if (!description.trim()) return setError('Introduce una descripción.');
    if (!isValidMoneyInput(amount)) return setError('Introduce un importe válido.');
    if (!selectedIds.length) return setError('Selecciona al menos un usuario.');
    if (frequency && !endDate) return setError('Introduce la fecha límite de la recurrencia.');
    if (frequency && endDate < expenseDate) return setError('La fecha límite debe ser igual o posterior a la fecha del gasto.');
    if (payments.some((payment) => !/^\d+(?:[.,]\d{0,2})?$/.test(payment.amount) || Number(payment.amount.replace(',', '.')) < 0)) return setError('Revisa los pagos iniciales.');
    if (totalInitial - Number(amount.replace(',', '.')) > 0.0001) return setError('Los pagos iniciales superan el importe total.');
    setSaving(true);
    try {
      await createExpense(client, {
        description: description.trim(),
        amount: normalizeMoneyForRpc(amount),
        expenseDate,
        participantIds: selectedIds,
        initialPayments: payments.filter((payment) => Number(payment.amount.replace(',', '.')) > 0).map((payment) => ({ user_id: payment.userId, amount: normalizeMoneyForRpc(payment.amount) })),
        recurrence: frequency ? { frequency, end_date: endDate } : null,
        createdBy: currentUser?.id ?? null
      });
      navigate('/');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  return <div className="mx-auto max-w-2xl space-y-6">
    <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Volver</button>
    <PageTitle title="Crear gasto" subtitle="El gasto se crea con sus participantes y pagos iniciales en una sola operación." />
    {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div> : null}
    <Card className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2"><Field label="Descripción"><TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Supermercado" autoFocus /></Field><Field label="Importe"><TextInput value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="600,00" inputMode="decimal" /></Field><Field label="Fecha"><TextInput type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} /></Field></div>
      <section><div className="mb-3 text-sm font-semibold">¿A quién corresponde?</div><div className="grid gap-2 sm:grid-cols-2">{activeUsers.map((user) => <ParticipantCheck key={user.id} user={user} checked={selectedIds.includes(user.id)} onToggle={() => toggleParticipant(user.id)} />)}</div></section>
      {selectedIds.length ? <section className="rounded-3xl bg-slate-50 p-4"><div className="text-sm font-semibold">Reparto automático</div><div className="mt-3 space-y-2">{split.map((line) => <div key={line.userId} className="flex items-center justify-between text-sm"><span className="text-slate-600">{activeUsers.find((u) => u.id === line.userId)?.name ?? line.userId}</span><span className="font-bold">{formatEuro(line.cents)}</span></div>)}</div></section> : null}
      <section className="border-t border-slate-100 pt-5"><Field label="Periodicidad"><Select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency | '')}><option value="">Ninguna</option>{frequencies.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></Field>{frequency ? <div className="mt-4"><Field label="Fecha límite"><TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={expenseDate} /></Field><p className="mt-2 text-xs leading-5 text-slate-500">La fecha límite es inclusiva. Las ocurrencias futuras se generarán por Supabase Cron cuando corresponda.</p></div> : null}</section>
      <section className="border-t border-slate-100 pt-5"><div className="text-sm font-semibold">Pagos iniciales <span className="font-normal text-slate-400">(opcional)</span></div><div className="mt-3 grid gap-3">{selectedIds.map((id) => { const user = activeUsers.find((u) => u.id === id); const value = payments.find((p) => p.userId === id)?.amount ?? ''; return <div key={id} className="flex items-center gap-3"><span className="min-w-24 flex-1 text-sm font-medium">{user?.name}</span><TextInput value={value} onChange={(e) => setPayment(id, e.target.value)} placeholder="0,00" inputMode="decimal" /><button type="button" onClick={() => setPayment(id, '')} className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200" aria-label={`Vaciar pago de ${user?.name}`}><RotateCcw className="h-4 w-4" /></button></div>; })}</div>{selectedIds.length ? <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-sm"><div>Pagado <strong>{formatEuro(totalInitial)}</strong></div><div className="text-right">Pendiente <strong>{formatEuro(Math.max(0, Number(amount.replace(',', '.') || 0) - totalInitial))}</strong></div></div> : null}</section>
      <Button className="w-full" disabled={saving} onClick={() => void handleSubmit()}>{saving ? 'Guardando…' : <><Check className="h-4 w-4" />Crear gasto</>}</Button>
    </Card>
  </div>;
}

function ParticipantCheck({ user, checked, onToggle }: { user: UserRow; checked: boolean; onToggle: () => void }) {
  return <button type="button" onClick={onToggle} className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-left transition ${checked ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}><span className={`grid h-6 w-6 place-items-center rounded-lg border ${checked ? 'border-white bg-white text-slate-900' : 'border-slate-300'}`}>{checked ? <Check className="h-4 w-4" /> : null}</span><span className="font-semibold">{user.name}</span></button>;
}
