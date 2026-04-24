/**
 * Instagram Business Discovery API
 * Docs: https://developers.facebook.com/docs/instagram-api/guides/business-discovery
 *
 * Requer:
 * - Uma conta Instagram Business/Creator conectada a uma Facebook Page
 * - Token com permissões: instagram_basic, pages_show_list, business_management
 * - O concorrente também precisa ser Business/Creator (perfil pessoal não retorna)
 *
 * Env vars necessárias:
 * - META_ACCESS_TOKEN         — access token de usuário de sistema
 * - IG_BUSINESS_ACCOUNT_ID    — ID da conta IG business que fará as buscas
 */

export type InstagramPost = {
  id: string;
  caption: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  engagement: number;
};

export type InstagramProfile = {
  username: string;
  name: string;
  profile_picture_url: string;
  followers_count: number;
  media_count: number;
  biography: string;
};

export type CompetitorData = {
  profile: InstagramProfile;
  posts: InstagramPost[];
};

const GRAPH = "https://graph.facebook.com/v21.0";

export async function fetchCompetitor(username: string): Promise<CompetitorData> {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.IG_BUSINESS_ACCOUNT_ID;
  const cleanUsername = username.replace(/^@/, "").trim();

  if (!token || !igId) {
    return mockCompetitor(cleanUsername);
  }

  const fields =
    "business_discovery.username(" +
    cleanUsername +
    "){" +
    "username,name,profile_picture_url,followers_count,media_count,biography," +
    "media.limit(25){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count}" +
    "}";

  const url = `${GRAPH}/${igId}?fields=${encodeURIComponent(fields)}&access_token=${token}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    console.error("Instagram API error", await res.text());
    return mockCompetitor(cleanUsername);
  }

  const json = await res.json();
  const bd = json.business_discovery;
  if (!bd) {
    throw new Error(
      `Perfil @${cleanUsername} não encontrado ou não é Business/Creator.`
    );
  }

  const posts: InstagramPost[] = (bd.media?.data ?? []).map((m: {
    id: string;
    caption?: string;
    media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
    media_url?: string;
    thumbnail_url?: string;
    permalink: string;
    timestamp: string;
    like_count?: number;
    comments_count?: number;
  }) => ({
    id: m.id,
    caption: m.caption ?? "",
    media_type: m.media_type,
    media_url: m.media_type === "VIDEO" ? (m.thumbnail_url ?? m.media_url ?? "") : (m.media_url ?? ""),
    permalink: m.permalink,
    timestamp: m.timestamp,
    like_count: m.like_count ?? 0,
    comments_count: m.comments_count ?? 0,
    engagement: (m.like_count ?? 0) + (m.comments_count ?? 0)
  }));

  return {
    profile: {
      username: bd.username,
      name: bd.name ?? bd.username,
      profile_picture_url: bd.profile_picture_url ?? "",
      followers_count: bd.followers_count ?? 0,
      media_count: bd.media_count ?? 0,
      biography: bd.biography ?? ""
    },
    posts
  };
}

function mockCompetitor(username: string): CompetitorData {
  const captions = [
    "5 erros que te impedem de vender no digital ❌",
    "O segredo das minhas mentoradas que faturam 6 dígitos 💰",
    "Rotina matinal de quem constrói um império online ☀️",
    "Case: como a Maria saiu de 0 para 50k/mês em 90 dias 🚀",
    "Passo a passo pra criar sua primeira oferta irresistível",
    "Por que seu conteúdo não converte em vendas (e como resolver)",
    "Bastidores de um lançamento que fez 300k em 7 dias",
    "3 posts que você DEVE publicar essa semana",
    "Minha ferramenta favorita pra criar conteúdo em 10 min",
    "Storytelling que vende: a fórmula secreta",
    "Como precificar seu curso/mentoria sem medo",
    "Audiência pequena vendendo muito — é possível? SIM",
    "Erros de copy que fazem você perder vendas",
    "O que mudou depois que parei de postar todo dia",
    "Feedback da aluna que explodiu no instagram 💅"
  ];

  const posts: InstagramPost[] = Array.from({ length: 15 }, (_, i) => {
    const likes = Math.floor(300 + Math.random() * 8000);
    const comments = Math.floor(20 + Math.random() * 400);
    const daysAgo = i * 2 + Math.floor(Math.random() * 3);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const seed = `${username}-${i}`;
    return {
      id: `mock-${username}-${i}`,
      caption: captions[i % captions.length],
      media_type: i % 4 === 0 ? "VIDEO" : i % 3 === 0 ? "CAROUSEL_ALBUM" : "IMAGE",
      media_url: `https://picsum.photos/seed/${seed}/600/600`,
      permalink: `https://instagram.com/${username}`,
      timestamp: date.toISOString(),
      like_count: likes,
      comments_count: comments,
      engagement: likes + comments
    };
  });

  return {
    profile: {
      username,
      name: username.charAt(0).toUpperCase() + username.slice(1).replace(/[._]/g, " "),
      profile_picture_url: `https://picsum.photos/seed/${username}-avatar/200/200`,
      followers_count: Math.floor(5000 + Math.random() * 95000),
      media_count: Math.floor(100 + Math.random() * 900),
      biography: "📍 Infoprodutora • Mentora • Construindo meu império digital"
    },
    posts
  };
}
