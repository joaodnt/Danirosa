-- =====================================================
-- Storage: bucket para capas de cursos
-- Execute no SQL Editor do Supabase
-- =====================================================

-- Cria bucket público (leitura pública, upload só autenticado)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-covers',
  'course-covers',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- Políticas do bucket
drop policy if exists "Public can read course covers" on storage.objects;
create policy "Public can read course covers"
  on storage.objects for select
  using (bucket_id = 'course-covers');

drop policy if exists "Authenticated can upload course covers" on storage.objects;
create policy "Authenticated can upload course covers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'course-covers');

drop policy if exists "Authenticated can update course covers" on storage.objects;
create policy "Authenticated can update course covers"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'course-covers');

drop policy if exists "Authenticated can delete course covers" on storage.objects;
create policy "Authenticated can delete course covers"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'course-covers');
