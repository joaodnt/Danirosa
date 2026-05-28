// MOCKUP — Fase 1 design preview. Estado client-side, sem backend. Remover apos aprovacao do spec.
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Send,
  Save,
  Smartphone,
  Users,
  Tag,
  MousePointerClick,
  Info
} from "lucide-react";

type Template = {
  name: string;
  category: "MARKETING" | "UTILITY";
  body: string;
  vars: number;
  costEstimate: number;
};

const templates: Template[] = [
  {
    name: "lancamento_curso_v2",
    category: "MARKETING",
    body: "Oi {{1}}, tudo bem? Hoje as {{2}} a gente abre uma nova turma do curso. So tem 50 vagas e a primeira chamada e pra voce. Quer entrar?",
    vars: 2,
    costEstimate: 0.28
  },
  {
    name: "lembrete_live",
    category: "MARKETING",
    body: "Oi {{1}}, lembrete: nossa live de hoje as 20h e sobre como mudar a base da sua alimentacao. Te espero la.",
    vars: 1,
    costEstimate: 0.28
  },
  {
    name: "turma_aberta",
    category: "UTILITY",
    body: "Oi {{1}}! A turma de fevereiro acabou de abrir. Voce esta na lista de espera, entao garantimos sua vaga ate amanha.",
    vars: 1,
    costEstimate: 0.04
  }
];

const audiences = [
  { id: "all", label: "Todos com opt-in", count: 1847 },
  { id: "tag:aluna", label: "Tag: aluna", count: 612 },
  { id: "tag:lead", label: "Tag: lead", count: 1098 },
  { id: "tag:vip", label: "Tag: vip", count: 84 }
];

const contactFields = [
  { value: "name", label: "Nome" },
  { value: "first_name", label: "Primeiro nome" },
  { value: "phone", label: "Telefone" }
];

type VarMapping = { kind: "field" | "literal"; value: string };

const sampleContacts = [
  { name: "Maria Silva", phone: "+55 11 99812-3456" },
  { name: "Joao Pereira", phone: "+55 21 98765-4321" },
  { name: "Ana Costa", phone: "+55 31 97123-8899" }
];

export default function NovoBroadcastPage() {
  const [name, setName] = useState("Lancamento turma de junho");
  const [templateName, setTemplateName] = useState(templates[0].name);
  const [audience, setAudience] = useState("all");
  const [mappings, setMappings] = useState<VarMapping[]>([
    { kind: "field", value: "first_name" },
    { kind: "literal", value: "18h" }
  ]);

  const template = useMemo(
    () => templates.find((t) => t.name === templateName)!,
    [templateName]
  );

  const audienceData = audiences.find((a) => a.id === audience)!;
  const estimatedCost = audienceData.count * template.costEstimate;

  function renderBody(values: string[]) {
    return template.body.replace(/\{\{(\d+)\}\}/g, (_, n) => {
      const idx = parseInt(n, 10) - 1;
      return values[idx] ?? `{{${n}}}`;
    });
  }

  function resolveForContact(contact: { name: string; phone: string }) {
    return mappings.slice(0, template.vars).map((m) => {
      if (m.kind === "literal") return m.value;
      if (m.value === "name") return contact.name;
      if (m.value === "first_name") return contact.name.split(" ")[0];
      if (m.value === "phone") return contact.phone;
      return `{${m.value}}`;
    });
  }

  function updateMapping(i: number, patch: Partial<VarMapping>) {
    setMappings((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/whatsapp"
          className="inline-flex items-center gap-1.5 text-xs text-ink-300 hover:text-accent-gold mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar
        </Link>
        <h1 className="text-2xl font-semibold text-ink-50">Novo disparo</h1>
        <p className="text-sm text-ink-300">
          Passo a passo. Voce pode pre-visualizar antes de disparar.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-ink-50 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-accent-gold/15 text-accent-gold text-xs font-bold flex items-center justify-center ring-1 ring-accent-gold/40">
                  1
                </span>
                Identificacao
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-ink-300 mb-1.5">
                  Nome interno
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
                <p className="text-xs text-ink-300 mt-1">So aparece pra voce.</p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-ink-300 mb-1.5">
                  Template aprovado na Meta
                </label>
                <div className="space-y-2">
                  {templates.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => {
                        setTemplateName(t.name);
                        setMappings(
                          Array.from({ length: t.vars }, () => ({
                            kind: "field" as const,
                            value: "first_name"
                          }))
                        );
                      }}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        templateName === t.name
                          ? "border-accent-gold bg-accent-gold/5"
                          : "border-brand-800 hover:border-brand-700 bg-brand-900"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm text-ink-50">{t.name}</span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            t.category === "MARKETING"
                              ? "bg-accent-gold/10 text-accent-gold ring-1 ring-accent-gold/30"
                              : "bg-brand-700/30 text-brand-100 ring-1 ring-brand-600"
                          }`}
                        >
                          {t.category}
                        </span>
                      </div>
                      <p className="text-xs text-ink-300 line-clamp-1">{t.body}</p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {template.vars > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-ink-50 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-accent-gold/15 text-accent-gold text-xs font-bold flex items-center justify-center ring-1 ring-accent-gold/40">
                    2
                  </span>
                  Variaveis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: template.vars }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-brand-950/40 ring-1 ring-brand-800"
                  >
                    <span className="font-mono text-xs text-accent-gold w-12">
                      {`{{${i + 1}}}`}
                    </span>
                    <select
                      value={mappings[i]?.kind ?? "field"}
                      onChange={(e) =>
                        updateMapping(i, {
                          kind: e.target.value as "field" | "literal",
                          value: e.target.value === "field" ? "first_name" : ""
                        })
                      }
                      className="h-9 rounded-md bg-brand-900 border border-brand-700 text-sm px-2 text-ink-50"
                    >
                      <option value="field">Campo do contato</option>
                      <option value="literal">Texto fixo</option>
                    </select>
                    {mappings[i]?.kind === "field" ? (
                      <select
                        value={mappings[i].value}
                        onChange={(e) => updateMapping(i, { value: e.target.value })}
                        className="h-9 rounded-md bg-brand-900 border border-brand-700 text-sm px-2 text-ink-50 flex-1"
                      >
                        {contactFields.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={mappings[i].value}
                        onChange={(e) => updateMapping(i, { value: e.target.value })}
                        className="h-9 flex-1"
                        placeholder="Texto fixo..."
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-ink-50 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-accent-gold/15 text-accent-gold text-xs font-bold flex items-center justify-center ring-1 ring-accent-gold/40">
                  3
                </span>
                Audiencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {audiences.map((a) => (
                <label
                  key={a.id}
                  className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                    audience === a.id
                      ? "border-accent-gold bg-accent-gold/5"
                      : "border-brand-800 hover:border-brand-700 bg-brand-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="audience"
                      checked={audience === a.id}
                      onChange={() => setAudience(a.id)}
                      className="accent-accent-gold"
                    />
                    <div className="flex items-center gap-2">
                      {a.id === "all" ? (
                        <Users className="h-4 w-4 text-ink-300" />
                      ) : (
                        <Tag className="h-4 w-4 text-ink-300" />
                      )}
                      <span className="text-sm text-ink-50">{a.label}</span>
                    </div>
                  </div>
                  <span className="text-sm tabular-nums text-ink-200">
                    {a.count.toLocaleString("pt-BR")} contatos
                  </span>
                </label>
              ))}
              <label className="flex items-center justify-between rounded-lg border border-brand-800 p-3 cursor-pointer hover:border-brand-700 bg-brand-900">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="audience"
                    checked={audience === "manual"}
                    onChange={() => setAudience("manual")}
                    className="accent-accent-gold"
                  />
                  <div className="flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4 text-ink-300" />
                    <span className="text-sm text-ink-50">Selecao manual</span>
                  </div>
                </div>
                <span className="text-xs text-ink-300">escolher na lista</span>
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-ink-50 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-accent-gold" />
                Pre-visualizacao
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-[#0b141a] border border-brand-700 overflow-hidden">
                <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-accent-gold flex items-center justify-center text-brand-950 text-xs font-bold">
                    DR
                  </div>
                  <div>
                    <p className="text-xs text-white font-medium">Dani Rosa</p>
                    <p className="text-[10px] text-white/50">online</p>
                  </div>
                </div>
                <div className="px-4 py-5 min-h-[180px] bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%3E%3Crect%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22%230b141a%22%2F%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%220.5%22%20fill%3D%22%23ffffff10%22%2F%3E%3C%2Fsvg%3E')]">
                  <div className="max-w-[85%] bg-[#005c4b] rounded-lg rounded-tl-none px-3 py-2 shadow text-sm text-white whitespace-pre-line">
                    {renderBody(resolveForContact(sampleContacts[0]))}
                    <p className="text-[10px] text-white/60 mt-1 text-right">14:32 ✓✓</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-ink-300 mt-3 flex items-center gap-1.5">
                <Info className="h-3 w-3" />
                Renderizado para <strong className="text-ink-100">{sampleContacts[0].name}</strong>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-ink-50">
                Mais 2 exemplos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {sampleContacts.slice(1).map((c) => (
                <div key={c.phone} className="rounded-md bg-brand-950/50 ring-1 ring-brand-800 p-3">
                  <p className="text-ink-300 mb-1.5">
                    {c.name} <span className="font-mono text-ink-300">· {c.phone}</span>
                  </p>
                  <p className="text-ink-100 whitespace-pre-line leading-relaxed">
                    {renderBody(resolveForContact(c))}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="sticky bottom-4">
        <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-ink-50">
              <strong className="text-accent-gold tabular-nums">
                {audienceData.count.toLocaleString("pt-BR")}
              </strong>{" "}
              envios para audiencia <strong>{audienceData.label}</strong>
            </p>
            <p className="text-xs text-ink-300 mt-0.5">
              Custo estimado:{" "}
              <strong className="text-ink-100">
                R$ {estimatedCost.toFixed(2).replace(".", ",")}
              </strong>{" "}
              · template {template.category.toLowerCase()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Save className="h-4 w-4" />
              Salvar rascunho
            </Button>
            <Button>
              <Send className="h-4 w-4" />
              Disparar agora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
