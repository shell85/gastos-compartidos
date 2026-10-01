begin;
select plan(25);

insert into public.users (id, name) values
  ('20000000-0000-0000-0000-000000000001', 'Recurrence User');

select is(public.next_recurrence_date('weekly', '2026-09-13'), '2026-09-20'::date, 'weekly recurrence adds seven days');
select is(public.next_recurrence_date('monthly', '2026-02-28'), '2026-03-01'::date, 'monthly moves to next month day one');
select is(public.next_recurrence_date('quarterly', '2026-02-28'), '2026-04-01'::date, 'quarterly follows documented example');
select is(public.next_recurrence_date('quarterly', '2026-04-01'), '2026-07-01'::date, 'quarterly advances to next quarter boundary');
select is(public.next_recurrence_date('semiannual', '2026-02-28'), '2026-07-01'::date, 'semiannual follows documented example');
select is(public.next_recurrence_date('semiannual', '2026-07-01'), '2027-01-01'::date, 'semiannual advances to next half-year boundary');
select is(public.next_recurrence_date('annual', '2026-02-28'), '2027-01-01'::date, 'annual moves to next January');

-- Monthly recovery/idempotence/inclusive-end.
select public.create_expense(
  'Monthly test', 15, '2026-08-15',
  '["20000000-0000-0000-0000-000000000001"]'::jsonb,
  '[]'::jsonb,
  '{"frequency":"monthly","end_date":"2026-10-01"}'::jsonb,
  '20000000-0000-0000-0000-000000000001'::uuid
);

select is(public.generate_recurring_expenses('2026-10-01'), 2, 'first run recovers all missing monthly occurrences through today');
select is((select count(*)::int from public.expenses where recurring_expense_id is not null and description='Monthly test'), 3, 'original plus two generated monthly occurrences exist');
select is((select count(*)::int from public.expenses where description='Monthly test' and expense_date='2026-10-01'), 1, 'end date occurrence is included');
select is((select count(*)::int from public.expenses where description='Monthly test' and expense_date='2026-11-01'), 0, 'no occurrence after inclusive end date');
select is(public.generate_recurring_expenses('2026-10-01'), 0, 'second identical run is idempotent');

-- Recurrence participants are copied to every generated expense.
select is((select count(*)::int from public.expense_participants ep join public.expenses e on e.id=ep.expense_id where e.description='Monthly test'), 3, 'every occurrence gets participants');
select is((select sum(ep.assigned_amount)::numeric from public.expense_participants ep join public.expenses e on e.id=ep.expense_id where e.description='Monthly test'), 45.00::numeric, 'participant assignments sum over all occurrences');

-- Weekly recovery after a simulated two-week Cron outage.
select public.create_expense(
  'Weekly test', 10, '2026-09-06',
  '["20000000-0000-0000-0000-000000000001"]'::jsonb,
  '[]'::jsonb,
  '{"frequency":"weekly","end_date":"2026-09-27"}'::jsonb,
  '20000000-0000-0000-0000-000000000001'::uuid
);
select is(public.generate_recurring_expenses('2026-09-27'), 3, 'weekly generator fills all missed occurrences');
select is((select count(*)::int from public.expenses where description='Weekly test'), 4, 'weekly occurrences include the original plus three generated');

-- Quarterly and semiannual examples materialize the requested calendar boundaries.
select public.create_expense(
  'Quarterly test', 30, '2026-02-28',
  '["20000000-0000-0000-0000-000000000001"]'::jsonb,
  '[]'::jsonb,
  '{"frequency":"quarterly","end_date":"2026-10-01"}'::jsonb,
  '20000000-0000-0000-0000-000000000001'::uuid
);
select is(public.generate_recurring_expenses('2026-10-01'), 3, 'quarterly generator creates Apr/Jul/Oct boundaries');
select is((select count(*)::int from public.expenses where description='Quarterly test' and expense_date in ('2026-04-01','2026-07-01','2026-10-01')), 3, 'quarterly dates match explicit spec examples');

select public.create_expense(
  'Semiannual test', 60, '2026-02-28',
  '["20000000-0000-0000-0000-000000000001"]'::jsonb,
  '[]'::jsonb,
  '{"frequency":"semiannual","end_date":"2027-01-01"}'::jsonb,
  '20000000-0000-0000-0000-000000000001'::uuid
);
select is(public.generate_recurring_expenses('2027-01-01'), 2, 'semiannual generator creates Jul/Jan boundaries');
select is((select count(*)::int from public.expenses where description='Semiannual test' and expense_date in ('2026-07-01','2027-01-01')), 2, 'semiannual dates match explicit spec examples');


select public.create_expense(
  'Annual test', 120, '2026-02-28',
  '["20000000-0000-0000-0000-000000000001"]'::jsonb,
  '[]'::jsonb,
  '{"frequency":"annual","end_date":"2028-01-01"}'::jsonb,
  '20000000-0000-0000-0000-000000000001'::uuid
);
select is(public.generate_recurring_expenses('2028-01-01'), 2, 'annual generator creates next January occurrences');
select is((select count(*)::int from public.expenses where description='Annual test' and expense_date in ('2027-01-01','2028-01-01')), 2, 'annual dates match explicit rule');

-- Deactivation stops future generation without removing existing occurrences.
select public.toggle_recurring_expense((select id from public.recurring_expenses where description='Monthly test'), false, '20000000-0000-0000-0000-000000000001'::uuid);
select is(public.generate_recurring_expenses('2026-12-01'), 0, 'inactive recurrence creates nothing');
select is((select count(*)::int from public.expenses where description='Monthly test'), 3, 'deactivating recurrence keeps generated history');

select is((select count(*)::int from public.audit_log where action='CREATE_EXPENSE' and metadata->>'source'='recurrence'), 12, 'recurrence generations are audited');

select * from finish();
rollback;
