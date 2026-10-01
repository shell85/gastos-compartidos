import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { Button, Card, PageTitle, Select } from '../components/ui';
import { useApp } from '../lib/AppContext';

export function UserGatePage() {
  const { activeUsers, setCurrentUserId } = useApp();
  const [id, setId] = useState(activeUsers[0]?.id ?? '');
  return <div className="mx-auto max-w-md space-y-7 pt-12 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-slate-900 text-white shadow-xl"><UserRound className="h-8 w-8" /></div><PageTitle title="¿Quién eres?" subtitle="Selecciona el usuario que está usando esta instalación." /><Card className="space-y-4 text-left"><Select value={id} onChange={(e) => setId(e.target.value)}>{activeUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</Select><Button className="w-full" disabled={!id} onClick={() => setCurrentUserId(id)}>Continuar</Button></Card><p className="text-xs leading-5 text-slate-400">Esta selección se guarda localmente en el navegador. No es un mecanismo de autenticación.</p></div>;
}
