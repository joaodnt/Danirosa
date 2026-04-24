import { createClient } from "@/lib/supabase/server";
import { AddCompetitorForm } from "./add-form";
import { CompetitorCard } from "./competitor-card";
import { Handwritten } from "@/components/handwritten";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const revalidate = 0;

type Competitor = {
  id: string;
  username: string;
  display_name: string | null;
  profile_pic_url: string | null;
  followers_count: number | null;
  media_count: number | null;
  created_at: string;
};

export default async function ConcorrentesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("competitors")
    .select("*")
    .order("created_at", { ascending: false });

  const competitors = (data ?? []) as Competitor[];
  const slotsLeft = 10 - competitors.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">Concorrentes</h1>
          <p className="text-sm text-ink-300">
            Acompanhe perfis do Instagram e descubra o que converte ·{" "}
            <strong className="text-accent-gold">{competitors.length}/10</strong> cadastrados
          </p>
        </div>
        <Handwritten size="md" align="right">
          O lado sexy dos vegetais
        </Handwritten>
      </div>

      {slotsLeft > 0 && (
        <Card>
          <CardContent className="p-6">
            <AddCompetitorForm />
          </CardContent>
        </Card>
      )}

      {competitors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-800 ring-1 ring-brand-700">
              <Users className="h-6 w-6 text-ink-300" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-ink-50">
              Nenhum concorrente ainda
            </h3>
            <p className="mt-1 text-sm text-ink-300 max-w-sm">
              Adicione o @usuário de perfis Business/Creator do Instagram que você quer acompanhar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitors.map((c) => (
            <CompetitorCard key={c.id} competitor={c} />
          ))}
        </div>
      )}
    </div>
  );
}
