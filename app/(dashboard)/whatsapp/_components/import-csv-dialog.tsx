// MOCKUP — Fase 1 design preview. Sem upload real, so visual.
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Info
} from "lucide-react";

const SAMPLE_CSV = `phone,name,opt_in,tags
+5511998123456,Maria Silva,true,"aluna,vip"
+5521987654321,Joao Pereira,true,lead
+5531971238899,Ana Costa,true,aluna
5547999887766,Beatriz Rocha,true,"aluna,vip"
11912345678,Carlos Mendes,,"lead,vegetariano"
`;

type Variant = "default" | "outline";

export function ImportCSVButton({
  variant = "default",
  label = "Importar CSV"
}: {
  variant?: Variant;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-contatos-whatsapp.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function close() {
    setOpen(false);
    setFile(null);
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        {label}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-brand-700 bg-brand-900 shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-brand-800 bg-brand-900">
              <div>
                <h2 className="text-lg font-semibold text-ink-50">Importar contatos por CSV</h2>
                <p className="text-xs text-ink-300 mt-0.5">
                  Suba uma planilha com a lista. Preview antes de gravar.
                </p>
              </div>
              <button
                onClick={close}
                className="h-8 w-8 flex items-center justify-center rounded-md text-ink-300 hover:bg-brand-800 hover:text-ink-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <section className="rounded-xl border border-accent-gold/30 bg-accent-gold/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-accent-gold/15 ring-1 ring-accent-gold/40 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="h-4 w-4 text-accent-gold" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink-50">
                      Comece pela planilha modelo
                    </p>
                    <p className="text-xs text-ink-300 mt-0.5">
                      Baixe o arquivo, preencha no Excel/Google Sheets, exporte como CSV (UTF-8) e suba aqui.
                    </p>
                  </div>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4" />
                    Baixar modelo
                  </Button>
                </div>
              </section>

              <section>
                <p className="text-xs uppercase tracking-wider text-ink-300 mb-2">
                  Formato esperado
                </p>
                <div className="rounded-lg border border-brand-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-brand-950/60">
                      <tr className="text-left text-ink-300">
                        <th className="px-3 py-2 font-medium font-mono">phone</th>
                        <th className="px-3 py-2 font-medium font-mono">name</th>
                        <th className="px-3 py-2 font-medium font-mono">opt_in</th>
                        <th className="px-3 py-2 font-medium font-mono">tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-800 font-mono text-ink-100">
                      <tr>
                        <td className="px-3 py-2">+5511998123456</td>
                        <td className="px-3 py-2">Maria Silva</td>
                        <td className="px-3 py-2">true</td>
                        <td className="px-3 py-2">aluna,vip</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">+5521987654321</td>
                        <td className="px-3 py-2">Joao Pereira</td>
                        <td className="px-3 py-2">true</td>
                        <td className="px-3 py-2">lead</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">11912345678</td>
                        <td className="px-3 py-2">Carlos Mendes</td>
                        <td className="px-3 py-2 text-ink-300 italic">(vazio = true)</td>
                        <td className="px-3 py-2">lead,vegetariano</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <ul className="mt-3 space-y-1.5 text-xs text-ink-200">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span>
                      <strong className="text-ink-50 font-mono">phone</strong> é obrigatorio. Aceita com ou sem o "+", com ou sem DDI. Sem DDI assume Brasil (+55).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span>
                      <strong className="text-ink-50 font-mono">name</strong>, <strong className="text-ink-50 font-mono">opt_in</strong>, <strong className="text-ink-50 font-mono">tags</strong> sao opcionais. <code className="text-accent-gold">opt_in</code> em branco vira <code className="text-accent-gold">true</code>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span>
                      <strong className="text-ink-50 font-mono">tags</strong> separadas por virgula. Se a coluna tiver virgula no valor, coloque entre <code className="text-accent-gold">"aspas"</code>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <span>
                      Telefones repetidos sao mesclados (mantem o registro existente, atualiza nome e tags).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-brand-200 mt-0.5 shrink-0" />
                    <span>
                      Maximo: <strong className="text-ink-50">50.000 linhas</strong> por upload. Acima disso, divida em arquivos.
                    </span>
                  </li>
                </ul>
              </section>

              <section>
                <p className="text-xs uppercase tracking-wider text-ink-300 mb-2">
                  Suba o arquivo
                </p>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) setFile(f);
                  }}
                  onClick={() => inputRef.current?.click()}
                  className={`rounded-xl border-2 border-dashed cursor-pointer transition-colors p-8 text-center ${
                    dragOver
                      ? "border-accent-gold bg-accent-gold/5"
                      : file
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-brand-700 bg-brand-950/40 hover:border-brand-600 hover:bg-brand-900"
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setFile(f);
                    }}
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                      <p className="text-sm text-ink-50 font-medium">{file.name}</p>
                      <p className="text-xs text-ink-300">
                        {(file.size / 1024).toFixed(1)} KB · pronto para analisar
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="text-xs text-ink-300 hover:text-accent-gold mt-1"
                      >
                        trocar arquivo
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-brand-800 flex items-center justify-center">
                        <Upload className="h-5 w-5 text-ink-200" />
                      </div>
                      <p className="text-sm text-ink-50 font-medium">
                        Arraste o CSV aqui ou clique para selecionar
                      </p>
                      <p className="text-xs text-ink-300">Apenas .csv · até 50 MB</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 border-t border-brand-800 bg-brand-900">
              <p className="text-xs text-ink-300">
                Vamos mostrar uma previa antes de gravar no banco.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={close}>
                  Cancelar
                </Button>
                <Button disabled={!file}>Analisar arquivo</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
