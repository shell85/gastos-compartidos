import { useState } from 'react';
import { Database, Eye, EyeOff, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Field, PageTitle, TextInput } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { setStoredConfig } from '../lib/config';

export function SettingsPage() {
  const { config, disconnect, connect } = useApp();
  const navigate = useNavigate();
  const [showKey, setShowKey] = useState(false);
  const [url, setUrl] = useState(config?.url ?? '');
  const [key, setKey] = useState(config?.key ?? '');
  return <div className="space-y-6"><PageTitle title="Configuración" subtitle="La conexión se guarda localmente en este navegador." /><Card className="space-y-5"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700"><Database className="h-5 w-5" /></div><div><div className="font-bold">Proyecto Supabase</div><div className="text-xs text-slate-500">No introduzcas nunca una service-role key.</div></div></div><Field label="URL"><TextInput value={url} onChange={(e) => setUrl(e.target.value)} /></Field><Field label="Clave publishable/anon"><div className="flex gap-2"><TextInput type={showKey ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)} /><button type="button" onClick={() => setShowKey((value) => !value)} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">{showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></Field><Button className="w-full" onClick={() => { setStoredConfig({ url: url.trim(), key: key.trim() }); connect({ url: url.trim(), key: key.trim() }); navigate('/'); }}>Guardar conexión</Button></Card><Card className="space-y-3"><h2 className="font-bold">Cambiar instalación</h2><p className="text-sm leading-6 text-slate-500">Borra la configuración local y vuelve a la pantalla de conexión. No borra nada de Supabase.</p><Button variant="danger" onClick={() => { disconnect(); navigate('/'); }}><LogOut className="h-4 w-4" />Borrar configuración local</Button></Card></div>;
}
