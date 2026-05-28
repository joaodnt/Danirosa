// Payload inspirado em /act_X/insights?level=ad&fields=...,campaign{objective},creative{thumbnail_url}
// Estrutura conforme docs da Meta Graph API v23.0.

export const VIDEO_AD_INSIGHT = {
  ad_id: "120201234567890",
  ad_name: "VSL Risotos | Versão 3",
  campaign_id: "120209999000000",
  campaign: {
    id: "120209999000000",
    name: "PERP · Vendas Curso Risotos",
    objective: "OUTCOME_SALES"
  },
  creative: {
    thumbnail_url: "https://scontent.facebook.com/thumb/abc.jpg",
    video_id: "987654321"
  },
  spend: "2341.50",
  impressions: "184230",
  clicks: "5712",
  cpc: "0.41",
  ctr: "3.1",
  cpm: "12.71",
  actions: [
    { action_type: "purchase", value: "78" },
    { action_type: "link_click", value: "5300" }
  ],
  cost_per_action_type: [
    { action_type: "purchase", value: "30.02" }
  ],
  action_values: [
    { action_type: "purchase", value: "11700.00" }
  ],
  video_play_actions: [{ action_type: "video_view", value: "120000" }],
  video_3_sec_watched_actions: [{ action_type: "video_view", value: "77610" }],
  video_thruplay_watched_actions: [{ action_type: "video_view", value: "53093" }]
};

export const STATIC_AD_INSIGHT = {
  ad_id: "120201111111111",
  ad_name: "Carousel Receitas",
  campaign_id: "120209999000001",
  campaign: {
    id: "120209999000001",
    name: "PERP · Vendas Catalogo",
    objective: "OUTCOME_SALES"
  },
  creative: {
    image_url: "https://scontent.facebook.com/img/xyz.jpg"
  },
  spend: "1872.40",
  impressions: "115400",
  clicks: "3232",
  cpc: "0.58",
  ctr: "2.8",
  cpm: "16.22",
  actions: [{ action_type: "purchase", value: "51" }],
  cost_per_action_type: [{ action_type: "purchase", value: "36.71" }],
  action_values: [{ action_type: "purchase", value: "7650.00" }]
};

export const LEAD_AD_INSIGHT = {
  ad_id: "120203333333333",
  ad_name: "Lead Magnet PDF",
  campaign_id: "120209999000002",
  campaign: {
    id: "120209999000002",
    name: "LANC · Maio Captacao",
    objective: "OUTCOME_LEADS"
  },
  creative: { image_url: "https://scontent.facebook.com/img/lead.jpg" },
  spend: "920.40",
  impressions: "67500",
  clicks: "2565",
  cpc: "0.36",
  ctr: "3.8",
  cpm: "13.64",
  actions: [
    { action_type: "lead", value: "100" },
    { action_type: "complete_registration", value: "42" }
  ],
  cost_per_action_type: [
    { action_type: "lead", value: "9.20" },
    { action_type: "complete_registration", value: "21.91" }
  ]
};
