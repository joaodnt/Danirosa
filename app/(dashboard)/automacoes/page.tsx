import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Handwritten } from "@/components/handwritten";
import { Zap, CheckCircle2, Clock, PauseCircle } from "lucide-react";

const automations = [
  {
    name: "Boas-vindas de novos alunos",
    description: "Dispara sequência de e-mails quando um aluno é matriculado",
    status: "active",
    runs: 142
  },
  {
    name: "Recuperação de carrinho",
    description: "Envia WhatsApp após 24h de carrinho abandonado",
    status: "active",
    runs: 87
  },
  {
    name: "Aniversário do aluno",
    description: "Mensagem personalizada + cupom no dia do aniversário",
    status: "paused",
    runs: 34
  },
  {
    name: "Feedback pós-aula",
    description: "Formulário NPS 7 dias após conclusão do módulo",
    status: "active",
    runs: 56
  }
];

const statusStyles = {
  active: { icon: CheckCircle2, color: "text-accent-gold bg-brand-700/30 ring-1 ring-brand-600", label: "Ativa" },
  paused: { icon: PauseCircle, color: "text-accent-terracotta bg-accent-terracotta/10 ring-1 ring-accent-terracotta/30", label: "Pausada" },
  scheduled: { icon: Clock, color: "text-brand-200 bg-brand-700/20 ring-1 ring-brand-600", label: "Agendada" }
};

export default function AutomacoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">Automações</h1>
          <p className="text-sm text-ink-300">
            Fluxos automáticos ativos na sua operação
          </p>
        </div>
        <Handwritten size="md" align="right">
          Cuidar do que realmente importa
        </Handwritten>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {automations.map((auto) => {
          const style = statusStyles[auto.status as keyof typeof statusStyles];
          const Icon = style.icon;
          return (
            <Card key={auto.name}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-700/40 ring-1 ring-brand-600">
                      <Zap className="h-5 w-5 text-accent-gold" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-ink-50">
                        {auto.name}
                      </CardTitle>
                      <p className="text-sm text-ink-300 mt-0.5">{auto.description}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.color}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {style.label}
                  </span>
                  <span className="text-sm text-ink-300">
                    <strong className="text-ink-50">{auto.runs}</strong> execuções este mês
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
