-- Datos mínimos para explorar manualmente la aplicación local.
-- No se usan como fixtures de los tests: cada test crea sus propios datos.
insert into public.users (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Juan'),
  ('00000000-0000-0000-0000-000000000002', 'Pedro'),
  ('00000000-0000-0000-0000-000000000003', 'María')
on conflict (id) do nothing;
