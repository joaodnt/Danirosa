import { createClient } from "@/lib/supabase/server";
import type { Period, AlunosMetrics, DistribuicaoCurso, HeatmapDay } from "./types";

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function aggregateByCourse(rows: { course: string | null }[]): DistribuicaoCurso[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.course && r.course.trim() ? r.course : "Sem curso";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([course, alunos]) => ({ course, alunos }))
    .sort((a, b) => b.alunos - a.alunos);
}

function aggregateByDay(rows: { occurred_at: string }[]): HeatmapDay[] {
  const map = new Map<string, number>();
  // Pre-popula 30 dias zerados para o grid não ter buracos
  for (let i = 29; i >= 0; i--) {
    map.set(daysAgoIso(i), 0);
  }
  for (const r of rows) {
    const day = r.occurred_at.split("T")[0];
    if (map.has(day)) map.set(day, (map.get(day) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

export async function getAlunosMetrics(period: Period): Promise<AlunosMetrics> {
  const supabase = await createClient();
  const heatmapFrom = daysAgoIso(30);

  const [
    ativosRes,
    novosRes,
    progressaoRes,
    conclusaoRes,
    churnRes,
    tempoPrimeiraRes,
    distribuicaoRes,
    heatmapRes
  ] = await Promise.allSettled([
    supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .gte("enrolled_at", period.from)
      .lte("enrolled_at", period.until),
    supabase.rpc("dashboard_progressao_media"),
    supabase.rpc("dashboard_taxa_conclusao"),
    supabase.rpc("dashboard_churn"),
    supabase.rpc("dashboard_tempo_primeira_aula", {
      p_from: period.from,
      p_until: period.until
    }),
    supabase.from("students").select("course").eq("status", "active"),
    supabase
      .from("activities")
      .select("occurred_at")
      .gte("occurred_at", heatmapFrom)
  ]);

  function num(res: PromiseSettledResult<{ data: number | null } | { count: number | null }>): number {
    if (res.status !== "fulfilled") return 0;
    const v = (res.value as { data?: number | null; count?: number | null });
    return Number(v.data ?? v.count ?? 0);
  }

  function rows<T>(res: PromiseSettledResult<{ data: T[] | null }>): T[] {
    if (res.status !== "fulfilled") return [];
    return res.value.data ?? [];
  }

  return {
    ativos: num(ativosRes),
    novos: num(novosRes),
    progressaoMedia: num(progressaoRes) * 100, // function retorna fração (0..1)
    taxaConclusao: num(conclusaoRes),           // function já retorna %
    churn: num(churnRes),
    tempoPrimeiraAula: num(tempoPrimeiraRes),
    distribuicao: aggregateByCourse(rows<{ course: string | null }>(distribuicaoRes)),
    heatmap: aggregateByDay(rows<{ occurred_at: string }>(heatmapRes))
  };
}
