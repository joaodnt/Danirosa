// MOCKUP — Fase 1 design preview. Dados estaticos. Remover apos aprovacao do spec.
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImportCSVButton } from "./_components/import-csv-dialog";
import {
  Send,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  MessageSquare
} from "lucide-react";

const broadcasts = [
  {
    id: "b-1",
    name: "Lancamento curso de risotos",
    template: "lancamento_curso_v2",
    sent: 1842,
    delivered: 1801,
    read: 1456,
    failed: 41,
    total: 1842,
    status: "completed",
    sentAt: "Hoje, 14:32"
  },
  {
    id: "b-2",
    name: "Lembrete live de quarta",
    template: "lembrete_live",
    sent: 892,
    delivered: 870,
    read: 612,
    failed: 22,
    total: 892,
    status: "completed",
    sentAt: "Ontem, 09:15"
  },
  {
    id: "b-3",
    name: "Reaberta turma de fevereiro",
    template: "turma_aberta",
    sent: 247,
    delivered: 0,
    read: 0,
    failed: 0,
    total: 1640,
    status: "sending",
    sentAt: "agora"
  }
];

const statusMap = {
  completed: { label: "Concluido", color: "text-accent-gold bg-brand-700/30 ring-brand-600", icon: CheckCircle2 },
  sending: { label: "Enviando", color: "text-brand-100 bg-brand-700/40 ring-brand-500 animate-pulse", icon: Clock },
  failed: { label: "Falhou", color: "text-red-300 bg-red-900/30 ring-red-700", icon: AlertCircle }
};

export default function WhatsAppHubPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">WhatsApp</h1>
          <p className="text-sm text-ink-300">
            Disparos via API oficial da Meta · numero +55 11 91234-5678
          </p>
        </div>
        <div className="flex gap-2">
          <ImportCSVButton variant="outline" label="Importar contatos" />
          <Link href="/whatsapp/broadcasts/novo">
            <Button>
              <Plus className="h-4 w-4" />
              Novo disparo
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricBox
          icon={Users}
          label="Contatos com opt-in"
          value="1.847"
          hint="+312 esse mes"
        />
        <MetricBox
          icon={Send}
          label="Enviadas (30d)"
          value="6.421"
          hint="3 disparos"
        />
        <MetricBox
          icon={CheckCircle2}
          label="Taxa de entrega"
          value="97,8%"
          hint="6.282 de 6.421"
        />
        <MetricBox
          icon={MessageSquare}
          label="Taxa de leitura"
          value="78,4%"
          hint="janela 24h"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-ink-50">
            Disparos recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-ink-300 border-b border-brand-800">
                <tr>
                  <th className="py-3 pr-4 font-medium">Nome</th>
                  <th className="py-3 pr-4 font-medium">Template</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium text-right">Progresso</th>
                  <th className="py-3 pr-4 font-medium text-right">Leitura</th>
                  <th className="py-3 pr-4 font-medium text-right">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-800">
                {broadcasts.map((b) => {
                  const s = statusMap[b.status as keyof typeof statusMap];
                  const Icon = s.icon;
                  const pct = Math.round((b.sent / b.total) * 100);
                  const readPct = b.delivered > 0 ? Math.round((b.read / b.delivered) * 100) : 0;
                  return (
                    <tr key={b.id} className="hover:bg-brand-900/40">
                      <td className="py-4 pr-4">
                        <Link
                          href={`/whatsapp/broadcasts/${b.id}`}
                          className="font-medium text-ink-50 hover:text-accent-gold"
                        >
                          {b.name}
                        </Link>
                      </td>
                      <td className="py-4 pr-4 font-mono text-xs text-ink-200">
                        {b.template}
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${s.color}`}
                        >
                          <Icon className="h-3 w-3" />
                          {s.label}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 h-1.5 rounded-full bg-brand-800 overflow-hidden">
                            <div
                              className="h-full bg-accent-gold transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-ink-200 tabular-nums w-16 text-right">
                            {b.sent.toLocaleString("pt-BR")}/{b.total.toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-right tabular-nums text-ink-100">
                        {b.delivered > 0 ? `${readPct}%` : "—"}
                      </td>
                      <td className="py-4 pr-4 text-right text-xs text-ink-300">
                        {b.sentAt}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-ink-50">
              Saude da conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <HealthRow label="Qualidade do numero" value="Alta" tone="good" />
            <HealthRow label="Tier de envio" value="1.000 conversas/dia" tone="good" />
            <HealthRow label="Templates aprovados" value="4 ativos" tone="good" />
            <HealthRow label="Webhook" value="conectado · ultimo evento ha 2min" tone="good" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-ink-50">
              Templates aprovados na Meta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-brand-800 -mt-2">
              {[
                { name: "lancamento_curso_v2", category: "MARKETING", vars: 2 },
                { name: "lembrete_live", category: "MARKETING", vars: 1 },
                { name: "turma_aberta", category: "UTILITY", vars: 1 },
                { name: "boas_vindas_aluno", category: "UTILITY", vars: 2 }
              ].map((t) => (
                <li key={t.name} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-mono text-sm text-ink-50">{t.name}</p>
                    <p className="text-xs text-ink-300">
                      {t.vars} variavel{t.vars > 1 ? "eis" : ""} · pt_BR
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      t.category === "MARKETING"
                        ? "bg-accent-gold/10 text-accent-gold ring-1 ring-accent-gold/30"
                        : "bg-brand-700/30 text-brand-100 ring-1 ring-brand-600"
                    }`}
                  >
                    {t.category}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  hint
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-brand-800 ring-1 ring-brand-700">
            <Icon className="h-4 w-4 text-accent-gold" />
          </div>
        </div>
        <p className="text-xs text-ink-300 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-semibold text-ink-50 mt-1 tabular-nums">{value}</p>
        <p className="text-xs text-ink-300 mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

function HealthRow({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "bad";
}) {
  const toneColor = {
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-red-500"
  }[tone];
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${toneColor}`} />
        <span className="text-ink-200">{label}</span>
      </div>
      <span className="text-ink-50 font-medium">{value}</span>
    </div>
  );
}
