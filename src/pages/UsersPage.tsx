import { useMemo, useState } from 'react';
import { UserPlus, UserRound, UserRoundX } from 'lucide-react';
import { Button, Card, Field, Modal, PageTitle, TextInput } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { createUser, deactivateUser } from '../services/data';
import { friendlyError } from '../lib/errors';
import { useNavigate } from 'react-router-dom';

export function UsersPage() {
  const { client, users, currentUser, activeUsers, refreshUsers, setCurrentUserId } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const inactive = useMemo(() => users.filter((u) => !u.active), [users]);

  async function handleCreate() {
    if (!client) return;
    setError(null);
    setSaving(true);
    try {
      const id = await createUser(client, name, currentUser?.id ?? null);
      await refreshUsers();
      setCurrentUserId(id);
      setName('');
      setOpen(false);
      navigate('/');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!client) return;
    setError(null);
    setDeactivating(id);
    try {
      await deactivateUser(client, id, currentUser?.id ?? null);
      if (currentUser?.id === id) setCurrentUserId('');
      await refreshUsers();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setDeactivating(null);
    }
  }

  return <div className="space-y-6">
    <PageTitle title="Usuarios" subtitle="Los usuarios inactivos se conservan para el historial." action={<Button onClick={() => setOpen(true)}><UserPlus className="h-4 w-4" />Añadir</Button>} />
    {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div> : null}
    <div className="grid gap-3">{activeUsers.map((user) => <Card key={user.id} className="flex items-center justify-between gap-4 p-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700"><UserRound className="h-5 w-5" /></div><div><div className="font-semibold text-slate-900">{user.name}</div><div className="text-xs text-emerald-600">Activo</div></div></div><Button variant="ghost" className="px-3" onClick={() => window.confirm(`¿Desactivar a ${user.name}?` ) && void handleDeactivate(user.id)} disabled={deactivating === user.id}><UserRoundX className="h-4 w-4" />Desactivar</Button></Card>)}</div>
    {inactive.length ? <div className="space-y-3"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Inactivos</h2>{inactive.map((user) => <Card key={user.id} className="flex items-center gap-3 p-4 opacity-70"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-500"><UserRound className="h-5 w-5" /></div><div><div className="font-semibold">{user.name}</div><div className="text-xs text-slate-500">Conservado en el historial</div></div></Card>)}</div> : null}
    {open ? <Modal title="Nuevo usuario" onClose={() => setOpen(false)}><div className="space-y-4"><Field label="Nombre"><TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={80} /></Field><Button className="w-full" disabled={saving || !name.trim()} onClick={() => void handleCreate()}>{saving ? 'Creando…' : 'Crear usuario'}</Button></div></Modal> : null}
  </div>;
}
