import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Handwritten } from "@/components/handwritten";
import { Search, GraduationCap, ChevronRight } from "lucide-react";

export const revalidate = 60;

type Student = {
  id: string;
  name: string;
  email: string;
  status: string;
  enrolled_at: string;
  course: string | null;
};

export default async function AlunosPage() {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("*")
    .order("enrolled_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">Alunos</h1>
          <p className="text-sm text-ink-300">
            {students?.length ?? 0} alunos cadastrados
          </p>
        </div>
        <Handwritten size="md" align="right" className="max-w-lg">
          Cozinhar é uma arte!
          <br />
          E cozinhar sem derivados animais é ainda mais gratificante.
        </Handwritten>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
        <input
          type="search"
          placeholder="Buscar por nome ou e-mail..."
          className="w-full max-w-md h-11 rounded-lg border border-brand-700 bg-brand-900 pl-10 pr-4 text-sm text-ink-50 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-gold"
        />
      </div>

      {!students || students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-800">
              <GraduationCap className="h-6 w-6 text-ink-300" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-ink-50">
              Nenhum aluno ainda
            </h3>
            <p className="mt-1 text-sm text-ink-300 max-w-sm">
              Quando alunos forem cadastrados na tabela{" "}
              <code className="text-xs bg-brand-800 px-1 py-0.5 rounded text-accent-gold">students</code>{" "}
              do Supabase, eles aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-800 text-left">
                  <th className="px-6 py-3 font-medium text-ink-200 text-xs uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 font-medium text-ink-200 text-xs uppercase tracking-wider">E-mail</th>
                  <th className="px-6 py-3 font-medium text-ink-200 text-xs uppercase tracking-wider">Curso</th>
                  <th className="px-6 py-3 font-medium text-ink-200 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 font-medium text-ink-200 text-xs uppercase tracking-wider">Matrícula</th>
                </tr>
              </thead>
              <tbody>
                {(students as Student[]).map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-brand-800 hover:bg-brand-800/40 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-3 font-medium text-ink-50">
                      <Link href={`/alunos/${s.id}`} className="block">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-ink-200">
                      <Link href={`/alunos/${s.id}`} className="block">
                        {s.email}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-ink-200">
                      <Link href={`/alunos/${s.id}`} className="block">
                        {s.course ?? "—"}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <Link href={`/alunos/${s.id}`} className="block">
                        <span
                          className={
                            s.status === "active"
                              ? "inline-flex rounded-full bg-brand-700/40 px-2 py-0.5 text-xs font-medium text-accent-gold ring-1 ring-brand-600"
                              : "inline-flex rounded-full bg-brand-800 px-2 py-0.5 text-xs font-medium text-ink-300"
                          }
                        >
                          {s.status === "active" ? "Ativo" : s.status}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-ink-200">
                      <Link
                        href={`/alunos/${s.id}`}
                        className="flex items-center justify-between gap-2"
                      >
                        {new Date(s.enrolled_at).toLocaleDateString("pt-BR")}
                        <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-accent-gold transition-colors" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
