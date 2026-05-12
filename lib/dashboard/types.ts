export type PresetKey = "7d" | "30d" | "90d" | "month" | "custom";

export type Period = {
  /** ISO date "YYYY-MM-DD" inclusive */
  from: string;
  /** ISO date "YYYY-MM-DD" inclusive */
  until: string;
  preset: PresetKey;
};

export type VendasMetrics = {
  resultado: number;
  investimento: number;
  roas: number;
  cpm: number;
  cpa: number;
  imposto: number;
  impostoPct: number;
  plataforma: number;
  platPct: number;
  custosManuais: number;
  lucroReal: number;
};

export type DistribuicaoCurso = { course: string; alunos: number };
export type HeatmapDay = { date: string; count: number };

export type AlunosMetrics = {
  ativos: number;
  novos: number;
  progressaoMedia: number;
  taxaConclusao: number;
  churn: number;
  tempoPrimeiraAula: number;
  distribuicao: DistribuicaoCurso[];
  heatmap: HeatmapDay[];
};
