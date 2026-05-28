# Tráfego conectado com Meta Ads — Design

**Data**: 2026-05-28
**Escopo**: Substituir a integração agregada existente em `/trafego` por uma conexão real com o Meta Ads (gerenciador de anúncios), expondo KPIs por anúncio, identificando o top 3 anúncios em dois buckets (perpétuo / lançamento) e métricas de qualidade de vídeo (hook rate, hold rate).

## Contexto

Hoje `/trafego` chama `lib/integrations/meta-ads.ts` que agrega `spend / impressions / clicks / conversions / revenue` no nível da conta inteira. Quando o token não está configurado, exibe dados mock. A criadora quer ir mais fundo: ver *quais anúncios* estão funcionando, separados por estratégia (vendas perpétuas vs lançamentos), com métricas de criativo de vídeo (hook/hold rate) que indicam onde melhorar a produção.

## Decisões já tomadas no brainstorming

| Decisão | Escolha | Motivo |
|---|---|---|
| Tipo de anúncio | Misto (vídeo e estático) | UI mostra hook/hold só pra vídeo; estático exibe `—` |
| Critério "anúncio que mais performa" | **Top 3 por bucket** lado a lado | Ela compara estratégias, não escolhe um campeão |
| Detecção de bucket | `campaign.objective` da Meta | Robusto, sem depender de naming convention |
| Top 3 estrutura | 3 por bucket em seções separadas | Espaço maior; mostra estratégia separada |
| Eventos de conversão | **Purchase + Lead** separados por bucket | Perp = compras / Lanc = leads |
| Período | `PeriodSelector` existente (7d/30d/90d/Mês/Custom) | Já implementado pro dashboard |
| Arquitetura | **A — fetch direto na página** com `revalidate: 3600` + botão manual de refresh | Zero infra extra, volume <50 ads cabe na rate limit |
| Status setup | Desconhecido — empacotar instruções no spec | Apêndice de setup |

## Arquitetura

```
Browser
   │ GET /trafego?period=7d         (server component, revalidate 3600)
   │ click "Atualizar agora"         server action → revalidatePath('/trafego')
   ▼
Next.js
   │
   ▼
lib/integrations/meta-ads.ts  (reescrita)
   │
   └─► GET /act_{ID}/insights
           level = ad
           time_range = {since, until}
           fields = ad_id, ad_name, campaign_id, campaign_name,
                    objective, spend, impressions, clicks, cpc, ctr, cpm,
                    actions, cost_per_action_type,
                    video_play_actions, video_3_sec_watched_actions,
                    video_thruplay_watched_actions,
                    creative{thumbnail_url, video_id, image_url}
           limit = 500 + paginação via paging.next
       (1 chamada só — Meta retorna objective expandido no nível campanha;
        creative expandido elimina a chamada extra de thumbnails)
       │
       ▼
   Aggregate por bucket → Top 3 por bucket → Server component renderiza
```

### Princípios

- **Stateless do nosso lado**: nenhuma tabela nova. O Postgres só guarda config (env vars). Toda a verdade vem da Meta a cada request (ou cache).
- **Cache de 1 hora** via Next: `export const revalidate = 3600` na `/trafego/page.tsx`.
- **Botão "Atualizar agora"** dispara server action `refreshMetaAds()` que chama `revalidatePath('/trafego')` e re-renderiza com dados frescos.
- **Sem fallback pro DB** na Fase 1: se Meta cair, página mostra banner de erro com último cache de Next (se ainda existir). Migração pra snapshot em DB fica pra futuro se necessário.
- **Dependency injection do `fetch`** pra testabilidade.

## Modelo de Dados

Nenhuma tabela nova. Apenas variáveis de ambiente:

```
META_ACCESS_TOKEN=                 # System User Token, sem expiração, scope ads_read
META_AD_ACCOUNT_ID=                # apenas o número (sem 'act_')
META_AD_ACCOUNT_CURRENCY=BRL       # opcional, default BRL
```

### Types em `lib/integrations/meta-ads.ts`

```ts
type Bucket = "perpetuo" | "lancamento" | "outros";

type AggregateMetrics = {
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  ctr: number;
  cpc: number;
  conversions: number;
  revenue: number;
  roas: number;
};

type AdMetrics = {
  id: string;
  name: string;
  campaign: { id: string; name: string; objective: string; bucket: Bucket };
  format: "video" | "image" | "unknown";
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  cpm: number;
  purchases: number;
  leads: number;
  costPerPurchase: number | null;
  costPerLead: number | null;
  hookRate: number | null;   // null se estatico ou sem dados
  holdRate: number | null;
  thumbnailUrl: string | null;
};

type BucketSummary = {
  bucket: Bucket;
  ads: AdMetrics[];          // ordenado por ranking (top 3)
  totalSpend: number;
  totalResults: number;
  avgCostPerResult: number;
};

type TrafegoData = {
  aggregate: AggregateMetrics;
  perpetuo: BucketSummary;
  lancamento: BucketSummary;
  outros?: BucketSummary;
  fetchedAt: string;
  source: "meta" | "mock";
  errors: { code: string; message: string }[];
};
```

## KPIs e Fórmulas

### Métricas básicas (todos os anúncios)

| KPI | Fórmula | Origem Meta | Observação |
|---|---|---|---|
| Investido | `spend` | direto | em moeda da conta |
| Impressões | `impressions` | direto | |
| Cliques | `clicks` | direto | inclui link clicks e all clicks |
| CPC | `cpc` | direto | já calculado |
| CTR | `ctr` | direto | em % |
| CPM | `cpm` | direto | custo por mil impressões |

### Métricas de conversão (varia por bucket)

| KPI | Fórmula | Origem Meta | Aplica a |
|---|---|---|---|
| Compras | `actions.find(action_type='purchase').value` | actions array | Perpétuo |
| Custo/compra | `cost_per_action_type.find(action_type='purchase').value` | direto | Perpétuo |
| Leads | `actions.find(a => ['lead','complete_registration','submit_application'].includes(a.action_type))` (soma) | actions array | Lançamento |
| Custo/lead | `cost_per_action_type` correspondente, soma ponderada se múltiplos eventos | derivado | Lançamento |
| Receita | `action_values.find(action_type='purchase').value` | direto | Perpétuo |
| ROAS | `revenue / spend` | calculado | Perpétuo |

### Métricas de vídeo (somente quando `format === 'video'`)

| KPI | Fórmula | Origem Meta |
|---|---|---|
| **Hook rate** | `video_3_sec_watched_actions.value / impressions * 100` | calculado |
| **Hold rate** | `video_thruplay_watched_actions.value / video_3_sec_watched_actions.value * 100` | calculado |

**Definições:**
- Hook rate: % de pessoas que pararam no scroll e assistiram pelo menos 3s. Indica qualidade do gancho inicial.
- Hold rate: % das que passaram dos 3s e chegaram ao ThruPlay (15s ou completo). Indica qualidade do desenvolvimento do vídeo.

**Faixas de cor sugeridas na UI:**
- Hook: `<25%` ruim (vermelho) · `25–40%` médio (âmbar) · `≥40%` bom (verde)
- Hold: `<40%` ruim · `40–60%` médio · `≥60%` bom

(Essas faixas são heurísticas para Reels/Feed e podem ser calibradas conforme histórico real.)

## Bucketing — Detecção via `campaign.objective`

Mapeamento do objetivo Meta (legacy + ODAX):

| Objetivo Meta | Bucket | Evento de resultado |
|---|---|---|
| `OUTCOME_SALES` | Perpétuo | purchase |
| `CONVERSIONS` (legacy) | Perpétuo | purchase |
| `PRODUCT_CATALOG_SALES` (legacy) | Perpétuo | purchase |
| `OUTCOME_LEADS` | Lançamento | lead |
| `LEAD_GENERATION` (legacy) | Lançamento | lead |
| `MESSAGES` (legacy) | Lançamento | lead (interpretado como contato) |
| Demais (`TRAFFIC`, `ENGAGEMENT`, `REACH`, `OUTCOME_AWARENESS`, `OUTCOME_TRAFFIC`, etc) | Outros | impressions / clicks |

Bucket "Outros" aparece em seção colapsada no fim da página (opcional, não bloqueia MVP).

## Ranking dentro do bucket

**Perpétuo:**
1. Filtra anúncios com `purchases >= 3` (evita ruído de 1-2 compras sortudas).
2. Ordena por `costPerPurchase` ascendente.
3. Pega top 3.
4. Se sobrar slots após filtro (menos de 3 com `purchases >= 3`), completa com anúncios ordenados por `spend` descendente.

**Lançamento:**
1. Filtra anúncios com `leads >= 5`.
2. Ordena por `costPerLead` ascendente.
3. Top 3.
4. Fallback igual: completa por `spend` se faltar.

**Empate**: maior `spend` ganha.

## Fluxos

### F1 — Fetch e render inicial

1. `GET /trafego?period=7d` (ou outro preset/custom)
2. Server component lê `searchParams`, monta `{ since, until }` via `parsePeriod`
3. Chama `fetchTrafegoData({ since, until })` em `lib/integrations/meta-ads.ts`:
   - Uma chamada única ao `/insights` com `level=ad` e expansão de `campaign{objective}` + `creative{thumbnail_url}`
   - Pagina via `paging.next` enquanto houver
   - Para cada ad insight, deriva `bucket` do `campaign.objective` retornado inline
   - Agrega:
     - `aggregate` = soma de todos os ads
     - `perpetuo.ads`, `lancamento.ads` = top 3 por ranking
     - `perpetuo.totalSpend/totalResults/avgCostPerResult` = soma da bucket inteira (não só top 3)
4. Renderiza com `revalidate: 3600`

### F2 — Refresh manual

1. Click em "Atualizar agora" → server action `refreshMetaAds()` em `app/(dashboard)/trafego/actions.ts`:
   ```ts
   'use server';
   import { revalidatePath } from 'next/cache';
   export async function refreshMetaAds() {
     revalidatePath('/trafego');
   }
   ```
2. Botão muda pra estado "Atualizando..." com spinner via `useTransition`
3. Após retorno: estado "Atualizado" por 2s (feedback visual), depois volta ao normal
4. Próximo render usa fetch fresco (cache invalidado)

### F3 — Mudança de período

1. `PeriodSelector` chama `router.push('/trafego?period=30d')`
2. Server re-renderiza com `since/until` novos
3. Fetch sai pra Meta (params diferentes = cache-key diferente em Next.js fetch cache)

### F4 — Fallback sem token

1. `META_ACCESS_TOKEN` ou `META_AD_ACCOUNT_ID` vazio → `fetchTrafegoData` retorna mock estruturado com `source: 'mock'`
2. UI renderiza banner amarelo no topo:
   > **Dados de exemplo** — configure sua conta da Meta em [Setup](/docs/META_SETUP.md)
3. Cards mostram dados mock claramente marcados (badge "exemplo" em cada AdCard)

## UI — Estrutura

### Layout

```
┌─ /trafego ──────────────────────────────────────────────┐
│ Tráfego pago                  [PeriodSelector] [↻ ...]  │
│ Conectado a act_XXX · última atualização há Nmin        │
│                                                         │
│ [Banner amarelo/vermelho se erro/sem token]             │
│                                                         │
│ ┌─ 4 KPI cards: Investido, Impressões, Cliques, ───┐    │
│ │   Conversões                                      │   │
│ └──────────────────────────────────────────────────┘    │
│ ┌─ 4 Micro cards: CPM, CTR, CPC, ROAS ─────────────┐    │
│ └──────────────────────────────────────────────────┘    │
│                                                         │
│ ┌─ Perpétuo (vendas) ────────────────────────────────┐  │
│ │ ▶ ícone + título + sub  | Investido | Compras | C/R│  │
│ │ [AdCard 1] [AdCard 2] [AdCard 3]                   │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ ┌─ Lançamento (leads) ───────────────────────────────┐  │
│ │ ▶ ícone + título + sub  | Investido | Leads | C/R  │  │
│ │ [AdCard 1] [AdCard 2] [AdCard 3]                   │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ ┌─ Evolução diária (TrafficChart existente) ────────┐   │
│ └───────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### AdCard

- Thumbnail 16:9 (gradient + emoji no mockup; `creative.thumbnail_url` quando real)
- Badge `#N` (ranking) canto superior esquerdo
- Badge `Vídeo` / `Estático` canto superior direito
- Botão "Abrir no gerenciador" no hover (link `https://business.facebook.com/adsmanager/manage/ads?act={ACC}&selected_ad_ids={AD_ID}`)
- Nome do anúncio + nome da campanha
- 3 métricas grandes: Investido | Resultado | Custo/result (destaque dourado)
- 4 chips menores: Hook | Hold | CTR | CPC (Hook/Hold com cores semáforo; `—` em estáticos)

### Estados

- **Sem token**: banner + dados mock + badge "exemplo" nos AdCards
- **Token inválido (Meta error 190)**: banner vermelho "Token expirado, gere um novo"
- **Sem anúncios no período**: cada BucketSection mostra "Nenhum anúncio neste período"
- **Refresh em progresso**: skeletons nos KPI cards; botão com spinner
- **Rate limit**: banner âmbar "Atualize em alguns minutos"

### Acessibilidade

- Botão refresh com `aria-label="Atualizar dados da Meta Ads"`
- AdCards são `<article>` com `aria-label` legível
- Chip de qualidade tem `title` com explicação (hook rate, hold rate)
- Cores nunca são o único indicador (texto + cor)

## Tratamento de erros — Meta API

| Cenário | Código Meta | Ação |
|---|---|---|
| Token expirado | 190 / OAuthException | Banner vermelho "Token expirado, gere um novo no Business Manager" + log estruturado |
| Rate limit | 4 / 17 / 32 | Retry com backoff 2s. Se persistir, mostra último cache disponível + banner âmbar |
| Conta restrita | 200 / 100 | Banner explicando que precisa ter `ads_read` na System User |
| Timeout (>15s) | — | Usa cache anterior se válido, senão erro |
| `cost_per_action_type` ausente | — | `null`, UI mostra `—` (anúncio sem conversões ainda) |
| `actions` ausente | — | `0` conversões |
| Anúncio sem creative carregado | — | Thumbnail placeholder com inicial do nome |
| Paginação falha no meio | — | Usa o que conseguiu + log de warning |

Logs estruturados via `console.log(JSON.stringify(...))`:
```json
{
  "ts": "2026-05-28T...",
  "scope": "meta_ads",
  "event": "fetch_error",
  "error_code": 190,
  "error_message": "..."
}
```

## Testes

Foco em `lib/integrations/meta-ads.ts` (regras de negócio: bucketing, ranking, derivação de KPIs).

### Unit (Vitest)

- `parseAdInsight(rawInsight, campaignMap)` — extrai purchases, leads, hook/hold corretamente
- `assignBucket(objective)` — mapeia objective → bucket (todos os casos da tabela)
- `rankAdsInBucket(ads, bucket)` — ordena com tie-break e fallback de spend
- `aggregateBucket(ads)` — totais (spend, results, avg cost)
- `aggregateAccount(ads)` — totais agregados gerais (CPM, CTR derivados)

### Integration (Vitest com mock de fetch)

- Fluxo completo `fetchTrafegoData({ since, until })` com payload Meta realista (fixture JSON)
- Token expirado → retorna mock com `errors: [{code:'190',...}]`
- Sem token → retorna mock direto com `source: 'mock'`

### Manual

- Conectar conta real (System User Token) e validar que KPIs batem com gerenciador Meta dentro de ±1%
- Botão refresh força fetch novo (verificar via Network)
- Período troca corretamente

## Setup manual (apêndice — vai em `docs/META_SETUP.md`)

### 1. Criar System User no Business Manager

1. Acessar [business.facebook.com](https://business.facebook.com) → Configurações da empresa
2. **Usuários** → **Usuários do sistema** → criar novo
3. Nome: "Painel Dani Rosa" — Função: **Funcionário**
4. Após criar, clicar em **Atribuir ativos** → escolher Conta de Anúncios → permissão **Gerenciar campanhas** (inclui `ads_read`)

### 2. Gerar token

1. No mesmo System User → **Gerar novo token**
2. Escolher o App da Meta (ou criar um se não houver)
3. Marcar scopes: `ads_read`, `business_management`
4. **Token nunca expira** — usar esse, não tokens de usuário comum
5. Copiar o token (só aparece uma vez)

### 3. Identificar Ad Account ID

1. Em Conta de Anúncios → ver `Ad account ID` (formato `act_739218456` ou só `739218456`)
2. Usar o número sem `act_` no .env

### 4. Configurar .env.local na VPS

```
META_ACCESS_TOKEN=EAAxxxxxxxxxx
META_AD_ACCOUNT_ID=739218456
META_AD_ACCOUNT_CURRENCY=BRL
```

### 5. Verificar

- Abrir `/trafego` no painel
- Banner amarelo deve sumir
- KPIs devem refletir dados reais
- Comparar com gerenciador de anúncios da Meta

## Arquivos

### Novos

```
app/(dashboard)/trafego/
├── actions.ts                              # server action refreshMetaAds
└── _components/
    ├── ad-card.tsx                         # card individual
    ├── bucket-section.tsx                  # wrapper bucket + top 3
    └── refresh-button.tsx                  # botão com transition

docs/META_SETUP.md                          # passo a passo da Dani
```

### Modificados

```
lib/integrations/meta-ads.ts                # reescrita: campaigns + insights nivel ad + bucketing
app/(dashboard)/trafego/page.tsx            # UI nova com PeriodSelector + buckets
```

### Inalterados

```
app/(dashboard)/trafego/traffic-chart.tsx   # mantém gráfico de evolução diária
components/period-selector.tsx              # reusa existente
components/metric-card.tsx                  # reusa existente
```

## Critérios de aceitação

1. Com token válido, página carrega em <4s na primeira vez, <500ms quando dentro do cache de 1h
2. KPIs agregados batem com gerenciador de anúncios Meta dentro de ±1%
3. Buckets perpétuo/lançamento detectados corretamente pelo `campaign.objective`
4. Top 3 ranking respeita filtros mínimos (3 compras / 5 leads) com fallback por spend
5. Hook/hold calculados conforme fórmulas; faixas de cor aplicadas
6. Botão "Atualizar agora" força refetch (verificável via Network tab); mostra spinner; depois confirmação
7. PeriodSelector altera janela e refaz fetch
8. Sem token configurado: página não quebra, mostra banner + dados mock claramente marcados
9. Token expirado: banner vermelho com instrução; resto da página tenta cache anterior

## Fora deste spec (próximas fases)

- Snapshot diário em Supabase pra histórico (gráficos comparativos mês a mês)
- Detalhe por anúncio em drawer (todas as métricas, breakdown por dia/idade/placement)
- Sugestões automáticas ("Anúncio X tem hook rate baixo, considere trocar a primeira frase")
- Alertas (ex: "Custo/compra do anúncio Y subiu 40% nas últimas 24h")
- Comparativo entre períodos (delta % vs período anterior)
- Conexão com Hotmart/Kiwify pra cruzar `spend` com `revenue` real (não só Meta Pixel)
