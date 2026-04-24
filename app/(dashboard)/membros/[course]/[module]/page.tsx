import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Handwritten } from "@/components/handwritten";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, PlayCircle, Clock, CheckCircle2 } from "lucide-react";

export const revalidate = 300;

type Course = {
  id: string;
  slug: string;
  title: string;
  cover_from: string;
  cover_to: string;
};

type Module = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  banner_emoji: string | null;
};

type Lesson = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_seconds: number;
  order_index: number;
};

export default async function ModulePage({
  params
}: {
  params: Promise<{ course: string; module: string }>;
}) {
  const { course: courseSlug, module: moduleSlug } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, cover_from, cover_to")
    .eq("slug", courseSlug)
    .maybeSingle();

  if (!course) notFound();
  const c = course as Course;

  const { data: mod } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", c.id)
    .eq("slug", moduleSlug)
    .maybeSingle();

  if (!mod) notFound();
  const m = mod as Module;

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("module_id", m.id)
    .order("order_index", { ascending: true });

  const list = (lessons ?? []) as Lesson[];
  const totalDuration = list.reduce((sum, l) => sum + l.duration_seconds, 0);
  const hours = Math.floor(totalDuration / 3600);
  const minutes = Math.floor((totalDuration % 3600) / 60);
  const durationLabel = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

  return (
    <div className="flex flex-col gap-8">
      <Link
        href={`/membros/${c.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-200 hover:text-accent-gold w-fit transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para {c.title}
      </Link>

      {/* Banner do módulo */}
      <section
        className="relative overflow-hidden rounded-2xl border border-brand-700 px-6 py-10 sm:px-10 sm:py-14 shadow-xl shadow-black/40"
        style={{
          background: `linear-gradient(135deg, ${c.cover_from}, ${c.cover_to})`
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,161,75,0.2),transparent_55%)] pointer-events-none" />
        {m.banner_emoji && (
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-[200px] opacity-10 leading-none select-none">
            {m.banner_emoji}
          </div>
        )}
        <div className="relative max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-gold">
            {c.title}
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-ink-50 tracking-tight">
            {m.title}
          </h1>
          {m.description && (
            <Handwritten size="md" className="mt-4">
              {m.description}
            </Handwritten>
          )}
          <div className="mt-6 flex items-center gap-4 text-sm text-ink-200">
            <span className="flex items-center gap-1.5">
              <PlayCircle className="h-4 w-4 text-accent-gold" />
              {list.length} aula{list.length !== 1 && "s"}
            </span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-accent-gold" />
                {durationLabel}
              </span>
            )}
          </div>
        </div>
      </section>

      <div>
        <h2 className="text-xl font-semibold text-ink-50">Aulas</h2>
        <p className="text-sm text-ink-300 mt-1">
          Na ordem sugerida, mas pode assistir como preferir
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-ink-300">Nenhuma aula neste módulo ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((lesson, idx) => (
            <LessonRow key={lesson.id} lesson={lesson} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

function LessonRow({ lesson, index }: { lesson: Lesson; index: number }) {
  const mins = Math.round(lesson.duration_seconds / 60);
  // TODO: marcar como assistida quando integrarmos com progress tracking
  const watched = false;

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-brand-800 bg-brand-900 p-4 hover:border-accent-gold/30 hover:shadow-lg hover:shadow-black/30 transition-all">
      <div className="relative shrink-0">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-800 ring-1 ring-brand-700 group-hover:bg-brand-700 group-hover:ring-accent-gold/40 transition-colors">
          {watched ? (
            <CheckCircle2 className="h-6 w-6 text-accent-gold" />
          ) : (
            <PlayCircle className="h-6 w-6 text-ink-200 group-hover:text-accent-gold transition-colors" />
          )}
        </div>
        <span className="absolute -top-1.5 -left-1.5 text-[10px] font-semibold bg-brand-950 text-accent-gold rounded-full h-5 w-5 flex items-center justify-center ring-1 ring-brand-700">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink-50 truncate">{lesson.title}</p>
        {lesson.description && (
          <p className="text-sm text-ink-300 mt-0.5 line-clamp-1">{lesson.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {mins > 0 && (
          <span className="text-xs text-ink-300 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {mins} min
          </span>
        )}
        <button
          type="button"
          className="h-9 px-3 rounded-lg bg-accent-gold text-brand-950 text-sm font-semibold hover:brightness-110 transition-all"
          disabled
          title="Player em breve"
        >
          Assistir
        </button>
      </div>
    </div>
  );
}
