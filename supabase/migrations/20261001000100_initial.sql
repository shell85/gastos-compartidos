create extension if not exists pg_cron with schema pg_catalog;

create type public.recurrence_frequency as enum ('weekly', 'monthly', 'quarterly', 'semiannual', 'annual');

create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_name_nonempty check (btrim(name) <> '')
);

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null,
  frequency public.recurrence_frequency not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  created_by uuid null references public.users(id) on delete set null,
  active boolean not null default true,
  constraint recurring_expenses_amount_positive check (amount > 0),
  constraint recurring_expenses_date_range check (end_date >= start_date),
  constraint recurring_expenses_description_nonempty check (btrim(description) <> '')
);

create table public.recurring_expense_participants (
  recurring_expense_id uuid not null references public.recurring_expenses(id) on delete cascade,
  user_id uuid not null references public.users(id),
  primary key (recurring_expense_id, user_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null,
  expense_date date not null,
  recurring_expense_id uuid null references public.recurring_expenses(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid null references public.users(id) on delete set null,
  constraint expenses_amount_positive check (amount > 0),
  constraint expenses_description_nonempty check (btrim(description) <> ''),
  constraint expenses_recurring_occurrence_unique unique (recurring_expense_id, expense_date)
);

create table public.expense_participants (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.users(id),
  assigned_amount numeric(12,2) not null,
  primary key (expense_id, user_id),
  constraint expense_participants_amount_nonnegative check (assigned_amount >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.users(id),
  amount numeric(12,2) not null,
  paid_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references public.users(id) on delete set null,
  constraint payments_amount_positive check (amount > 0)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  description text null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();

create index expenses_expense_date_idx on public.expenses(expense_date);
create index expenses_recurring_expense_id_idx on public.expenses(recurring_expense_id);
create index payments_expense_id_idx on public.payments(expense_id);
create index payments_user_id_idx on public.payments(user_id);
create index expense_participants_expense_id_idx on public.expense_participants(expense_id);
create index expense_participants_user_id_idx on public.expense_participants(user_id);
create index audit_log_created_at_idx on public.audit_log(created_at desc);
create index audit_log_entity_id_idx on public.audit_log(entity_id);
create index recurring_expenses_active_end_date_idx on public.recurring_expenses(active, end_date);

create or replace function public.require_active_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;
  if not exists (select 1 from public.users where id = p_user_id and active) then
    raise exception 'USER_NOT_ACTIVE' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.split_amount(p_amount numeric, p_user_ids uuid[])
returns table(user_id uuid, assigned_amount numeric)
language sql
immutable
as $$
  with ordered as (
    select
      u as user_id,
      row_number() over (order by u) as rn,
      count(*) over () as cnt,
      round(p_amount * 100)::bigint as cents
    from unnest(p_user_ids) as u
  ),
  calc as (
    select
      user_id,
      (cents / cnt) as base_cents,
      (cents % cnt) as remainder_cents,
      rn
    from ordered
  )
  select user_id,
         ((base_cents + case when rn <= remainder_cents then 1 else 0 end) / 100.0)::numeric(12,2)
  from calc
  order by user_id;
$$;

create or replace function public.create_user(p_name text, p_actor_user_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(p_name);
  v_id uuid;
begin
  if v_name = '' then raise exception 'INVALID_NAME' using errcode = 'P0001'; end if;
  perform public.require_active_user(p_actor_user_id);
  insert into public.users(name) values (v_name) returning id into v_id;
  insert into public.audit_log(user_id, action, entity_type, entity_id, description, metadata)
  values (p_actor_user_id, 'CREATE_USER', 'user', v_id, 'Creó al usuario ' || v_name, jsonb_build_object('name', v_name));
  return v_id;
end;
$$;

create or replace function public.deactivate_user(p_user_id uuid, p_actor_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  perform public.require_active_user(p_actor_user_id);
  select name into v_name from public.users where id = p_user_id for update;
  if not found then raise exception 'USER_NOT_FOUND' using errcode = 'P0001'; end if;
  if not (select active from public.users where id = p_user_id) then
    return;
  end if;
  update public.users set active = false where id = p_user_id;
  insert into public.audit_log(user_id, action, entity_type, entity_id, description, metadata)
  values (p_actor_user_id, 'DEACTIVATE_USER', 'user', p_user_id, 'Desactivó a ' || v_name, jsonb_build_object('name', v_name));
end;
$$;

create or replace function public.create_expense(
  p_description text,
  p_amount numeric,
  p_expense_date date,
  p_participants jsonb,
  p_initial_payments jsonb default '[]'::jsonb,
  p_recurrence jsonb default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense_id uuid;
  v_recurrence_id uuid;
  v_description text := btrim(p_description);
  v_user_ids uuid[];
  v_initial_total numeric(12,2);
  v_rec_frequency public.recurrence_frequency;
  v_rec_end date;
begin
  if v_description = '' then raise exception 'INVALID_DESCRIPTION' using errcode = 'P0001'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 9999999999.99 or p_amount <> round(p_amount, 2) then raise exception 'INVALID_AMOUNT' using errcode = 'P0001'; end if;
  if p_expense_date is null then raise exception 'INVALID_DATE' using errcode = 'P0001'; end if;
  perform public.require_active_user(p_created_by);

  select array_agg(value::uuid order by value::uuid) into v_user_ids
  from jsonb_array_elements_text(coalesce(p_participants, '[]'::jsonb));

  if coalesce(array_length(v_user_ids, 1), 0) = 0 then raise exception 'NO_PARTICIPANTS' using errcode = 'P0001'; end if;
  if (select count(*) from unnest(v_user_ids)) <> (select count(distinct x) from unnest(v_user_ids) as x) then raise exception 'DUPLICATE_PARTICIPANT' using errcode = 'P0001'; end if;
  if exists (select 1 from unnest(v_user_ids) as x(user_id) left join public.users u on u.id = x.user_id where u.id is null or not u.active) then raise exception 'PARTICIPANT_NOT_ACTIVE' using errcode = 'P0001'; end if;

  if p_recurrence is not null then
    v_rec_frequency := (p_recurrence->>'frequency')::public.recurrence_frequency;
    v_rec_end := (p_recurrence->>'end_date')::date;
    if v_rec_end < p_expense_date then raise exception 'INVALID_RECURRENCE_END' using errcode = 'P0001'; end if;
    insert into public.recurring_expenses(description, amount, frequency, start_date, end_date, created_by)
    values (v_description, p_amount, v_rec_frequency, p_expense_date, v_rec_end, p_created_by)
    returning id into v_recurrence_id;
    insert into public.recurring_expense_participants(recurring_expense_id, user_id)
    select v_recurrence_id, unnest(v_user_ids);
  end if;

  insert into public.expenses(description, amount, expense_date, recurring_expense_id, created_by)
  values (v_description, p_amount, p_expense_date, v_recurrence_id, p_created_by)
  returning id into v_expense_id;

  insert into public.expense_participants(expense_id, user_id, assigned_amount)
  select v_expense_id, s.user_id, s.assigned_amount
  from public.split_amount(p_amount, v_user_ids) s;

  select coalesce(sum((x->>'amount')::numeric), 0)::numeric(12,2)
  into v_initial_total
  from jsonb_array_elements(coalesce(p_initial_payments, '[]'::jsonb)) x;

  if v_initial_total < 0 or v_initial_total > p_amount then raise exception 'INITIAL_PAYMENTS_EXCEED_EXPENSE' using errcode = 'P0001'; end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_initial_payments, '[]'::jsonb)) x
    left join public.users u on u.id = (x->>'user_id')::uuid
    where u.id is null or not u.active or (x->>'amount')::numeric <= 0 or (x->>'amount')::numeric <> round((x->>'amount')::numeric, 2)
  ) then raise exception 'INVALID_INITIAL_PAYMENT' using errcode = 'P0001'; end if;

  insert into public.payments(expense_id, user_id, amount, paid_at, created_by)
  select v_expense_id, (x->>'user_id')::uuid, (x->>'amount')::numeric(12,2), coalesce((x->>'paid_at')::timestamptz, now()), p_created_by
  from jsonb_array_elements(coalesce(p_initial_payments, '[]'::jsonb)) x;

  insert into public.audit_log(user_id, action, entity_type, entity_id, description, metadata)
  values (
    p_created_by,
    'CREATE_EXPENSE',
    'expense',
    v_expense_id,
    'Creó "' || v_description || '" por ' || to_char(p_amount, 'FM9999999990D00') || ' €',
    jsonb_build_object('amount', p_amount, 'expense_date', p_expense_date, 'participant_count', array_length(v_user_ids, 1), 'has_recurrence', v_recurrence_id is not null)
  );

  return v_expense_id;
end;
$$;

create or replace function public.create_payment(
  p_expense_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_paid_at timestamptz default now(),
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense_amount numeric(12,2);
  v_paid numeric(12,2);
  v_payment_id uuid;
  v_description text;
begin
  perform public.require_active_user(p_created_by);
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then raise exception 'INVALID_AMOUNT' using errcode = 'P0001'; end if;
  perform public.require_active_user(p_user_id);
  select amount, description into v_expense_amount, v_description from public.expenses where id = p_expense_id for update;
  if not found then raise exception 'EXPENSE_NOT_FOUND' using errcode = 'P0001'; end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where expense_id = p_expense_id;
  if v_paid + p_amount > v_expense_amount then raise exception 'PAYMENT_EXCEEDS_EXPENSE' using errcode = 'P0001'; end if;

  insert into public.payments(expense_id, user_id, amount, paid_at, created_by)
  values (p_expense_id, p_user_id, p_amount, p_paid_at, p_created_by)
  returning id into v_payment_id;

  insert into public.audit_log(user_id, action, entity_type, entity_id, description, metadata)
  values (p_created_by, 'CREATE_PAYMENT', 'payment', v_payment_id, 'Registró un pago de ' || to_char(p_amount, 'FM9999999990D00') || ' €', jsonb_build_object('expense_id', p_expense_id, 'expense_description', v_description, 'amount', p_amount, 'payer_id', p_user_id));
  return v_payment_id;
end;
$$;

create or replace function public.update_payment(p_payment_id uuid, p_new_amount numeric, p_actor_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense_id uuid;
  v_user_id uuid;
  v_old_amount numeric(12,2);
  v_expense_amount numeric(12,2);
  v_other_paid numeric(12,2);
begin
  perform public.require_active_user(p_actor_user_id);
  if p_new_amount is null or p_new_amount <= 0 or p_new_amount <> round(p_new_amount, 2) then raise exception 'INVALID_AMOUNT' using errcode = 'P0001'; end if;
  select expense_id, user_id, amount into v_expense_id, v_user_id, v_old_amount from public.payments where id = p_payment_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0001'; end if;
  select amount into v_expense_amount from public.expenses where id = v_expense_id for update;
  select coalesce(sum(amount),0) into v_other_paid from public.payments where expense_id = v_expense_id and id <> p_payment_id;
  if v_other_paid + p_new_amount > v_expense_amount then raise exception 'PAYMENT_EXCEEDS_EXPENSE' using errcode = 'P0001'; end if;
  update public.payments set amount = p_new_amount where id = p_payment_id;
  insert into public.audit_log(user_id, action, entity_type, entity_id, description, metadata)
  values (p_actor_user_id, 'UPDATE_PAYMENT', 'payment', p_payment_id, 'Modificó un pago de ' || to_char(v_old_amount, 'FM9999999990D00') || ' € a ' || to_char(p_new_amount, 'FM9999999990D00') || ' €', jsonb_build_object('expense_id', v_expense_id, 'payer_id', v_user_id, 'old_amount', v_old_amount, 'new_amount', p_new_amount));
end;
$$;

create or replace function public.delete_payment(p_payment_id uuid, p_actor_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense_id uuid;
  v_user_id uuid;
  v_amount numeric(12,2);
begin
  perform public.require_active_user(p_actor_user_id);
  select expense_id, user_id, amount into v_expense_id, v_user_id, v_amount from public.payments where id = p_payment_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0001'; end if;
  delete from public.payments where id = p_payment_id;
  insert into public.audit_log(user_id, action, entity_type, entity_id, description, metadata)
  values (p_actor_user_id, 'DELETE_PAYMENT', 'payment', p_payment_id, 'Eliminó un pago de ' || to_char(v_amount, 'FM9999999990D00') || ' €', jsonb_build_object('expense_id', v_expense_id, 'payer_id', v_user_id, 'amount', v_amount));
end;
$$;

create or replace function public.pay_remaining_amount(p_expense_id uuid, p_user_id uuid, p_actor_user_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense_amount numeric(12,2);
  v_paid numeric(12,2);
  v_remaining numeric(12,2);
  v_payment_id uuid;
  v_description text;
begin
  perform public.require_active_user(p_actor_user_id);
  perform public.require_active_user(p_user_id);
  select amount, description into v_expense_amount, v_description from public.expenses where id = p_expense_id for update;
  if not found then raise exception 'EXPENSE_NOT_FOUND' using errcode = 'P0001'; end if;
  select coalesce(sum(amount),0) into v_paid from public.payments where expense_id = p_expense_id;
  v_remaining := round(v_expense_amount - v_paid, 2);
  if v_remaining <= 0 then raise exception 'EXPENSE_ALREADY_PAID' using errcode = 'P0001'; end if;
  insert into public.payments(expense_id, user_id, amount, paid_at, created_by)
  values (p_expense_id, p_user_id, v_remaining, now(), p_actor_user_id)
  returning id into v_payment_id;
  insert into public.audit_log(user_id, action, entity_type, entity_id, description, metadata)
  values (p_actor_user_id, 'MARK_EXPENSE_PAID', 'expense', p_expense_id, 'Marcó "' || v_description || '" como pagado', jsonb_build_object('payment_id', v_payment_id, 'payer_id', p_user_id, 'amount', v_remaining));
  return v_payment_id;
end;
$$;

create or replace function public.delete_expense(p_expense_id uuid, p_actor_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_description text;
  v_amount numeric(12,2);
  v_expense_date date;
  v_payment_total numeric(12,2);
begin
  perform public.require_active_user(p_actor_user_id);
  select description, amount, expense_date into v_description, v_amount, v_expense_date from public.expenses where id = p_expense_id for update;
  if not found then raise exception 'EXPENSE_NOT_FOUND' using errcode = 'P0001'; end if;
  select coalesce(sum(amount),0) into v_payment_total from public.payments where expense_id = p_expense_id;
  insert into public.audit_log(user_id, action, entity_type, entity_id, description, metadata)
  values (p_actor_user_id, 'DELETE_EXPENSE', 'expense', p_expense_id, 'Eliminó "' || v_description || '"', jsonb_build_object('description', v_description, 'amount', v_amount, 'expense_date', v_expense_date, 'paid_total', v_payment_total));
  delete from public.expenses where id = p_expense_id;
end;
$$;

create or replace function public.next_recurrence_date(p_frequency public.recurrence_frequency, p_date date)
returns date
language sql
immutable
as $$
  select case p_frequency
    when 'weekly' then (p_date + 7)::date
    when 'monthly' then (date_trunc('month', p_date)::date + interval '1 month')::date
    -- The specification's concrete examples define quarterly recurrence
    -- by the next calendar quarter boundary: 28/02 -> 01/04 -> 01/07...
    when 'quarterly' then (date_trunc('quarter', p_date)::date + interval '3 months')::date
    -- Likewise, semiannual recurrence advances to the next half-year boundary:
    -- 28/02 -> 01/07 -> 01/01...
    when 'semiannual' then (date_trunc('year', p_date)::date
                            + case when extract(month from p_date) <= 6
                                   then interval '6 months'
                                   else interval '1 year'
                              end)::date
    when 'annual' then make_date(extract(year from p_date)::int + 1, 1, 1)
  end;
$$;

create or replace function public.generate_recurring_expenses(p_until date default ((now() at time zone 'Europe/Madrid')::date))
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec record;
  occ date;
  v_cutoff date;
  v_expense_id uuid;
  v_user_ids uuid[];
  v_created integer := 0;
begin
  select greatest(p_until, date '2000-01-01') into v_cutoff;
  for rec in
    select * from public.recurring_expenses where active and start_date <= least(end_date, v_cutoff) order by id
  loop
    occ := rec.start_date;
    while occ <= rec.end_date and occ <= v_cutoff loop
      insert into public.expenses(description, amount, expense_date, recurring_expense_id, created_by)
      values (rec.description, rec.amount, occ, rec.id, rec.created_by)
      on conflict (recurring_expense_id, expense_date) do nothing
      returning id into v_expense_id;

      if v_expense_id is not null then
        select array_agg(user_id order by user_id) into v_user_ids
        from public.recurring_expense_participants
        where recurring_expense_id = rec.id;
        if coalesce(array_length(v_user_ids, 1),0) = 0 then
          raise exception 'RECURRING_WITHOUT_PARTICIPANTS' using errcode = 'P0001';
        end if;
        insert into public.expense_participants(expense_id, user_id, assigned_amount)
        select v_expense_id, s.user_id, s.assigned_amount from public.split_amount(rec.amount, v_user_ids) s;
        insert into public.audit_log(user_id, action, entity_type, entity_id, description, metadata)
        values (rec.created_by, 'CREATE_EXPENSE', 'expense', v_expense_id, 'Generó automáticamente "' || rec.description || '"', jsonb_build_object('source', 'recurrence', 'recurring_expense_id', rec.id, 'expense_date', occ));
        v_created := v_created + 1;
      end if;

      occ := public.next_recurrence_date(rec.frequency, occ);
    end loop;
  end loop;
  return v_created;
end;
$$;

create or replace function public.toggle_recurring_expense(p_recurring_id uuid, p_active boolean, p_actor_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_description text;
begin
  perform public.require_active_user(p_actor_user_id);
  select description into v_description from public.recurring_expenses where id = p_recurring_id for update;
  if not found then raise exception 'RECURRENCE_NOT_FOUND' using errcode = 'P0001'; end if;
  update public.recurring_expenses set active = p_active where id = p_recurring_id;
  insert into public.audit_log(user_id, action, entity_type, entity_id, description, metadata)
  values (p_actor_user_id, case when p_active then 'ACTIVATE_RECURRENCE' else 'DEACTIVATE_RECURRENCE' end, 'recurring_expense', p_recurring_id, case when p_active then 'Activó' else 'Desactivó' end || ' la recurrencia "' || v_description || '"', jsonb_build_object('active', p_active));
end;
$$;

create or replace view public.expense_summaries
with (security_invoker = true)
as
select
  e.id,
  e.description,
  e.amount,
  e.expense_date,
  e.recurring_expense_id,
  e.created_at,
  e.created_by,
  coalesce(sum(p.amount), 0)::numeric(12,2) as paid_total,
  greatest(e.amount - coalesce(sum(p.amount), 0), 0)::numeric(12,2) as pending_total,
  case
    when coalesce(sum(p.amount), 0) = 0 then 'pending'
    when coalesce(sum(p.amount), 0) < e.amount then 'partial'
    else 'paid'
  end as status
from public.expenses e
left join public.payments p on p.expense_id = e.id
group by e.id;

create or replace view public.user_balances
with (security_invoker = true)
as
with assigned as (
  select u.id as user_id, u.name, u.active, coalesce(sum(ep.assigned_amount) filter (where e.expense_date <= ((now() at time zone 'Europe/Madrid')::date)),0)::numeric(12,2) as total_assigned
  from public.users u
  left join public.expense_participants ep on ep.user_id = u.id
  left join public.expenses e on e.id = ep.expense_id
  group by u.id, u.name, u.active
), paid as (
  select p.user_id, coalesce(sum(p.amount) filter (where e.expense_date <= ((now() at time zone 'Europe/Madrid')::date)),0)::numeric(12,2) as total_paid
  from public.payments p
  join public.expenses e on e.id = p.expense_id
  group by p.user_id
)
select a.user_id, a.name, a.active, a.total_assigned, coalesce(p.total_paid,0)::numeric(12,2) as total_paid, (coalesce(p.total_paid,0)-a.total_assigned)::numeric(12,2) as balance
from assigned a left join paid p on p.user_id = a.user_id;

-- Direct reads are intentionally shared because the application has no Supabase Auth identity.
alter table public.users enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.recurring_expense_participants enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;
alter table public.payments enable row level security;
alter table public.audit_log enable row level security;

create policy "anon can read users" on public.users for select to anon, authenticated using (true);
create policy "anon can read recurrences" on public.recurring_expenses for select to anon, authenticated using (true);
create policy "anon can read recurrence participants" on public.recurring_expense_participants for select to anon, authenticated using (true);
create policy "anon can read expenses" on public.expenses for select to anon, authenticated using (true);
create policy "anon can read participants" on public.expense_participants for select to anon, authenticated using (true);
create policy "anon can read payments" on public.payments for select to anon, authenticated using (true);
create policy "anon can read audit" on public.audit_log for select to anon, authenticated using (true);

revoke insert, update, delete on public.users from anon, authenticated;
revoke insert, update, delete on public.recurring_expenses from anon, authenticated;
revoke insert, update, delete on public.recurring_expense_participants from anon, authenticated;
revoke insert, update, delete on public.expenses from anon, authenticated;
revoke insert, update, delete on public.expense_participants from anon, authenticated;
revoke insert, update, delete on public.payments from anon, authenticated;
revoke insert, update, delete on public.audit_log from anon, authenticated;

grant select on public.users, public.recurring_expenses, public.recurring_expense_participants, public.expenses, public.expense_participants, public.payments, public.audit_log to anon, authenticated;
grant select on public.expense_summaries, public.user_balances to anon, authenticated;

-- RPCs are the only write surface exposed to the browser.
-- Grant/revoke each overload explicitly so migration behavior is deterministic.
revoke execute on function public.create_user(text, uuid) from public, authenticated, anon;
grant execute on function public.create_user(text, uuid) to anon;

revoke execute on function public.deactivate_user(uuid, uuid) from public, authenticated, anon;
grant execute on function public.deactivate_user(uuid, uuid) to anon;

revoke execute on function public.create_expense(text, numeric, date, jsonb, jsonb, jsonb, uuid) from public, authenticated, anon;
grant execute on function public.create_expense(text, numeric, date, jsonb, jsonb, jsonb, uuid) to anon;

revoke execute on function public.create_payment(uuid, uuid, numeric, timestamptz, uuid) from public, authenticated, anon;
grant execute on function public.create_payment(uuid, uuid, numeric, timestamptz, uuid) to anon;

revoke execute on function public.update_payment(uuid, numeric, uuid) from public, authenticated, anon;
grant execute on function public.update_payment(uuid, numeric, uuid) to anon;

revoke execute on function public.delete_payment(uuid, uuid) from public, authenticated, anon;
grant execute on function public.delete_payment(uuid, uuid) to anon;

revoke execute on function public.pay_remaining_amount(uuid, uuid, uuid) from public, authenticated, anon;
grant execute on function public.pay_remaining_amount(uuid, uuid, uuid) to anon;

revoke execute on function public.delete_expense(uuid, uuid) from public, authenticated, anon;
grant execute on function public.delete_expense(uuid, uuid) to anon;

revoke execute on function public.toggle_recurring_expense(uuid, boolean, uuid) from public, authenticated, anon;
grant execute on function public.toggle_recurring_expense(uuid, boolean, uuid) to anon;

revoke execute on function public.require_active_user(uuid) from public, anon, authenticated;
revoke execute on function public.split_amount(numeric, uuid[]) from public, anon, authenticated;
revoke execute on function public.next_recurrence_date(public.recurrence_frequency, date) from public, anon, authenticated;
revoke execute on function public.generate_recurring_expenses(date) from public, anon, authenticated;
grant execute on function public.generate_recurring_expenses(date) to postgres;

-- Supabase Cron: daily at 00:05 UTC; the function uses Europe/Madrid to define the business date.
select cron.schedule(
  'generate-recurring-expenses',
  '5 0 * * *',
  $$select public.generate_recurring_expenses((now() at time zone 'Europe/Madrid')::date);$$
);

-- Optional health probe used by the setup screen.
create or replace function public.health_check()
returns boolean
language sql
security definer
set search_path = ''
as $$ select true; $$;
revoke execute on function public.health_check() from public, authenticated;
grant execute on function public.health_check() to anon;
