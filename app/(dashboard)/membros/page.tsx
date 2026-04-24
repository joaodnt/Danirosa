import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Handwritten } from "@/components/handwritten";
import { Card, CardContent } from "@/components/ui/card";
import { CoverUpload } from "./cover-upload";
import { BookOpen, PlayCircle, ArrowRight } from "lucide-react";

export const revalidate = 0;

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
  order_index: number;
};

export default async function MembrosPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("order_index", { ascending: true });

  const { data: modulesData } = await supabase.from("modules").select("course_id");
  const moduleCounts: Record<string, number> = {};
  (modulesData ?? []).forEach((m: { course_id: string }) => {
    moduleCounts[m.course_id] = (moduleCounts[m.course_id] ?? 0) + 1;
  });

  const list = (courses ?? []) as Course[];

  return (
    <div className="flex flex-col gap-8">
      {/* Banner principal */}
      <section className="relative overflow-hidden rounded-2xl border border-brand-700 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 px-6 py-10 sm:px-10 sm:py-14 shadow-xl shadow-black/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,161,75,0.2),transparent_55%)] pointer-events-none" />
        <div className="absolute -right-12 -top-12 text-[200px] opacity-[0.08] leading-none select-none">
          🌿
        </div>
        <div className="relative max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-gold">
            Área de membros
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-ink-50 tracking-tight">
            Seus cursos, na sua mesa.
          </h1>
          <Handwritten size="lg" className="mt-4">
            Cozinhar é uma arte. E cozinhar sem derivados animais é ainda mais gratificante.
          </Handwritten>
          <p className="mt-4 text-sm text-ink-200 max-w-lg">
            Tudo que você precisa pra transformar o jeito que cozinha — das bases aos pratos que
            deixam qualquer um de boca aberta.
          </p>
        </div>
      </section>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-ink-50 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent-gold" />
            Seus cursos
          </h2>
          <p className="text-sm text-ink-300 mt-1">
            {list.length} cursos · passe o mouse em um card para trocar a capa
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-ink-300">
              Nenhum curso cadastrado ainda. Rode o schema atualizado no Supabase.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <CourseCard key={c.id} course={c} moduleCount={moduleCounts[c.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, moduleCount }: { course: Course; moduleCount: number }) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-brand-800 bg-brand-900 overflow-hidden hover:border-accent-gold/40 hover:shadow-xl hover:shadow-black/40 transition-all">
      <CoverUpload
        courseId={course.id}
        slug={course.slug}
        hasCover={Boolean(course.cover_url)}
      />

      <Link href={`/membros/${course.slug}`} className="flex flex-col flex-1">
        <div
          className="relative aspect-[16/10] overflow-hidden"
          style={
            course.cover_url
              ? undefined
              : {
                  background: `linear-gradient(135deg, ${course.cover_from}, ${course.cover_to})`
                }
          }
        >
          {course.cover_url ? (
            <img
              src={course.cover_url}
              alt={course.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(200,161,75,0.25),transparent_60%)]" />
              {course.cover_emoji && (
                <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-90 group-hover:scale-110 transition-transform duration-500">
                  {course.cover_emoji}
                </div>
              )}
            </>
          )}
          <div className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-gold text-brand-950 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all">
            <PlayCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 flex flex-col gap-3 flex-1">
          <div>
            <h3 className="font-semibold text-ink-50 text-lg leading-tight">{course.title}</h3>
            {course.subtitle && (
              <p className="text-sm text-ink-200 mt-1">{course.subtitle}</p>
            )}
          </div>

          {course.description && (
            <p className="text-sm text-ink-300 line-clamp-2">{course.description}</p>
          )}

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-brand-800">
            <span className="text-xs text-ink-300">
              <strong className="text-accent-gold">{moduleCount}</strong> módulo{moduleCount !== 1 && "s"}
            </span>
            <span className="inline-flex items-center gap-1 text-sm text-accent-gold font-medium group-hover:gap-2 transition-all">
              Acessar <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
