begin;
select plan(12);

insert into public.users (id, name) values
  ('40000000-0000-0000-0000-000000000001', 'Integrity User'),
  ('40000000-0000-0000-0000-000000000002', 'Integrity Payer');

select throws_ok(
  $$select public.create_expense('', 100, current_date, '["40000000-0000-0000-0000-000000000001"]'::jsonb, '[]'::jsonb, null, null)$$,
  'P0001', 'INVALID_DESCRIPTION', 'empty description rejected');

select throws_ok(
  $$select public.create_expense('Bad amount', 0, current_date, '["40000000-0000-0000-0000-000000000001"]'::jsonb, '[]'::jsonb, null, null)$$,
  'P0001', 'INVALID_AMOUNT', 'non-positive expense rejected');

select throws_ok(
  $$select public.create_expense('No participants', 10, current_date, '[]'::jsonb, '[]'::jsonb, null, null)$$,
  'P0001', 'NO_PARTICIPANTS', 'expense without participants rejected');

select public.create_expense(
  'Valid', 100, current_date,
  '["40000000-0000-0000-0000-000000000001"]'::jsonb,
  '[]'::jsonb, null, null
);

select throws_ok(
  $$select public.create_payment((select id from public.expenses where description='Valid'), '40000000-0000-0000-0000-000000000002', 0, now(), null)$$,
  'P0001', 'INVALID_AMOUNT', 'non-positive payment rejected');

select lives_ok(
  $$select public.deactivate_user('40000000-0000-0000-0000-000000000002'::uuid, null)$$,
  'user can be deactivated'
);

select throws_ok(
  $$select public.create_payment((select id from public.expenses where description='Valid'), '40000000-0000-0000-0000-000000000002', 10, now(), null)$$,
  'P0001', 'USER_NOT_ACTIVE', 'inactive payer rejected');

select throws_ok(
  $$select public.create_expense('Bad participant', 10, current_date, '["40000000-0000-0000-0000-000000000002"]'::jsonb, '[]'::jsonb, null, null)$$,
  'P0001', 'PARTICIPANT_NOT_ACTIVE', 'inactive participant rejected');

select public.create_payment((select id from public.expenses where description='Valid'), '40000000-0000-0000-0000-000000000001', 100, now(), null);
select is((select status from public.expense_summaries where description='Valid'), 'paid', 'status derives to paid');
select is((select pending_total from public.expense_summaries where description='Valid')::numeric, 0.00::numeric, 'paid expense has zero pending');

select public.delete_expense((select id from public.expenses where description='Valid'), null);
select is((select count(*)::int from public.expense_participants ep join public.expenses e on e.id=ep.expense_id where e.description='Valid'), 0, 'participants cascade on expense deletion');
select is((select count(*)::int from public.payments p join public.expenses e on e.id=p.expense_id where e.description='Valid'), 0, 'payments cascade on expense deletion');
select ok((select count(*) > 0 from public.audit_log where action='DELETE_EXPENSE' and metadata->>'description'='Valid'), 'delete audit retains deleted expense metadata');

select * from finish();
rollback;
