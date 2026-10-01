-- Run with `supabase test db` after applying the migration.
-- These tests execute inside the test transaction and should be extended with
-- project-specific fixtures/CI as the schema evolves.
create extension if not exists pgtap;
select plan(4);

select has_table('public', 'users', 'users table exists');
select has_table('public', 'expenses', 'expenses table exists');
select has_table('public', 'payments', 'payments table exists');
select has_function('public', 'create_expense', 'create_expense RPC exists');

select * from finish();
