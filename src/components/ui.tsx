import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { LoaderCircle, X } from 'lucide-react';

export function Button({
  children,
  className = '',
  variant = 'primary',
  type = 'button',
  disabled = false,
  onClick
}: {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: () => void;
}) {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
    ghost: 'text-slate-600 hover:bg-slate-100'
  } as const;
  return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}>{children}</button>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold text-slate-800">{label}</span>{children}{hint ? <span className="block text-xs leading-5 text-slate-500">{hint}</span> : null}</label>;
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-12 w-full rounded-2xl border-0 bg-white px-4 text-base text-slate-900 shadow-sm ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-slate-400 ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-12 w-full rounded-2xl border-0 bg-white px-4 text-base text-slate-900 shadow-sm ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-slate-400 ${props.className ?? ''}`} />;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 ${className}`}>{children}</section>;
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h1>{subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p> : null}</div>{action}</div>;
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <LoaderCircle className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <Card className="py-10 text-center"><div className="mx-auto max-w-sm"><h2 className="text-base font-bold text-slate-900">{title}</h2>{description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}{action ? <div className="mt-5">{action}</div> : null}</div></Card>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center"><div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold text-slate-950">{title}</h2><button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar"><X className="h-5 w-5" /></button></div><div className="mt-5">{children}</div></div></div>;
}

export function Toast({ message, tone = 'error', onClose }: { message: string; tone?: 'error' | 'success'; onClose: () => void }) {
  return <div className={`fixed bottom-24 left-3 right-3 z-50 rounded-2xl px-4 py-3 shadow-xl sm:left-auto sm:right-6 sm:w-96 ${tone === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}><div className="flex items-start gap-3"><p className="flex-1 text-sm font-medium leading-5">{message}</p><button onClick={onClose} className="rounded-full/ p-1 text-white/80 hover:text-white" aria-label="Cerrar"><X className="h-4 w-4" /></button></div></div>;
}
