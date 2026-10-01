begin;
select plan(29);

-- Fixed fixtures.
insert into public.users (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Juan'),
  ('10000000-0000-0000-0000-000000000002', 'Pedro'),
  ('10000000-0000-0000-0000-000000000003', 'María');

select is(
  (select assigned_amount
   from public.split_amount(100, array[
     '10000000-0000-0000-0000-000000000001'::uuid,
     '10000000-0000-0000-0000-000000000002'::uuid,
     '10000000-0000-0000-0000-000000000003'::uuid])
   where user_id = '10000000-0000-0000-0000-000000000001'::uuid)::numeric,
  33.34::numeric,
  'first UUID receives the odd cent');

select is(
  (select sum(assigned_amount) from public.split_amount(100, array[
    '10000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000003'::uuid]))::numeric,
  100.00::numeric,
  'split sums exactly to total');

select lives_ok(
  $$select public.create_expense(
    'Supermercado', 600, '2026-09-13',
    '["10000000-0000-0000-0000-000000000001","10000000-0000-0000-0000-000000000002"]'::jsonb,
    '[]'::jsonb, null, '10000000-0000-0000-0000-000000000001'::uuid
  )$$,
  'shared expense can be created');

select is((select count(*)::int from public.expenses where description = 'Supermercado'), 1, 'one shared expense exists');
select is((select sum(assigned_amount)::numeric from public.expense_participants ep join public.expenses e on e.id=ep.expense_id where e.description='Supermercado'), 600.00::numeric, 'participants total equals expense');
select is((select assigned_amount from public.expense_participants ep join public.expenses e on e.id=ep.expense_id where e.description='Supermercado' and ep.user_id='10000000-0000-0000-0000-000000000001'::uuid)::numeric, 300.00::numeric, 'Juan assigned 300');
select is((select assigned_amount from public.expense_participants ep join public.expenses e on e.id=ep.expense_id where e.description='Supermercado' and ep.user_id='10000000-0000-0000-0000-000000000002'::uuid)::numeric, 300.00::numeric, 'Pedro assigned 300');

-- Juan pays a shared expense in full.
select lives_ok(
  $$select public.create_payment((select id from public.expenses where description='Supermercado'), '10000000-0000-0000-0000-000000000001', 600, now(), '10000000-0000-0000-0000-000000000001')$$,
  'one person can pay a shared expense in full');
select is((select sum(amount)::numeric from public.payments where expense_id=(select id from public.expenses where description='Supermercado')), 600.00::numeric, 'payment total is 600');
select is((select balance from public.user_balances where user_id='10000000-0000-0000-0000-000000000001'::uuid)::numeric, 300.00::numeric, 'Juan balance is +300');
select is((select balance from public.user_balances where user_id='10000000-0000-0000-0000-000000000002'::uuid)::numeric, -300.00::numeric, 'Pedro balance is -300');

-- Individual expense paid by another person.
select lives_ok(
  $$select public.create_expense(
    'Taxi', 200, '2026-09-14',
    '["10000000-0000-0000-0000-000000000001"]'::jsonb,
    '[]'::jsonb, null, '10000000-0000-0000-0000-000000000001'::uuid
  )$$,
  'individual expense can be created');
select lives_ok(
  $$select public.create_payment((select id from public.expenses where description='Taxi'), '10000000-0000-0000-0000-000000000002', 200, now(), '10000000-0000-0000-0000-000000000002')$$,
  'different user can pay individual expense');
select is((select balance from public.user_balances where user_id='10000000-0000-0000-0000-000000000001'::uuid)::numeric, 100.00::numeric, 'Juan cumulative balance becomes +100');
select is((select balance from public.user_balances where user_id='10000000-0000-0000-0000-000000000002'::uuid)::numeric, -100.00::numeric, 'Pedro cumulative balance becomes -100');

-- Partial payment and overpayment protection.
select public.create_expense(
  'Hotel', 600, '2026-09-15',
  '["10000000-0000-0000-0000-000000000001","10000000-0000-0000-0000-000000000002"]'::jsonb,
  '[]'::jsonb, null, '10000000-0000-0000-0000-000000000001'::uuid
);
select lives_ok(
  $$select public.create_payment((select id from public.expenses where description='Hotel'), '10000000-0000-0000-0000-000000000001', 300, now(), '10000000-0000-0000-0000-000000000001')$$,
  'partial payment is accepted');
select is((select pending_total from public.expense_summaries where description='Hotel')::numeric, 300.00::numeric, 'pending total is 300');
select throws_ok(
  $$select public.create_payment((select id from public.expenses where description='Hotel'), '10000000-0000-0000-0000-000000000002', 301, now(), '10000000-0000-0000-0000-000000000002')$$,
  'P0001', 'PAYMENT_EXCEEDS_EXPENSE', 'overpayment is rejected');

-- Initial payments can be made by users not assigned to the expense.
select public.create_expense(
  'Dinner', 400, '2026-09-16',
  '["10000000-0000-0000-0000-000000000001","10000000-0000-0000-0000-000000000002"]'::jsonb,
  '[{"user_id":"10000000-0000-0000-0000-000000000003","amount":400}]'::jsonb,
  null, '10000000-0000-0000-0000-000000000001'::uuid
);
select is((select paid_total from public.expense_summaries where description='Dinner')::numeric, 400.00::numeric, 'initial payment may come from another active user');
select throws_ok(
  $q$select public.create_expense(
    'Initial overage', 100, '2026-09-16',
    jsonb_build_array('10000000-0000-0000-0000-000000000001'::uuid),
    jsonb_build_array(jsonb_build_object('user_id', '10000000-0000-0000-0000-000000000003'::uuid, 'amount', 101)),
    null, '10000000-0000-0000-0000-000000000001'::uuid
  )$q$,
  'P0001', 'INITIAL_PAYMENTS_EXCEED_EXPENSE', 'initial payments cannot exceed expense');

-- Editing payment cannot exceed expense.
select public.create_expense(
  'Edit me', 500, '2026-09-17',
  '["10000000-0000-0000-0000-000000000001"]'::jsonb,
  '[{"user_id":"10000000-0000-0000-0000-000000000002","amount":100}]'::jsonb,
  null, '10000000-0000-0000-0000-000000000001'::uuid
);
select lives_ok(
  $$select public.update_payment((select p.id from public.payments p join public.expenses e on e.id=p.expense_id where e.description='Edit me'), 200, '10000000-0000-0000-0000-000000000001'::uuid)$$,
  'payment can be edited');
select is((select paid_total from public.expense_summaries where description='Edit me')::numeric, 200.00::numeric, 'edited amount is reflected');

-- Mark as paid creates a real payment.
select public.create_expense(
  'Mark me', 250, '2026-09-18',
  '["10000000-0000-0000-0000-000000000001"]'::jsonb,
  '[{"user_id":"10000000-0000-0000-0000-000000000002","amount":100}]'::jsonb,
  null, '10000000-0000-0000-0000-000000000001'::uuid
);
select lives_ok(
  $$select public.pay_remaining_amount((select id from public.expenses where description='Mark me'), '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')$$,
  'mark as paid creates remaining payment');
select is((select paid_total from public.expense_summaries where description='Mark me')::numeric, 250.00::numeric, 'mark as paid reaches exact total');
select is((select count(*)::int from public.payments where expense_id=(select id from public.expenses where description='Mark me')), 2, 'mark as paid creates an actual payment row');

-- Future expense is excluded from balances.
select public.create_expense(
  'Future', 1000, '2099-01-01',
  '["10000000-0000-0000-0000-000000000001"]'::jsonb,
  '[{"user_id":"10000000-0000-0000-0000-000000000002","amount":1000}]'::jsonb,
  null, '10000000-0000-0000-0000-000000000001'::uuid
);
select is((select total_assigned from public.user_balances where user_id='10000000-0000-0000-0000-000000000001'::uuid)::numeric, 1750.00::numeric, 'future expense does not affect assigned total');

-- Delete payment and expense; audit survives.
select public.delete_payment((select p.id from public.payments p join public.expenses e on e.id=p.expense_id where e.description='Edit me'), '10000000-0000-0000-0000-000000000001'::uuid);
select is((select paid_total from public.expense_summaries where description='Edit me')::numeric, 0.00::numeric, 'deleted payment recalculates paid total');
select public.delete_expense((select id from public.expenses where description='Hotel'), '10000000-0000-0000-0000-000000000001'::uuid);
select is((select count(*)::int from public.payments where expense_id not in (select id from public.expenses)), 0, 'cascade does not leave orphan payments');
select ok((select count(*) > 0 from public.audit_log where action='DELETE_EXPENSE' and description like '%Hotel%'), 'delete expense is audited');

select * from finish();
rollback;
