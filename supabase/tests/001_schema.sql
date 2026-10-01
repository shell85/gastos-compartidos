begin;
select plan(24);

select has_table('public', 'users', 'users table exists');
select has_table('public', 'expenses', 'expenses table exists');
select has_table('public', 'expense_participants', 'expense participants table exists');
select has_table('public', 'payments', 'payments table exists');
select has_table('public', 'recurring_expenses', 'recurring expenses table exists');
select has_table('public', 'recurring_expense_participants', 'recurring participants table exists');
select has_table('public', 'audit_log', 'audit log table exists');

select has_column('public', 'users', 'active', 'users.active exists');
select has_column('public', 'expenses', 'amount', 'expenses.amount exists');
select has_column('public', 'expense_participants', 'assigned_amount', 'participant amount exists');
select has_column('public', 'payments', 'paid_at', 'payment timestamp exists');
select has_column('public', 'audit_log', 'metadata', 'audit metadata exists');

select has_index('public', 'expenses', 'expenses_expense_date_idx', 'expense date index exists');
select has_index('public', 'payments', 'payments_expense_id_idx', 'payment expense index exists');
select has_index('public', 'audit_log', 'audit_log_created_at_idx', 'audit log created_at index exists');

select ok((select relrowsecurity from pg_class where oid = 'public.users'::regclass), 'RLS enabled on users');
select ok((select relrowsecurity from pg_class where oid = 'public.expenses'::regclass), 'RLS enabled on expenses');
select ok((select relrowsecurity from pg_class where oid = 'public.payments'::regclass), 'RLS enabled on payments');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_log'::regclass), 'RLS enabled on audit log');

select has_function('public', 'create_expense', 'create_expense exists');
select has_function('public', 'create_payment', 'create_payment exists');
select has_function('public', 'pay_remaining_amount', 'pay_remaining_amount exists');
select has_function('public', 'delete_expense', 'delete_expense exists');
select has_function('public', 'generate_recurring_expenses', 'generate_recurring_expenses exists');

select * from finish();
rollback;
