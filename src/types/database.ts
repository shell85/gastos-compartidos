export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
export type ExpenseStatus = 'pending' | 'partial' | 'paid';

export interface UserRow {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRow {
  id: string;
  description: string;
  amount: string;
  expense_date: string;
  recurring_expense_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ExpenseParticipantRow {
  expense_id: string;
  user_id: string;
  assigned_amount: string;
}

export interface PaymentRow {
  id: string;
  expense_id: string;
  user_id: string;
  amount: string;
  paid_at: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AuditRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  metadata: Json | null;
  created_at: string;
}

export interface RecurringExpenseRow {
  id: string;
  description: string;
  amount: string;
  frequency: Frequency;
  start_date: string;
  end_date: string;
  created_at: string;
  created_by: string | null;
  active: boolean;
}

export interface RecurringExpenseParticipantRow {
  recurring_expense_id: string;
  user_id: string;
}

export interface ExpenseSummaryRow {
  id: string;
  description: string;
  amount: string;
  expense_date: string;
  recurring_expense_id: string | null;
  created_at: string;
  created_by: string | null;
  paid_total: string;
  pending_total: string;
  status: ExpenseStatus;
}

export interface UserBalanceRow {
  user_id: string;
  name: string;
  active: boolean;
  total_assigned: string;
  total_paid: string;
  balance: string;
}

interface TableDef<Row> {
  Row: Row & Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
}

interface ViewDef<Row> {
  Row: Row & Record<string, unknown>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      users: TableDef<UserRow>;
      recurring_expenses: TableDef<RecurringExpenseRow>;
      recurring_expense_participants: TableDef<RecurringExpenseParticipantRow>;
      expenses: TableDef<ExpenseRow>;
      expense_participants: TableDef<ExpenseParticipantRow>;
      payments: TableDef<PaymentRow>;
      audit_log: TableDef<AuditRow>;
    };
    Views: {
      expense_summaries: ViewDef<ExpenseSummaryRow>;
      user_balances: ViewDef<UserBalanceRow>;
    };
    Functions: {
      health_check: { Args: Record<string, never>; Returns: boolean };
      create_user: { Args: { p_name: string; p_actor_user_id?: string | null }; Returns: string };
      deactivate_user: { Args: { p_user_id: string; p_actor_user_id?: string | null }; Returns: undefined };
      create_expense: {
        Args: {
          p_description: string;
          p_amount: string;
          p_expense_date: string;
          p_participants: string[];
          p_initial_payments?: Json;
          p_recurrence?: Json | null;
          p_created_by?: string | null;
        };
        Returns: string;
      };
      create_payment: {
        Args: { p_expense_id: string; p_user_id: string; p_amount: string; p_paid_at?: string; p_created_by?: string | null };
        Returns: string;
      };
      update_payment: { Args: { p_payment_id: string; p_new_amount: string; p_actor_user_id?: string | null }; Returns: undefined };
      delete_payment: { Args: { p_payment_id: string; p_actor_user_id?: string | null }; Returns: undefined };
      pay_remaining_amount: { Args: { p_expense_id: string; p_user_id: string; p_actor_user_id?: string | null }; Returns: string };
      delete_expense: { Args: { p_expense_id: string; p_actor_user_id?: string | null }; Returns: undefined };
      toggle_recurring_expense: { Args: { p_recurring_id: string; p_active: boolean; p_actor_user_id?: string | null }; Returns: undefined };
      generate_recurring_expenses: { Args: { p_until?: string }; Returns: number };
    };
    Enums: {
      recurrence_frequency: Frequency;
    };
    CompositeTypes: Record<string, never>;
  };
}
