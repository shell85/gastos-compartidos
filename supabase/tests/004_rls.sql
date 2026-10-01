begin;
select plan(10);

insert into public.users (id, name) values
  ('30000000-0000-0000-0000-000000000001', 'RLS User');

set local role anon;

select lives_ok(
  $$select public.create_user('Anon Created', null)$$,
  'anon can use the approved create_user RPC'
);

select ok(
  exists(select 1 from public.users where name='Anon Created'),
  'RPC created user is visible'
);

select throws_ok(
  $$insert into public.users(name) values ('Direct Write')$$,
  '42501',
  NULL,
  'anon cannot insert directly into users'
);

select throws_ok(
  $$insert into public.expenses(description, amount, expense_date) values ('Direct Write', 10, current_date)$$,
  '42501',
  NULL,
  'anon cannot insert directly into expenses'
);

select throws_ok(
  $$insert into public.payments(expense_id, user_id, amount, paid_at) values (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', 1, now())$$,
  '42501',
  NULL,
  'anon cannot insert directly into payments'
);

select ok((select count(*) >= 2 from public.users where name in ('RLS User','Anon Created')), 'anon can read shared users');

select public.create_expense(
  'RLS Expense', 100, current_date,
  '["30000000-0000-0000-0000-000000000001"]'::jsonb,
  '[]'::jsonb, null, null
);

select lives_ok(
  $$select public.create_payment((select id from public.expenses where description='RLS Expense'), '30000000-0000-0000-0000-000000000001', 100, now(), null)$$,
  'anon can use the approved create_payment RPC'
);

select is((select paid_total from public.expense_summaries where description='RLS Expense')::numeric, 100.00::numeric, 'RPC write is reflected in read view');

select throws_ok(
  $$update public.users set active=false where id='30000000-0000-0000-0000-000000000001'::uuid$$,
  '42501',
  NULL,
  'anon cannot update users directly'
);

select throws_ok(
  $$delete from public.audit_log$$,
  '42501',
  NULL,
  'anon cannot delete audit log directly'
);

reset role;

select * from finish();
rollback;
