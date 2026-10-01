import { useState, type ReactNode } from 'react';
import { CheckCircle2, Database, ShieldCheck, Wifi } from 'lucide-react';
import { Button, Card, Field, PageTitle, TextInput } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { friendlyError } from '../lib/errors';

export function ConfigPage() {
  const { connect } = useApp();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleConnect() {
    setMessage(null);
    if (!/^https:\/\/[^\s]+$/.test(url.trim())) {
      setMessage('Introduce una URL de Supabase válida.');
      return;
    }
    if (!key.trim()) {
      setMessage('Introduce la clave publishable/anon.');
      return;
    }
    setSaving(true);
    try {
      const { createConfiguredClient } = await import('../lib/supabase');
      const candidate = createConfiguredClient({ url: url.trim(), key: key.trim() });
      const probe = await candidate.rpc('health_check');
      if (probe.error) throw probe.error;
      connect({ url: url.trim(), key: key.trim() });
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setSaving(false);
    }
  }

  return <div className="mx-auto max-w-lg space-y-7 pt-6 sm:pt-10">
    <div className="grid h-16 w-16 place-items-center rounded-3xl bg-slate-900 text-white shadow-xl"><Database className="h-8 w-8" /></div>
    <PageTitle title="Conecta tu Supabase" subtitle="Esta instalación guarda la URL y la clave en este navegador. Nunca solicita una service-role key." />
    <Card className="space-y-5">
      <Field label="URL de Supabase"><TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://tu-proyecto.supabase.co" inputMode="url" autoCapitalize="none" /></Field>
      <Field label="Clave publishable/anon" hint="Usa únicamente la clave pública del proyecto. La app no necesita autenticación de Supabase."><TextInput type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sb_publishable_…" autoCapitalize="none" /></Field>
      <Button className="w-full" disabled={saving} onClick={handleConnect}>{saving ? 'Comprobando conexión…' : 'Conectar'}</Button>
      {message ? <div className="rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700">{message}</div> : null}
    </Card>
    <div className="grid gap-3 sm:grid-cols-3">
      <Trust title="Sin backend propio" icon={<Wifi className="h-5 w-5" />} />
      <Trust title="RLS + RPC" icon={<ShieldCheck className="h-5 w-5" />} />
      <Trust title="Sólo online" icon={<CheckCircle2 className="h-5 w-5" />} />
    </div>
  </div>;
}

function Trust({ title, icon }: { title: string; icon: ReactNode }) {
  return <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100"><div className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700">{icon}</div><div className="mt-2 text-xs font-semibold text-slate-600">{title}</div></div>;
}
