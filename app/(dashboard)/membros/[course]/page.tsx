import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Handwritten } from "@/components/handwritten";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, PlayCircle, Clock, Layers, ArrowRight } from "lucide-react";

export const revalidate = 300;

type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  cover_from: string;
  cover_to: string;
  cover_emoji: string | null;
  tagline: string | null;
};

type Module = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  banner_emoji: string | null;
  order_index: number;
};

type LessonMini = {
  module_id: string;
  duration_seconds: number;
};

export default async function CoursePage({
  params
}: {
  params: Promise<{ course: string }>;
}) {
  const { course: courseSlug } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", courseSlug)
    .maybeSingle();

  if (!course) notFound();

  const c = course as Course;

  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", c.id)
    .order("order_index", { ascending: true });

  const mods = (modules ?? []) as Module[];
  const modIds = mods.map((m) => m.id);

  const { data: lessonsMini } =
    modIds.length > 0
      ? await supabase
          .from("lessons")
          .select("module_id, duration_seconds")
          .in("module_id", modIds)
      : { data: [] as LessonMini[] };

  const perModule: Record<string, { count: number; duration: number }> = {};
  (lessonsMini ?? []).forEach((l: LessonMini) => {
    const cur = perModule[l.module_id] ?? { count: 0, duration: 0 };
    perModule[l.module_id] = {
      count: cur.count + 1,
      duration: cur.duration + Number(l.duration_seconds)
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/membros"
        className="inline-flex items-center gap-1.5 text-sm text-ink-200 hover:text-accent-gold w-fit transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para a área de membros
      </Link>

      {/* Banner do curso */}
      <section
        className="relative overflow-hidden rounded-2xl border border-brand-700 px-6 py-10 sm:px-10 sm:py-14 shadow-xl shadow-black/40"
        style={
          c.cover_url
            ? undefined
            : { background: `linear-gradient(135deg, ${c.cover_from}, ${c.cover_to})` }
        }
      >
        {c.cover_url && (
          <>
            <img
              src={c.cover_url}
              alt={c.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-brand-950/85 via-brand-950/60 to-brand-900/90" />
          </>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,161,75,0.2),transparent_55%)] pointer-events-none" />
        {!c.cover_url && c.cover_emoji && (
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-[240px] opacity-10 leading-none select-none">
            {c.cover_emoji}
          </div>
        )}
        <div className="relative max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-gold">
            Curso
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-ink-50 tracking-tight">
            {c.title}
          </h1>
          {c.subtitle && (
            <p className="mt-2 text-base text-ink-100">{c.subtitle}</p>
          )}
          {c.tagline && (
            <Handwritten size="lg" className="mt-5">
              {c.tagline}
            </Handwritten>
          )}
          {c.description && (
            <p className="mt-4 text-sm text-ink-200 max-w-lg">{c.description}</p>
          )}
          <div className="mt-6 flex items-center gap-4 text-sm text-ink-200">
            <span className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-accent-gold" />
              {mods.length} módulo{mods.length !== 1 && "s"}
            </span>
            <span className="flex items-center gap-1.5">
              <PlayCircle className="h-4 w-4 text-accent-gold" />
              {lessonsMini?.length ?? 0} aulas
            </span>
          </div>
        </div>
      </section>

      <div>
        <h2 className="text-xl font-semibold text-ink-50">Módulos</h2>
        <p className="text-sm text-ink-300 mt-1">
          Clique em um módulo pra acessar as aulas
        </p>
      </div>

      {mods.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-ink-300">
              Nenhum módulo cadastrado neste curso ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {mods.map((m, idx) => (
            <ModuleCard
              key={m.id}
              course={c}
              module={m}
              index={idx}
              stats={perModule[m.id] ?? { count: 0, duration: 0 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  course,
  module: mod,
  index,
  stats
}: {
  course: Course;
  module: Module;
  index: number;
  stats: { count: number; duration: number };
}) {
  const hours = Math.floor(stats.duration / 3600);
  const minutes = Math.floor((stats.duration % 3600) / 60);
  const durationLabel = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

  return (
    <Link
      href={`/membros/${course.slug}/${mod.slug}`}
      className="group relative overflow-hidden rounded-2xl border border-brand-800 bg-brand-900 p-6 hover:border-accent-gold/40 hover:shadow-lg hover:shadow-black/40 transition-all"
    >
      <div className="absolute -right-4 -bottom-4 text-7xl opacity-10 select-none">
        {mod.banner_emoji}
      </div>
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-800 ring-1 ring-brand-700 text-lg shrink-0">
          {mod.banner_emoji ?? "📖"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-accent-gold font-medium">
            Módulo {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-0.5 font-semibold text-ink-50 text-lg leading-tight">
            {mod.title}
          </h3>
          {mod.description && (
            <p className="text-sm text-ink-300 mt-1 line-clamp-2">{mod.description}</p>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-ink-300">
            <span className="flex items-center gap-1">
              <PlayCircle className="h-3.5 w-3.5" />
              {stats.count} aula{stats.count !== 1 && "s"}
            </span>
            {stats.duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {durationLabel}
              </span>
            )}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-ink-300 group-hover:text-accent-gold group-hover:translate-x-1 transition-all shrink-0" />
      </div>
    </Link>
  );
}
