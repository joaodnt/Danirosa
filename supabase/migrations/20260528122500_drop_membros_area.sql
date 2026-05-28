-- =====================================================
-- Drop "Área de membros" — tabelas, funções dependentes,
-- bucket de storage e políticas.
--
-- Pós-efeito: as funções dashboard_progressao_media e
-- dashboard_taxa_conclusao deixam de existir. A página
-- /dashboard/alunos usa Promise.allSettled e retorna 0
-- nos cards correspondentes — sem quebra de UI, mas as
-- métricas dependem de uma futura modelagem.
-- =====================================================

-- 1) Funções que dependem das tabelas
drop function if exists public.dashboard_progressao_media();
drop function if exists public.dashboard_taxa_conclusao();

-- 2) Tabelas (CASCADE remove FKs e índices em cascata)
drop table if exists public.lessons cascade;
drop table if exists public.modules cascade;
drop table if exists public.courses cascade;

-- 3) Storage: esvaziar e remover bucket de capas
delete from storage.objects where bucket_id = 'course-covers';

drop policy if exists "Public can read course covers" on storage.objects;
drop policy if exists "Authenticated can upload course covers" on storage.objects;
drop policy if exists "Authenticated can update course covers" on storage.objects;
drop policy if exists "Authenticated can delete course covers" on storage.objects;

delete from storage.buckets where id = 'course-covers';
