import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, ListTodo, MoreHorizontal, Plus, WalletCards } from 'lucide-react';
import { useApp } from '../lib/AppContext';

export function AppShell() {
  const { currentUser, activeUsers, setCurrentUserId } = useApp();
  const location = useLocation();
  const nav = [
    { to: '/', label: 'Inicio', icon: Home },
    { to: '/expenses', label: 'Gastos', icon: ListTodo },
    { to: '/more', label: 'Más', icon: MoreHorizontal }
  ];

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-slate-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white shadow-sm"><WalletCards className="h-5 w-5" /></span><div><div className="text-sm font-extrabold tracking-tight">Gastos</div><div className="text-[11px] font-medium text-slate-500">compartidos</div></div></Link>
        <label className="flex min-w-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200"><span className="text-xs text-slate-400">Usuario</span><select aria-label="Usuario actual" value={currentUser?.id ?? ''} onChange={(e) => setCurrentUserId(e.target.value)} className="max-w-32 bg-transparent text-sm font-semibold outline-none"><option value="" disabled>Selecciona</option>{activeUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      </div>
    </header>

    <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8"><Outlet /></main>

    <Link to="/expenses/new" className="fixed bottom-24 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl shadow-slate-900/20 hover:bg-slate-800" aria-label="Crear gasto"><Plus className="h-6 w-6" /></Link>

    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-5xl grid-cols-3 gap-1">{nav.map(({ to, label, icon: Icon }) => <NavLink key={to} end={to === '/'} to={to} className={({ isActive }) => `flex min-h-12 flex-col items-center justify-center rounded-2xl text-xs font-semibold transition ${isActive ? 'bg-slate-100 text-slate-950' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}><Icon className="h-5 w-5" /><span className="mt-1">{label}</span></NavLink>)}</div>
    </nav>

    {location.pathname === '/more' ? null : null}
  </div>;
}
