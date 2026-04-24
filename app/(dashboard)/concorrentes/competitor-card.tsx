"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Card } from "@/components/ui/card";
import { removeCompetitor } from "./actions";
import { formatNumber } from "@/lib/utils";
import { Trash2, ExternalLink, Loader2 } from "lucide-react";

type Competitor = {
  id: string;
  username: string;
  display_name: string | null;
  profile_pic_url: string | null;
  followers_count: number | null;
  media_count: number | null;
};

export function CompetitorCard({ competitor }: { competitor: Competitor }) {
  const [pending, startTransition] = useTransition();

  function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Remover @${competitor.username}?`)) return;
    startTransition(async () => {
      await removeCompetitor(competitor.id);
    });
  }

  return (
    <Card className="group relative overflow-hidden hover:border-brand-600 hover:shadow-lg hover:shadow-black/40 transition-all">
      <Link href={`/concorrentes/${competitor.username}`} className="block p-6">
        <div className="flex items-center gap-3">
          {competitor.profile_pic_url ? (
            <img
              src={competitor.profile_pic_url}
              alt={competitor.username}
              className="h-14 w-14 rounded-full object-cover border border-brand-700"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-brand-800 ring-1 ring-brand-700 flex items-center justify-center text-lg font-semibold text-ink-300">
              {competitor.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-ink-50 truncate">
              {competitor.display_name || competitor.username}
            </p>
            <p className="text-sm text-ink-300 truncate">@{competitor.username}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-brand-800/60 ring-1 ring-brand-800 px-3 py-2">
            <p className="text-xs text-ink-300">Seguidores</p>
            <p className="text-sm font-semibold text-ink-50">
              {formatNumber(competitor.followers_count ?? 0)}
            </p>
          </div>
          <div className="rounded-lg bg-brand-800/60 ring-1 ring-brand-800 px-3 py-2">
            <p className="text-xs text-ink-300">Posts</p>
            <p className="text-sm font-semibold text-ink-50">
              {formatNumber(competitor.media_count ?? 0)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-accent-gold font-medium">
            <ExternalLink className="h-3.5 w-3.5" />
            Ver posts
          </span>
        </div>
      </Link>

      <button
        onClick={onDelete}
        disabled={pending}
        title="Remover concorrente"
        className="absolute top-3 right-3 h-8 w-8 rounded-lg bg-brand-900/0 hover:bg-red-950 text-ink-300 hover:text-red-400 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </Card>
  );
}
