// MOCKUP — Fase 1 design preview. Dados estaticos. Remover apos aprovacao do spec.
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportCSVButton } from "../_components/import-csv-dialog";
import { Search, ArrowLeft, CheckCircle2, XCircle, Filter } from "lucide-react";

const contacts = [
  { name: "Maria Silva", phone: "+55 11 99812-3456", tags: ["aluna", "vip"], optIn: true, source: "csv:lancamento-marco.csv", addedAt: "12 mai" },
  { name: "Joao Pereira", phone: "+55 21 98765-4321", tags: ["lead"], optIn: true, source: "csv:lancamento-marco.csv", addedAt: "12 mai" },
  { name: "Ana Costa", phone: "+55 31 97123-8899", tags: ["aluna"], optIn: true, source: "csv:alunos-q1.csv", addedAt: "08 mai" },
  { name: "Carlos Mendes", phone: "+55 11 91234-5678", tags: ["lead", "vegetariano"], optIn: true, source: "csv:lancamento-marco.csv", addedAt: "12 mai" },
  { name: "Beatriz Rocha", phone: "+55 47 99887-7766", tags: ["aluna", "vip"], optIn: true, source: "csv:alunos-q1.csv", addedAt: "08 mai" },
  { name: "Pedro Almeida", phone: "+55 51 98321-4567", tags: ["lead"], optIn: false, source: "csv:lancamento-marco.csv", addedAt: "12 mai" },
  { name: "Luiza Tavares", phone: "+55 11 99765-1234", tags: ["aluna"], optIn: true, source: "manual", addedAt: "06 mai" },
  { name: "Rafael Souza", phone: "+55 31 97654-3210", tags: ["lead"], optIn: true, source: "csv:lancamento-marco.csv", addedAt: "12 mai" }
];

export default function ContatosPage() {
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
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-ink-50">Contatos</h1>
            <p className="text-sm text-ink-300">
              1.847 com opt-in · 142 sem opt-in · 23 opt-out
            </p>
          </div>
          <ImportCSVButton />
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
          <Input placeholder="Buscar por nome ou telefone..." className="pl-9" />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4" />
          Tags
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-ink-300 border-b border-brand-800">
              <tr>
                <th className="py-3 px-4 font-medium">Nome</th>
                <th className="py-3 px-4 font-medium">Telefone</th>
                <th className="py-3 px-4 font-medium">Tags</th>
                <th className="py-3 px-4 font-medium">Opt-in</th>
                <th className="py-3 px-4 font-medium">Origem</th>
                <th className="py-3 px-4 font-medium text-right">Adicionado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-800">
              {contacts.map((c) => (
                <tr key={c.phone} className="hover:bg-brand-900/40">
                  <td className="py-3 px-4 font-medium text-ink-50">{c.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-ink-200">{c.phone}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 flex-wrap">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className="text-xs px-1.5 py-0.5 rounded bg-brand-800 text-ink-200 ring-1 ring-brand-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {c.optIn ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-ink-300 font-mono">{c.source}</td>
                  <td className="py-3 px-4 text-xs text-ink-300 text-right">{c.addedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
