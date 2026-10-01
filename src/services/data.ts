import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, AuditRow, ExpenseParticipantRow, ExpenseSummaryRow, PaymentRow, RecurringExpenseParticipantRow, RecurringExpenseRow, UserBalanceRow, UserRow } from '../types/database';

export type Db = SupabaseClient<Database>;

export async function getUsers(client: Db): Promise<UserRow[]> {
  const { data, error } = await client.from('users').select('*').order('active', { ascending: false }).order('name');
  if (error) throw error;
  return data;
}

export async function getPendingExpenses(client: Db, today: string, page: number, pageSize: number): Promise<ExpenseSummaryRow[]> {
  const { data, error } = await client.from('expense_summaries').select('*').lte('expense_date', today).gt('pending_total', 0).order('expense_date', { ascending: false }).range((page - 1) * pageSize, page * pageSize);
  if (error) throw error;
  return data;
}

export async function getPaidExpenses(client: Db, page: number, pageSize: number): Promise<ExpenseSummaryRow[]> {
  const { data, error } = await client.from('expense_summaries').select('*').eq('status', 'paid').order('expense_date', { ascending: false }).range((page - 1) * pageSize, page * pageSize);
  if (error) throw error;
  return data;
}

export async function getPendingExpensesCount(client: Db, today: string): Promise<number> {
  const { count, error } = await client.from('expense_summaries').select('*', { count: 'exact', head: true }).lte('expense_date', today).gt('pending_total', 0);
  if (error) throw error;
  return count ?? 0;
}

export async function getPaidExpensesCount(client: Db): Promise<number> {
  const { count, error } = await client.from('expense_summaries').select('*', { count: 'exact', head: true }).eq('status', 'paid');
  if (error) throw error;
  return count ?? 0;
}

export async function getAuditLogCount(client: Db): Promise<number> {
  const { count, error } = await client.from('audit_log').select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getExpense(client: Db, id: string): Promise<ExpenseSummaryRow> {
  const { data, error } = await client.from('expense_summaries').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getExpenseParticipants(client: Db, id: string): Promise<ExpenseParticipantRow[]> {
  const { data, error } = await client.from('expense_participants').select('*').eq('expense_id', id).order('user_id');
  if (error) throw error;
  return data;
}

export async function getPayments(client: Db, id: string): Promise<PaymentRow[]> {
  const { data, error } = await client.from('payments').select('*').eq('expense_id', id).order('paid_at');
  if (error) throw error;
  return data;
}

export async function getBalances(client: Db): Promise<UserBalanceRow[]> {
  const { data, error } = await client.from('user_balances').select('*').order('active', { ascending: false }).order('name');
  if (error) throw error;
  return data;
}

export async function getAuditLog(client: Db, page: number, pageSize: number): Promise<AuditRow[]> {
  const { data, error } = await client.from('audit_log').select('*').order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize);
  if (error) throw error;
  return data;
}

export async function getRecurrences(client: Db): Promise<(RecurringExpenseRow & { participants: RecurringExpenseParticipantRow[] })[]> {
  const { data, error } = await client.from('recurring_expenses').select('*').order('active', { ascending: false }).order('end_date');
  if (error) throw error;
  const recurrences = data;
  const ids = recurrences.map((r) => r.id);
  if (ids.length === 0) return recurrences.map((r) => ({ ...r, participants: [] }));
  const { data: participants, error: participantsError } = await client.from('recurring_expense_participants').select('*').in('recurring_expense_id', ids);
  if (participantsError) throw participantsError;
  return recurrences.map((r) => ({ ...r, participants: participants.filter((p) => p.recurring_expense_id === r.id) }));
}

export async function createUser(client: Db, name: string, actor: string | null): Promise<string> {
  const { data, error } = await client.rpc('create_user', { p_name: name, p_actor_user_id: actor });
  if (error) throw error;
  return data;
}

export async function deactivateUser(client: Db, userId: string, actor: string | null): Promise<void> {
  const { error } = await client.rpc('deactivate_user', { p_user_id: userId, p_actor_user_id: actor });
  if (error) throw error;
}

export interface CreateExpenseInput {
  description: string;
  amount: string;
  expenseDate: string;
  participantIds: string[];
  initialPayments: { user_id: string; amount: string; paid_at?: string }[];
  recurrence: { frequency: Database['public']['Enums']['recurrence_frequency']; end_date: string } | null;
  createdBy: string | null;
}

export async function createExpense(client: Db, input: CreateExpenseInput): Promise<string> {
  const { data, error } = await client.rpc('create_expense', {
    p_description: input.description,
    p_amount: input.amount,
    p_expense_date: input.expenseDate,
    p_participants: input.participantIds,
    p_initial_payments: input.initialPayments,
    p_recurrence: input.recurrence,
    p_created_by: input.createdBy
  });
  if (error) throw error;
  return data;
}

export async function createPayment(client: Db, expenseId: string, userId: string, amount: string, actor: string | null): Promise<string> {
  const { data, error } = await client.rpc('create_payment', { p_expense_id: expenseId, p_user_id: userId, p_amount: amount, p_created_by: actor });
  if (error) throw error;
  return data;
}

export async function updatePayment(client: Db, paymentId: string, amount: string, actor: string | null): Promise<void> {
  const { error } = await client.rpc('update_payment', { p_payment_id: paymentId, p_new_amount: amount, p_actor_user_id: actor });
  if (error) throw error;
}

export async function deletePayment(client: Db, paymentId: string, actor: string | null): Promise<void> {
  const { error } = await client.rpc('delete_payment', { p_payment_id: paymentId, p_actor_user_id: actor });
  if (error) throw error;
}

export async function payRemaining(client: Db, expenseId: string, userId: string, actor: string | null): Promise<string> {
  const { data, error } = await client.rpc('pay_remaining_amount', { p_expense_id: expenseId, p_user_id: userId, p_actor_user_id: actor });
  if (error) throw error;
  return data;
}

export async function deleteExpense(client: Db, expenseId: string, actor: string | null): Promise<void> {
  const { error } = await client.rpc('delete_expense', { p_expense_id: expenseId, p_actor_user_id: actor });
  if (error) throw error;
}

export async function toggleRecurrence(client: Db, id: string, active: boolean, actor: string | null): Promise<void> {
  const { error } = await client.rpc('toggle_recurring_expense', { p_recurring_id: id, p_active: active, p_actor_user_id: actor });
  if (error) throw error;
}
