-- =====================================================
-- Schema do painel Dani Rosa
-- Executar no SQL Editor do Supabase
-- =====================================================

-- Perfis de usuário (capturado no primeiro login)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated using (id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated using (id = auth.uid());

-- Tabela de alunos
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  course text,
  status text not null default 'active' check (status in ('active', 'inactive', 'churned')),
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists students_status_idx on public.students(status);
create index if not exists students_enrolled_at_idx on public.students(enrolled_at desc);

-- Tabela para cachear métricas diárias (opcional — alternativa ao fetch ao vivo)
create table if not exists public.traffic_metrics (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('meta', 'google')),
  date date not null,
  spend numeric(10,2) not null default 0,
  revenue numeric(10,2) not null default 0,
  impressions integer not null default 0,
  clicks integer not null default 0,
  conversions integer not null default 0,
  created_at timestamptz not null default now(),
  unique (source, date)
);

create index if not exists traffic_metrics_date_idx on public.traffic_metrics(date desc);

-- Compras/pedidos dos alunos
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  product_name text not null,
  amount numeric(10,2) not null,
  status text not null default 'paid' check (status in ('paid', 'refunded', 'pending', 'chargeback')),
  payment_method text,
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists orders_student_idx on public.orders(student_id);
create index if not exists orders_purchased_at_idx on public.orders(purchased_at desc);

-- Eventos de trackeamento do aluno
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  event_type text not null,
  description text,
  metadata jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists activities_student_idx on public.activities(student_id);
create index if not exists activities_occurred_at_idx on public.activities(occurred_at desc);

-- Área de membros: cursos, módulos e aulas
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  cover_url text,
  cover_from text default '#2D3E24',
  cover_to text default '#0A0D0A',
  cover_emoji text,
  tagline text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- Garantir coluna para instalações antigas
alter table public.courses add column if not exists cover_url text;
create index if not exists courses_order_idx on public.courses(order_index);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  banner_emoji text,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  unique (course_id, slug)
);
create index if not exists modules_course_idx on public.modules(course_id, order_index);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  video_url text,
  duration_seconds int not null default 0,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  unique (module_id, slug)
);
create index if not exists lessons_module_idx on public.lessons(module_id, order_index);

-- Concorrentes do Instagram (até 10 por usuário)
create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  display_name text,
  profile_pic_url text,
  followers_count integer,
  media_count integer,
  notes text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, username)
);

create index if not exists competitors_user_idx on public.competitors(user_id);

-- Enforça o limite de 10 concorrentes por usuário
create or replace function public.check_competitors_limit()
returns trigger as $$
begin
  if (select count(*) from public.competitors where user_id = new.user_id) >= 10 then
    raise exception 'Limite de 10 concorrentes atingido';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists enforce_competitors_limit on public.competitors;
create trigger enforce_competitors_limit
  before insert on public.competitors
  for each row execute function public.check_competitors_limit();

-- =====================================================
-- Row Level Security
-- Usuários autenticados podem ler. Nada é público.
-- Escritas só via service_role (backend/admin).
-- =====================================================

alter table public.students enable row level security;
alter table public.traffic_metrics enable row level security;
alter table public.competitors enable row level security;
alter table public.orders enable row level security;
alter table public.activities enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;

drop policy if exists "Authenticated users can read courses" on public.courses;
create policy "Authenticated users can read courses"
  on public.courses for select to authenticated using (true);

drop policy if exists "Authenticated users can read modules" on public.modules;
create policy "Authenticated users can read modules"
  on public.modules for select to authenticated using (true);

drop policy if exists "Authenticated users can read lessons" on public.lessons;
create policy "Authenticated users can read lessons"
  on public.lessons for select to authenticated using (true);

drop policy if exists "Authenticated users can read orders" on public.orders;
create policy "Authenticated users can read orders"
  on public.orders for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read activities" on public.activities;
create policy "Authenticated users can read activities"
  on public.activities for select
  to authenticated
  using (true);

drop policy if exists "Users can read their competitors" on public.competitors;
create policy "Users can read their competitors"
  on public.competitors for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert their competitors" on public.competitors;
create policy "Users can insert their competitors"
  on public.competitors for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their competitors" on public.competitors;
create policy "Users can update their competitors"
  on public.competitors for update
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can delete their competitors" on public.competitors;
create policy "Users can delete their competitors"
  on public.competitors for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Authenticated users can read students" on public.students;
create policy "Authenticated users can read students"
  on public.students for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read metrics" on public.traffic_metrics;
create policy "Authenticated users can read metrics"
  on public.traffic_metrics for select
  to authenticated
  using (true);

-- =====================================================
-- Seed opcional — remover em produção
-- =====================================================

insert into public.students (name, email, phone, course, status, enrolled_at)
values
  ('Maria Silva', 'maria@example.com', '+5511988887777', 'Mentoria Premium', 'active', now() - interval '12 days'),
  ('Ana Paula Souza', 'ana@example.com', '+5511977776666', 'Curso Express', 'active', now() - interval '30 days'),
  ('Juliana Costa', 'juliana@example.com', '+5511966665555', 'Mentoria Premium', 'active', now() - interval '5 days'),
  ('Carla Mendes', 'carla@example.com', '+5511955554444', 'Curso Express', 'inactive', now() - interval '90 days'),
  ('Beatriz Lima', 'bia@example.com', '+5511944443333', 'Mentoria Premium', 'active', now() - interval '2 days')
on conflict (email) do nothing;

-- Seed de pedidos
insert into public.orders (student_id, product_name, amount, status, payment_method, purchased_at)
select s.id, p.product_name, p.amount, 'paid', p.method, p.purchased_at
from public.students s
cross join lateral (values
  ('Mentoria Premium · 12 meses', 3997.00, 'credit_card', s.enrolled_at),
  ('E-book "Receitas veganas rápidas"', 47.00, 'pix', s.enrolled_at + interval '7 days'),
  ('Workshop "Finger food vegano"', 197.00, 'credit_card', s.enrolled_at + interval '14 days'),
  ('Pack de planners nutricionais', 97.00, 'pix', s.enrolled_at + interval '21 days')
) as p(product_name, amount, method, purchased_at)
where s.email in ('maria@example.com', 'ana@example.com', 'juliana@example.com', 'bia@example.com')
  and p.purchased_at <= now()
on conflict do nothing;

-- Migração: renomeia o curso antigo 'mentoria-premium' para 'escola-de-alquimistas'
update public.courses
set slug = 'escola-de-alquimistas',
    title = 'Escola de Alquimistas',
    subtitle = 'A cozinha vegetal como ofício sagrado',
    description = 'Imersão completa em técnicas, ingredientes e a arte de transformar vegetais em memórias afetivas.'
where slug = 'mentoria-premium';

-- Seed de cursos
insert into public.courses (slug, title, subtitle, description, cover_from, cover_to, cover_emoji, tagline, order_index)
values
  ('escola-de-alquimistas', 'Escola de Alquimistas',
   'A cozinha vegetal como ofício sagrado',
   'Imersão completa em técnicas, ingredientes e a arte de transformar vegetais em memórias afetivas.',
   '#2D3E24', '#0A0D0A', '🌿',
   'O prato é altar, e comer... comer é sagrado', 0),
  ('cozinha-plant-based', 'Cozinha Plant-Based do Zero',
   'A base que todo começo precisa',
   'Fundamentos, despensa, técnicas e receitas simples que mudam sua relação com a comida.',
   '#3A4A2E', '#1A1D17', '🥬',
   'Cuidar do que realmente importa', 1),
  ('finger-food-vegano', 'Finger Food Vegano',
   'O vegano que todo mundo gosta. Até os carnívoros.',
   'Canapés, bolinhos e petiscos de dar água na boca — perfeitos pra ocasiões especiais.',
   '#936221', '#402D1D', '🫓',
   'O lado sexy dos vegetais', 2),
  ('sobremesas-sem-derivados', 'Sobremesas Sem Derivados',
   'A doçura sem abrir mão do sabor',
   'Brigadeiros, brownies, tortas e mousses sem leite, ovos ou manteiga — puro amor em cada colherada.',
   '#C8A14B', '#402D1D', '🍫',
   'Comer é um gesto íntimo, quase secreto', 3)
on conflict (slug) do nothing;

-- Seed de módulos e aulas para cada curso
with course_alquimistas as (select id from public.courses where slug = 'escola-de-alquimistas'),
mod_inserts_alquimistas as (
  insert into public.modules (course_id, slug, title, description, banner_emoji, order_index)
  select (select id from course_alquimistas), m.slug, m.title, m.description, m.emoji, m.ord
  from (values
    ('fundamentos', 'Fundamentos', 'O ponto de partida: despensa, utensílios e mindset', '🌱', 0),
    ('proteinas-vegetais', 'Proteínas vegetais', 'Leguminosas, tofu, tempeh e seitan sem mistério', '💪', 1),
    ('temperos-e-sabores', 'Temperos e sabores', 'Ervas, especiarias e o segredo do dashi vegano', '🌶️', 2),
    ('pratos-principais', 'Pratos principais', 'Receitas cheias, nutritivas e bonitas de servir', '🍲', 3),
    ('sobremesas', 'Sobremesas', 'Fechando com chave de ouro (e cacau)', '🍰', 4)
  ) as m(slug, title, description, emoji, ord)
  on conflict (course_id, slug) do nothing
  returning id, slug, course_id
)
insert into public.lessons (module_id, slug, title, description, duration_seconds, order_index)
select m.id, l.slug, l.title, l.description, l.dur, l.ord
from mod_inserts_alquimistas m
cross join lateral (
  select * from (values
    ('boas-vindas', 'Boas-vindas', 'Como aproveitar a Escola ao máximo', 420, 0),
    ('montando-a-despensa', 'Montando a despensa', 'Os ingredientes que não podem faltar', 1080, 1),
    ('utensilios-essenciais', 'Utensílios essenciais', 'O que vale investir e o que não precisa', 780, 2),
    ('planejamento-semanal', 'Planejamento semanal', 'Poupe tempo e dinheiro com um bom plano', 960, 3)
  ) as fund(slug, title, description, dur, ord) where m.slug = 'fundamentos'
  union all
  select * from (values
    ('leguminosas-sem-medo', 'Leguminosas sem medo', 'Feijão, grão, lentilha e ervilha', 840, 0),
    ('tofu-na-pratica', 'Tofu na prática', '5 formas diferentes de usar', 1200, 1),
    ('tempeh-e-seitan', 'Tempeh e seitan', 'Sabores marcantes e textura perfeita', 1500, 2)
  ) as prot(slug, title, description, dur, ord) where m.slug = 'proteinas-vegetais'
  union all
  select * from (values
    ('ervas-frescas', 'Ervas frescas', 'Quando e como usar cada uma', 600, 0),
    ('especiarias-do-mundo', 'Especiarias do mundo', 'Um tour pelo sabor', 1020, 1),
    ('dashi-vegano', 'Dashi vegano', 'O caldo mágico que muda tudo', 720, 2)
  ) as temp(slug, title, description, dur, ord) where m.slug = 'temperos-e-sabores'
  union all
  select * from (values
    ('strogonoff-de-grao', 'Strogonoff de grão-de-bico', 'O clássico reinventado', 1140, 0),
    ('feijoada-vegana', 'Feijoada vegana', 'Gosto de domingo sem culpa', 1860, 1),
    ('risoto-de-funghi', 'Risoto de funghi', 'Cremosidade sem laticínios', 1320, 2),
    ('lasanha-de-abobrinha', 'Lasanha de abobrinha', 'Leveza com sabor de afeto', 1560, 3)
  ) as prat(slug, title, description, dur, ord) where m.slug = 'pratos-principais'
  union all
  select * from (values
    ('brigadeiro-de-colher', 'Brigadeiro de colher', 'O amor brasileiro em versão plant-based', 480, 0),
    ('mousse-de-chocolate', 'Mousse de chocolate', 'Cremosa com abacate (sim, funciona!)', 540, 1),
    ('torta-de-limao', 'Torta de limão', 'Azedinha na medida certa', 900, 2)
  ) as sob(slug, title, description, dur, ord) where m.slug = 'sobremesas'
) l
on conflict (module_id, slug) do nothing;

with course_base as (select id from public.courses where slug = 'cozinha-plant-based'),
mod_inserts_base as (
  insert into public.modules (course_id, slug, title, description, banner_emoji, order_index)
  select (select id from course_base), m.slug, m.title, m.description, m.emoji, m.ord
  from (values
    ('introducao', 'Introdução', 'Por onde começar sem se perder', '🌿', 0),
    ('cafe-da-manha', 'Café da manhã', 'Abrindo o dia com o pé direito', '☕', 1),
    ('almoco-e-jantar', 'Almoço e jantar', 'Receitas para o dia a dia', '🍛', 2)
  ) as m(slug, title, description, emoji, ord)
  on conflict (course_id, slug) do nothing
  returning id, slug
)
insert into public.lessons (module_id, slug, title, description, duration_seconds, order_index)
select m.id, l.slug, l.title, l.description, l.dur, l.ord
from mod_inserts_base m
cross join lateral (
  select * from (values
    ('primeiro-passo', 'Seu primeiro passo', 'Como transformar a cozinha sem sofrimento', 720, 0),
    ('mitos-e-verdades', 'Mitos e verdades', 'Respondendo o que todo mundo pergunta', 900, 1)
  ) as intro(slug, title, description, dur, ord) where m.slug = 'introducao'
  union all
  select * from (values
    ('panqueca-de-banana', 'Panqueca de banana', '3 ingredientes, 5 minutos', 360, 0),
    ('granola-caseira', 'Granola caseira', 'Crocante e do jeito que você gosta', 480, 1),
    ('iogurte-de-castanha', 'Iogurte de castanhas', 'Cremoso e sem lactose', 780, 2)
  ) as cafe(slug, title, description, dur, ord) where m.slug = 'cafe-da-manha'
  union all
  select * from (values
    ('arroz-e-lentilha', 'Arroz e lentilha', 'O combo perfeito de proteína', 600, 0),
    ('sopa-de-capim', 'Sopa detox verde', 'Simples e revigorante', 720, 1)
  ) as alm(slug, title, description, dur, ord) where m.slug = 'almoco-e-jantar'
) l
on conflict (module_id, slug) do nothing;

with course_finger as (select id from public.courses where slug = 'finger-food-vegano'),
mod_inserts_finger as (
  insert into public.modules (course_id, slug, title, description, banner_emoji, order_index)
  select (select id from course_finger), m.slug, m.title, m.description, m.emoji, m.ord
  from (values
    ('canapes', 'Canapés', 'Elegantes e rápidos', '🍃', 0),
    ('bolinhos-e-croquetes', 'Bolinhos & croquetes', 'O sucesso da festa', '🧆', 1)
  ) as m(slug, title, description, emoji, ord)
  on conflict (course_id, slug) do nothing
  returning id, slug
)
insert into public.lessons (module_id, slug, title, description, duration_seconds, order_index)
select m.id, l.slug, l.title, l.description, l.dur, l.ord
from mod_inserts_finger m
cross join lateral (
  select * from (values
    ('bruschetta-de-tomate', 'Bruschetta de tomate', 'Clássica italiana', 420, 0),
    ('pate-de-tofu', 'Patê de tofu defumado', 'Para impressionar', 540, 1)
  ) as can(slug, title, description, dur, ord) where m.slug = 'canapes'
  union all
  select * from (values
    ('bolinho-de-brocolis', 'Bolinho de brócolis', 'Crocante por fora, fofinho por dentro', 660, 0),
    ('croquete-de-ervilha', 'Croquete de ervilha', 'Tradicional reinventado', 780, 1)
  ) as bol(slug, title, description, dur, ord) where m.slug = 'bolinhos-e-croquetes'
) l
on conflict (module_id, slug) do nothing;

with course_sobr as (select id from public.courses where slug = 'sobremesas-sem-derivados'),
mod_inserts_sobr as (
  insert into public.modules (course_id, slug, title, description, banner_emoji, order_index)
  select (select id from course_sobr), m.slug, m.title, m.description, m.emoji, m.ord
  from (values
    ('docinhos', 'Docinhos de festa', 'Pra forminha e pra colher', '🍬', 0),
    ('tortas-e-bolos', 'Tortas & bolos', 'Fofos e úmidos sem ovo nem leite', '🎂', 1)
  ) as m(slug, title, description, emoji, ord)
  on conflict (course_id, slug) do nothing
  returning id, slug
)
insert into public.lessons (module_id, slug, title, description, duration_seconds, order_index)
select m.id, l.slug, l.title, l.description, l.dur, l.ord
from mod_inserts_sobr m
cross join lateral (
  select * from (values
    ('brigadeiro-vegano', 'Brigadeiro vegano', 'Ninguém desconfia', 420, 0),
    ('beijinho-de-coco', 'Beijinho de coco', 'O preferido das crianças', 360, 1),
    ('trufa-de-tahine', 'Trufa de tahine', 'Elegante e diferente', 540, 2)
  ) as doc(slug, title, description, dur, ord) where m.slug = 'docinhos'
  union all
  select * from (values
    ('bolo-de-cenoura', 'Bolo de cenoura', 'Com cobertura de brigadeiro', 960, 0),
    ('torta-de-maca', 'Torta de maçã', 'Perfumada e reconfortante', 1080, 1)
  ) as tor(slug, title, description, dur, ord) where m.slug = 'tortas-e-bolos'
) l
on conflict (module_id, slug) do nothing;

-- Seed de atividades / trackeamento
insert into public.activities (student_id, event_type, description, occurred_at)
select s.id, a.event_type, a.description, a.occurred_at
from public.students s
cross join lateral (values
  ('login', 'Acesso ao painel de aulas', now() - interval '1 day'),
  ('lesson_viewed', 'Módulo 3 — Temperos que fazem milagre', now() - interval '2 days'),
  ('lesson_completed', 'Módulo 2 — Proteínas vegetais na prática', now() - interval '3 days'),
  ('email_opened', 'Newsletter semanal aberta', now() - interval '4 days'),
  ('purchase', 'Workshop "Finger food vegano"', s.enrolled_at + interval '14 days'),
  ('signup', 'Matrícula confirmada', s.enrolled_at)
) as a(event_type, description, occurred_at)
where s.email in ('maria@example.com', 'ana@example.com', 'juliana@example.com', 'bia@example.com')
  and a.occurred_at <= now()
on conflict do nothing;
