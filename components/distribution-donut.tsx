"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { DistribuicaoCurso } from "@/lib/dashboard/types";
import { formatNumber } from "@/lib/utils";

const COLORS = ["#C8A14B", "#936221", "#3A4A2E", "#62644C", "#7C7F59", "#232011"];

type Props = { data: DistribuicaoCurso[] };

export function DistributionDonut({ data }: Props) {
  const total = data.reduce((s, d) => s + d.alunos, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-44 text-sm text-ink-300">
        Sem dados de alunos ativos
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="w-36 h-36 flex-shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="alunos"
              nameKey="course"
              innerRadius={40}
              outerRadius={70}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-2 text-xs">
        {data.slice(0, 6).map((d, i) => (
          <li key={d.course} className="flex items-center gap-2 text-ink-100">
            <span
              className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="truncate">{d.course}</span>
            <span className="ml-auto tabular-nums text-ink-300">
              {formatNumber(d.alunos)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
