import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchCompetitor, type InstagramPost } from "@/lib/integrations/instagram";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import {
  Heart,
  MessageCircle,
  ArrowLeft,
  ExternalLink,
  Flame,
  Image as ImageIcon,
  Video,
  Layers,
  TrendingUp
} from "lucide-react";

export const revalidate = 3600;

export default async function CompetitorDetailPage({
  params
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const supabase = await createClient();
  const { data: competitor } = await supabase
    .from("competitors")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!competitor) notFound();

  let data;
  try {
    data = await fetchCompetitor(username);
  } catch {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Card>
          <CardContent className="py-12 text-center text-ink-200">
            Não foi possível buscar dados do @{username}. O perfil pode ter virado privado ou deixado de ser Business.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, posts } = data;
  const sortedByEngagement = [...posts].sort((a, b) => b.engagement - a.engagement);
  const topPost = sortedByEngagement[0];
  const otherPosts = sortedByEngagement.slice(1);
  const avgEngagement = posts.length
    ? Math.round(posts.reduce((sum, p) => sum + p.engagement, 0) / posts.length)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <ProfileHeader profile={profile} avgEngagement={avgEngagement} />

      {topPost && <TopPostHighlight post={topPost} avg={avgEngagement} />}

      <div>
        <h2 className="text-lg font-semibold text-ink-50">Todos os posts</h2>
        <p className="text-sm text-ink-300">Ordenados por engajamento</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {otherPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/concorrentes"
      className="inline-flex items-center gap-1.5 text-sm text-ink-200 hover:text-accent-gold w-fit transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar para concorrentes
    </Link>
  );
}

function ProfileHeader({
  profile,
  avgEngagement
}: {
  profile: {
    username: string;
    name: string;
    profile_picture_url: string;
    followers_count: number;
    media_count: number;
    biography: string;
  };
  avgEngagement: number;
}) {
  return (
    <Card>
      <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-start">
        {profile.profile_picture_url ? (
          <img
            src={profile.profile_picture_url}
            alt={profile.username}
            className="h-20 w-20 rounded-full object-cover border-2 border-brand-700 shrink-0"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-brand-800 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-ink-50">{profile.name}</h1>
          <p className="text-sm text-ink-300">@{profile.username}</p>
          {profile.biography && (
            <p className="text-sm text-ink-200 mt-2 whitespace-pre-line">
              {profile.biography}
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Seguidores" value={formatNumber(profile.followers_count)} />
            <Stat label="Publicações" value={formatNumber(profile.media_count)} />
            <Stat
              label="Engaj. médio"
              value={formatNumber(avgEngagement)}
              icon={TrendingUp}
            />
          </div>
        </div>
        <a
          href={`https://instagram.com/${profile.username}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-gold hover:text-[#d9b562] transition-colors"
        >
          Instagram <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg bg-brand-800/60 ring-1 ring-brand-800 px-3 py-2">
      <p className="text-xs text-ink-300 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className="text-sm font-semibold text-ink-50">{value}</p>
    </div>
  );
}

function TopPostHighlight({ post, avg }: { post: InstagramPost; avg: number }) {
  const lift = avg > 0 ? Math.round(((post.engagement - avg) / avg) * 100) : 0;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent-earth via-brand-800 to-brand-900 border border-accent-gold/30 p-6 shadow-xl shadow-black/40">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,161,75,0.15),transparent_50%)] pointer-events-none" />
      <div className="relative flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-gold text-brand-950">
          <Flame className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-semibold text-accent-gold">Post em destaque</h2>
          <p className="text-xs text-ink-200">Maior engajamento dos últimos posts</p>
        </div>
      </div>

      <div className="relative grid gap-6 md:grid-cols-[auto_1fr] items-start">
        <div className="relative w-full md:w-80 aspect-square rounded-xl overflow-hidden bg-brand-800 ring-1 ring-brand-700">
          {post.media_url && (
            <img
              src={post.media_url}
              alt="Post em destaque"
              className="w-full h-full object-cover"
            />
          )}
          <MediaTypeBadge type={post.media_type} />
        </div>

        <div className="flex flex-col gap-4">
          {post.caption && (
            <p className="text-sm text-ink-100 whitespace-pre-line line-clamp-6">
              {post.caption}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <MetricBox icon={Heart} label="Curtidas" value={formatNumber(post.like_count)} />
            <MetricBox
              icon={MessageCircle}
              label="Comentários"
              value={formatNumber(post.comments_count)}
            />
            <MetricBox
              icon={Flame}
              label="Engaj. total"
              value={formatNumber(post.engagement)}
            />
          </div>

          {lift > 0 && (
            <p className="text-sm text-accent-gold bg-brand-950/50 rounded-lg px-3 py-2 border border-accent-gold/20">
              📈 <strong>{lift}% acima</strong> da média dos posts recentes
            </p>
          )}

          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-gold hover:text-[#d9b562] w-fit transition-colors"
          >
            Ver no Instagram <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-brand-950/50 border border-brand-700 px-3 py-2">
      <div className="flex items-center gap-1 text-xs text-accent-gold">
        <Icon className="h-3 w-3" />
        <span className="text-ink-200">{label}</span>
      </div>
      <p className="text-sm font-semibold text-ink-50 mt-0.5">{value}</p>
    </div>
  );
}

function PostCard({ post }: { post: InstagramPost }) {
  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-col gap-2 rounded-xl border border-brand-800 bg-brand-900 overflow-hidden hover:border-brand-600 hover:shadow-lg hover:shadow-black/40 transition-all"
    >
      <div className="relative aspect-square bg-brand-800">
        {post.media_url && (
          <img
            src={post.media_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        <MediaTypeBadge type={post.media_type} />
      </div>
      <div className="p-3 flex flex-col gap-2">
        {post.caption && (
          <p className="text-sm text-ink-100 line-clamp-2">{post.caption}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-ink-300">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-accent-terracotta" />
            {formatNumber(post.like_count)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5 text-brand-300" />
            {formatNumber(post.comments_count)}
          </span>
          <span className="ml-auto text-[11px]">
            {new Date(post.timestamp).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit"
            })}
          </span>
        </div>
      </div>
    </a>
  );
}

function MediaTypeBadge({ type }: { type: InstagramPost["media_type"] }) {
  const Icon = type === "VIDEO" ? Video : type === "CAROUSEL_ALBUM" ? Layers : ImageIcon;
  return (
    <div className="absolute top-2 right-2 bg-brand-950/70 backdrop-blur text-accent-gold rounded-md p-1">
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}
