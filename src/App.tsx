import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useApp } from './lib/AppContext';
import { Spinner } from './components/ui';
import { ConfigPage } from './pages/ConfigPage';
import { UserGatePage } from './pages/UserGatePage';
import { UsersPage } from './pages/UsersPage';
import { HomePage } from './pages/HomePage';
import { ExpensesPage } from './pages/ExpensesPage';
import { NewExpensePage } from './pages/NewExpensePage';
import { ExpenseDetailPage } from './pages/ExpenseDetailPage';
import { PaidExpensesPage } from './pages/PaidExpensesPage';
import { HistoryPage } from './pages/HistoryPage';
import { MorePage } from './pages/MorePage';
import { RecurrencesPage } from './pages/RecurrencesPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const { config, loadingUsers, activeUsers, currentUser } = useApp();
  if (!config) return <ConfigPage />;
  if (loadingUsers) return <div className="grid min-h-screen place-items-center bg-slate-50"><Spinner className="h-7 w-7" /></div>;
  if (activeUsers.length === 0) return <UsersPage />;
  if (!currentUser) return <UserGatePage />;

  return <Routes>
    <Route element={<AppShell />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/expenses" element={<ExpensesPage />} />
      <Route path="/expenses/new" element={<NewExpensePage />} />
      <Route path="/expenses/:id" element={<ExpenseDetailPage />} />
      <Route path="/paid" element={<PaidExpensesPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="/recurrences" element={<RecurrencesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/more" element={<MorePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>;
}
