import { Link } from 'react-router-dom';
import { ChevronRight, History, Repeat2, Settings, Users, BadgeEuro } from 'lucide-react';
import { Card, PageTitle } from '../components/ui';

export function MorePage() {
  const items = [
    { to: '/paid', title: 'Gastos pagados', description: 'Consulta gastos completamente pagados.', icon: BadgeEuro },
    { to: '/history', title: 'Historial', description: 'Actividad y operaciones recientes.', icon: History },
    { to: '/recurrences', title: 'Recurrencias', description: 'Consulta y desactiva recurrencias activas.', icon: Repeat2 },
    { to: '/users', title: 'Usuarios', description: 'Altas y desactivaciones sin borrar historia.', icon: Users },
    { to: '/settings', title: 'Configuración', description: 'Conexión local con Supabase.', icon: Settings }
  ];
  return <div className="space-y-6"><PageTitle title="Más" subtitle="Gestión y configuración de la instalación." /><div className="grid gap-3">{items.map(({ to, title, description, icon: Icon }) => <Link key={to} to={to}><Card className="flex items-center gap-4 p-4 transition hover:shadow-lg"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700"><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="font-bold text-slate-900">{title}</div><div className="mt-1 text-sm text-slate-500">{description}</div></div><ChevronRight className="h-5 w-5 text-slate-300" /></Card></Link>)}</div></div>;
}
