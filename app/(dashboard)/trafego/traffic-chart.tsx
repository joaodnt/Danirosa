"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

const data = Array.from({ length: 30 }, (_, i) => {
  const day = new Date();
  day.setDate(day.getDate() - (29 - i));
  return {
    date: day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    investimento: Math.floor(120 + Math.random() * 80),
    vendas: Math.floor(400 + Math.random() * 400)
  };
});

export function TrafficChart() {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#232011" vertical={false} />
          <XAxis dataKey="date" stroke="#897F68" fontSize={12} tickMargin={8} />
          <YAxis stroke="#897F68" fontSize={12} tickMargin={8} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1A1D17",
              border: "1px solid #232011",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              color: "#DED2C6"
            }}
            labelStyle={{ color: "#C7C3B9" }}
          />
          <Legend wrapperStyle={{ color: "#C7C3B9" }} />
          <Line
            type="monotone"
            dataKey="investimento"
            stroke="#936221"
            strokeWidth={2}
            dot={false}
            name="Investimento (R$)"
          />
          <Line
            type="monotone"
            dataKey="vendas"
            stroke="#C8A14B"
            strokeWidth={2}
            dot={false}
            name="Vendas (R$)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
