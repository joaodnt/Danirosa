# WhatsApp Fase 1 — Broadcast via Meta Cloud API

**Data**: 2026-05-28
**Escopo**: Adicionar agente de disparos em massa via WhatsApp (API oficial Meta Cloud), incluindo limpeza de telas anteriores. Fases 2 (templates via API + Hotmart webhook) e 3 (inbox / conversa livre) ficam fora deste spec.

## Contexto

O painel Dani Rosa hoje tem rotas para Vendas, Alunos, Tráfego pago, Concorrentes, Automações (mock) e uma Área de Membros. A criadora quer:

1. Remover a Área de Membros (rotas, UI, tabelas no banco, bucket de storage)
2. Remover frases motivacionais e "frases de efeito" das páginas (componentes `Handwritten` e `DailyQuote`)
3. Adicionar um agente WhatsApp para disparar mensagens transacionais e de marketing via API oficial da Meta para listas de contatos importadas via CSV

## Decisões já tomadas no brainstorming

| Decisão | Escolha | Motivo |
|---|---|---|
| Provedor | **Meta Cloud API direto** | Gratuito até 1k conversas/mês, sem mensalidade de BSP. Conta já tem Business Manager |
| Modos suportados na Fase 1 | Disparo de marketing + utilitário; conversa livre fica para Fase 3 | Reduz escopo, entrega valor em ~1 semana |
| Fonte de contatos (Fase 1) | Import via CSV apenas | Webhook Hotmart é Fase 2 |
| Opt-in | Coluna `opt_in` no CSV (default `true`), criadora garante consentimento | LGPD: ela assume a responsabilidade. Double opt-in formal vira Fase 3 |
| Templates | Painel só *lista* templates já aprovados manualmente no Business Manager. Criação via API fica para Fase 2 | Acelera o MVP |
| Mídia | Apenas texto + variáveis | Header de imagem / documento fica para Fase 2 |
| Execução | Worker PM2 dedicado, polling em Postgres com `FOR UPDATE SKIP LOCKED` | Aproveita infra atual; sem dependência de Redis ou Edge Functions |
| Limpeza da Área de Membros | Apagar tudo (rotas + UI + tabelas + bucket) | Decisão da criadora |
| Frases removidas | `Handwritten` (todas as páginas) e `DailyQuote` (home). Tagline da sidebar e subtítulos das páginas ficam | Decisão da criadora |

## Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│ PM2                                                      │
│                                                          │
│  ┌─────────────────────┐    ┌────────────────────────┐   │
│  │ dani-rosa-dashboard │    │ whatsapp-worker        │   │
│  │ (Next.js, porta     │    │ (tsx workers/...)      │   │
│  │  3001)              │    │                        │   │
│  │                     │    │ Loop a cada 2s:        │   │
│  │ • UI /whatsapp/*    │    │  1. SELECT FOR UPDATE  │   │
│  │ • POST /broadcasts  │    │     SKIP LOCKED        │   │
│  │ • POST /import      │    │     LIMIT 80           │   │
│  │ • GET  /templates   │    │  2. POST /messages →   │   │
│  │ • GET/POST /webhook │    │     graph.facebook.com │   │
│  │ • GET  /health      │◄───┤  3. UPDATE status      │   │
│  └──────────┬──────────┘    └────────────┬───────────┘   │
└─────────────┼────────────────────────────┼───────────────┘
              │                            │
              ▼                            ▼
      ┌────────────────────────────────────────┐
      │ Supabase (Postgres + Storage)          │
      │ wa_contacts, wa_broadcasts, wa_messages│
      │ wa_webhook_events                      │
      └────────────────────────────────────────┘
              ▲
              │ webhooks (status updates)
              │
      ┌────────────────────────────────────────┐
      │ Meta Cloud API (graph.facebook.com)    │
      └────────────────────────────────────────┘
```

### Princípios

- **Fila no Postgres, não Redis**: volume cabe folgado; `FOR UPDATE SKIP LOCKED` resolve concorrência. Evita +1 dependência na VPS.
- **Worker como processo separado**: polling a cada 2s com lock pessimista por linha. Suporta 2+ réplicas sem duplicar envios.
- **Rate limit no worker**: 80 mensagens/s por número (default da Meta). Lote de 80 + sleep até completar 1s desde início.
- **Credenciais via env vars** com System User Token (não expira). Tokens nunca em DB.
- **Webhook na mesma origem do painel** (Next.js + Nginx + HTTPS já configurado): `/api/whatsapp/webhook` lida com `GET` (verify) e `POST` (eventos).
- **Idempotência**: webhook checa `wamid` contra `wa_messages` antes de aplicar atualização.

### Arquivos novos

```
app/(dashboard)/whatsapp/
├── page.tsx                          # Hub
├── contatos/page.tsx                 # Lista de contatos
├── broadcasts/novo/page.tsx          # Composer
├── broadcasts/[id]/page.tsx          # Detalhe / live status
├── configuracoes/page.tsx            # Status do número + webhook URL
└── _components/
    ├── import-csv-dialog.tsx         # Modal de import
    ├── broadcast-status.tsx          # Live counters
    └── template-preview.tsx          # Render preview de template

app/api/whatsapp/
├── broadcasts/route.ts               # POST cria broadcast + enfileira
├── contacts/import/route.ts          # POST analyze + commit
├── templates/route.ts                # GET lista da Meta
├── webhook/route.ts                  # GET verify + POST events
└── health/route.ts                   # GET status

lib/whatsapp/
├── meta-client.ts                    # Wrapper da Cloud API (fetch DI)
├── phone.ts                          # Normalização E.164
├── template.ts                       # Render de variáveis
├── csv.ts                            # Parse + validate
├── webhook.ts                        # HMAC validation
└── queue.ts                          # Dequeue / status updates

workers/
└── whatsapp-sender.ts                # Worker do PM2

supabase/migrations/
├── 20260528122500_drop_membros_area.sql       (já criado)
└── 20260528xxxxxx_whatsapp_fase1.sql          (tabelas wa_*)
```

### Arquivos modificados

```
components/sidebar.tsx                # Item WhatsApp adicionado, Membros removido
ecosystem.config.js                   # +whatsapp-worker
.env.example                          # +vars META_*
```

### Arquivos deletados (limpeza)

```
app/(dashboard)/membros/              # toda a pasta
components/handwritten.tsx
components/daily-quote.tsx
lib/messages.ts
```

## Modelo de Dados

Todas as tabelas com prefixo `wa_` para isolar do schema atual.

### `wa_contacts`

```sql
id              uuid pk default gen_random_uuid()
phone_e164      text unique not null     -- +5511999999999
name            text
opt_in          boolean not null default true
opt_in_source   text                     -- 'csv:lancamento-marco.csv' | 'manual'
opt_in_at       timestamptz default now()
opted_out_at    timestamptz              -- preenchido se enviar STOP via webhook
tags            text[] default '{}'
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

Índice único em `phone_e164`. Phone sempre normalizado para E.164 antes de gravar.

### `wa_broadcasts`

```sql
id                 uuid pk default gen_random_uuid()
name               text not null
template_name      text not null
template_language  text not null default 'pt_BR'
variable_mapping   jsonb not null
audience           jsonb not null
status             text not null default 'draft'   -- draft|queued|sending|completed|failed
total_count        int default 0
sent_count         int default 0
delivered_count    int default 0
read_count         int default 0
failed_count       int default 0
created_by         uuid references auth.users(id)
created_at         timestamptz default now()
started_at         timestamptz
completed_at       timestamptz
```

**Forma do `variable_mapping`** (array, índice = posição da var no template):
```json
[
  {"kind": "field",   "value": "first_name"},
  {"kind": "literal", "value": "18h"}
]
```

**Forma do `audience`**:
```json
{"kind": "all"}
{"kind": "tag", "tag": "vip"}
{"kind": "contact_ids", "ids": ["uuid", "..."]}
```

### `wa_messages`

```sql
id                  uuid pk default gen_random_uuid()
broadcast_id        uuid references wa_broadcasts(id) on delete cascade
contact_id          uuid references wa_contacts(id) on delete set null
phone_e164          text not null
rendered_variables  jsonb not null            -- {"1":"Maria","2":"Hoje"}
status              text not null default 'queued'  -- queued|sending|sent|delivered|read|failed
wamid               text unique               -- id da Meta após envio
attempts            int default 0
error_code          int
error_message       text
locked_at           timestamptz
queued_at           timestamptz default now()
sent_at             timestamptz
delivered_at        timestamptz
read_at             timestamptz
failed_at           timestamptz
```

Índices:
- Partial `(queued_at) where status = 'queued'` — polling do worker
- Unique `(wamid)` — lookup pelo webhook
- `(broadcast_id, status)` — contadores

### `wa_webhook_events`

```sql
id              uuid pk default gen_random_uuid()
received_at     timestamptz default now()
signature_valid boolean not null
event_type      text                    -- 'status' | 'message' | 'unknown'
payload         jsonb not null
processed       boolean default false
process_error   text
```

### RLS

Painel single-tenant. Política simples:

- `authenticated` (a criadora logada): full read/write nas 4 tabelas `wa_*`
- `service_role` (worker, server actions): full access

Sem multi-tenant. Sem grants extras.

### Dequeue do worker

```sql
update wa_messages
   set status = 'sending', locked_at = now(), attempts = attempts + 1
 where id in (
   select id from wa_messages
    where status = 'queued'
    order by queued_at
    limit 80
    for update skip locked
 )
returning *;
```

Garante que 2 réplicas do worker nunca pegam a mesma linha.

## Fluxos

### F1 — Import de contatos via CSV

1. `/whatsapp/contatos` → botão "Importar CSV" abre modal `<ImportCSVDialog>`.
2. Modal traz card de download de modelo (`modelo-contatos-whatsapp.csv` gerado client-side) + tabela explicando formato + drop zone para upload.
3. Upload → `POST /api/whatsapp/contacts/import` (multipart). Server side:
   - Parse streaming com `csv-parse`.
   - Para cada linha: normaliza `phone` (strip não-dígitos, assume `+55` se falta DDI), valida E.164 (`^\+[1-9]\d{10,14}$`), lê `name` e `opt_in` (default `true`), parse `tags` (split por vírgula).
   - Buckets: `new` (telefone inédito + válido), `existing` (telefone já no banco), `invalid` (com motivo).
   - Retorna `{ batchId, new: 1240, existing: 312, invalid: [...] }`. NÃO grava ainda.
4. Modal mostra preview (tabs ou seções colapsáveis por bucket). Botão "Importar X contatos".
5. `POST /api/whatsapp/contacts/import/commit` com `batchId`: upsert em `wa_contacts` por `phone_e164`. Marca `opt_in_source = 'csv:<filename>'`.
6. Toast de sucesso, modal fecha, lista recarrega.

**Limites**: 50.000 linhas por upload. Acima disso, recusa antes do parse.

**Cache do batch**: payload do batch fica em memória do servidor com TTL de 10 min (Map simples; aceitável porque é monoinstância). Re-upload necessário se expirou.

### F2 — Disparar broadcast

1. `/whatsapp/broadcasts/novo` mostra composer em passos:
   - **1. Identificação**: nome interno + escolha de template aprovado (lista vem de `GET /api/whatsapp/templates` que chama Meta `/{WABA_ID}/message_templates?status=APPROVED`).
   - **2. Variáveis**: para cada `{{N}}` do body, escolha entre "Campo do contato" (`name` | `first_name` | `phone`) ou "Texto fixo".
   - **3. Audiência**: rádio entre `all` | `tag:<tag>` | `manual`. Fase 1 implementa apenas `all` e `tag` — a opção `manual` aparece desabilitada com tooltip "Disponível na Fase 2". O schema `audience.kind = 'contact_ids'` fica reservado para uso futuro.
   - Preview em painel lateral: render do template com 3 contatos reais de exemplo.
2. Confirmação modal: "Você vai disparar para N contatos. Custo estimado R$X. Confirma?"
3. `POST /api/whatsapp/broadcasts` em uma transação:
   - Resolve audiência → lista de `contact_id`s, filtrando `WHERE opt_in = true AND opted_out_at IS NULL`.
   - `INSERT INTO wa_broadcasts (status='queued', total_count=N)`.
   - `INSERT INTO wa_messages` (bulk) com `rendered_variables` já resolvido por contato. Status `queued`.
   - Retorna `{ broadcast_id }`.
4. Redireciona para `/whatsapp/broadcasts/{id}` com live status (Supabase Realtime subscription em `wa_messages` filtrada por `broadcast_id`).

### F3 — Worker processando fila

```pseudo
loop a cada 2s:
  batch_start = now()
  rows = dequeue(80)               # SELECT FOR UPDATE SKIP LOCKED
  if rows is empty:
    sleep 2s; continue

  results = await Promise.allSettled(rows.map(send))

  for each result:
    if 200: status='sent', wamid=<id>, sent_at=now
    elif 4xx permanente: status='failed', error_code, error_message
    elif transitório: if attempts < 3: status='queued' else 'failed'

  await sleep_until(batch_start + 1000ms)   # rate limit 80/s
```

`send(row)`:
```
POST https://graph.facebook.com/v23.0/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {META_ACCESS_TOKEN}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": row.phone_e164.replace('+', ''),
  "type": "template",
  "template": {
    "name": row.template_name,
    "language": { "code": "pt_BR" },
    "components": [{
      "type": "body",
      "parameters": [
        { "type": "text", "text": row.rendered_variables["1"] },
        ...
      ]
    }]
  }
}
```

Após cada batch, atualiza `wa_broadcasts.sent_count` somando os `sent` do batch.

### F4 — Webhook recebendo eventos

```
POST /api/whatsapp/webhook
```

1. Lê body bruto + header `X-Hub-Signature-256`. Valida com HMAC SHA256(body, `META_APP_SECRET`).
   - Inválido: 401, persiste em `wa_webhook_events` com `signature_valid=false`.
2. Persiste payload em `wa_webhook_events` com `signature_valid=true`.
3. Para cada `entry[].changes[].value.statuses[]`:
   - Lookup `wa_messages WHERE wamid = status.id`.
   - Mapeia status Meta → status interno:
     - `sent` (já marcado pelo worker) → ignora
     - `delivered` → `delivered_at = now`, status `delivered`, incrementa `delivered_count` do broadcast
     - `read` → `read_at = now`, status `read`, incrementa `read_count`
     - `failed` → `failed_at = now`, status `failed`, `error_code`, `error_message`, incrementa `failed_count`
4. Para cada `entry[].changes[].value.messages[]` (mensagens recebidas):
   - Body normalizado em `['STOP', 'SAIR', 'PARAR', 'CANCELAR']` → `UPDATE wa_contacts SET opted_out_at = now() WHERE phone_e164 = from`.
   - Outras mensagens: persiste no log mas não processa (inbox = Fase 3).
5. Quando `sent_count + failed_count = total_count`: `UPDATE wa_broadcasts SET status = 'completed', completed_at = now()`.
6. Sempre responde 200 (Meta retenta em 4xx/5xx).

### F5 — Verificação inicial do webhook

```
GET /api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=X&hub.verify_token=Y
```
Se `Y === process.env.META_WEBHOOK_VERIFY_TOKEN`: responde 200 `text/plain` com o valor de `hub.challenge`. Caso contrário: 403.

### F6 — Limpeza (já executada antes do spec)

- Pasta `app/(dashboard)/membros/` deletada
- Componentes `handwritten.tsx`, `daily-quote.tsx` e `lib/messages.ts` deletados
- Imports/usos removidos em todas as páginas
- Item "Área de membros" removido da sidebar; ícone `BookOpen` removido do import
- Migração `20260528122500_drop_membros_area.sql` criada (drops tabelas, funções dependentes, bucket de storage)

**Pendente da limpeza** (executar como parte da implementação):
- Atualizar `supabase/schema.sql` removendo seções de `courses`/`modules`/`lessons` (linhas ~89–133, ~179–194, ~271–388, ~490–549) para manter sincronia com a migração
- Atualizar `supabase/storage.sql` removendo o bucket `course-covers`
- Rodar a migração no Supabase de produção (via SQL Editor ou CLI)

## UI — Estados além do happy path

### Hub `/whatsapp`

- **Vazio** (zero contatos): hero com 2 CTAs grandes ("Conectar WhatsApp", "Importar contatos"). Tabela de disparos some.
- **Webhook offline** (>10min sem evento): banner amarelo "Webhook não recebe eventos há X min".
- **Qualidade do número baixa / suspensa**: banner vermelho com link para Business Manager.

### `/whatsapp/broadcasts/novo`

- **Sem templates aprovados**: composer bloqueado com card "Crie e aprove um template no Business Manager" + link.
- **Audiência zero após filtro**: botão "Disparar" desabilitado + mensagem.
- **Validação client**: nome não vazio, todas as variáveis mapeadas, audiência > 0.
- **Confirmação obrigatória** antes do POST (não há desfazer).

### `/whatsapp/broadcasts/[id]`

- Mesmo composer em modo read-only.
- Live counters: `sent`/`delivered`/`read`/`failed` com barras de progresso.
- Tabela paginada de mensagens com filtro por status.
- Botão "Reenviar falhas" se `status = completed` e tem falhas com `error_code` retentável.

### Import CSV

- Após "Analisar arquivo": preview com 3 buckets colapsáveis (`Novos`, `Já existem`, `Inválidos com motivo`).
- Botão "Importar N contatos" (`new` + `existing`).
- Toast de sucesso + reload da lista.

### `/whatsapp/configuracoes`

- Status do número (verificado, qualidade, tier).
- URL do webhook (campo read-only com botão "Copiar").
- Verify Token (gerado, botão "Regenerar").
- Telefone do remetente, display name.

### Loading

- Skeletons reutilizáveis nas tabelas durante fetch.
- Botão "Disparar" mostra spinner + texto "Enfileirando..." durante o POST.
- Live status via Supabase Realtime (subscription em `wa_messages WHERE broadcast_id = X`).

### Acessibilidade

- Modal de import com focus trap, ESC fecha, Enter dispara "Analisar".
- Tabelas com `<caption>` invisível e cabeçalhos com `scope`.
- Contraste mínimo AA validado.

## Erros e observabilidade

### Códigos Meta tratados explicitamente

| Código | Significado | Ação |
|---|---|---|
| 130429 | Rate limit | Retry com backoff (2s → 4s → 8s) |
| 131026 | Receiver não está no WhatsApp | `failed` permanente |
| 131047 | Re-engagement (fora da janela 24h) | `failed`, marca template para revisar |
| 131056 | Pair rate limit | Backoff por contato + retry |
| 132000–132016 | Template inválido / não aprovado | `failed` permanente + alerta UI |
| 368 / 1006 | Conta restrita | `failed` + pausa o broadcast + banner vermelho |
| 5xx / network | Transitório | Retry até `attempts = 3`, depois `failed` |

### Webhook

- Assinatura inválida: 401, persiste em `wa_webhook_events` com `signature_valid=false`.
- Payload malformado: 200 (impede retentativa infinita), persiste com `process_error`.
- `wamid` não encontrado: persiste e ignora.

### Logs estruturados

Worker emite JSON via `console.log(JSON.stringify(...))` visível em `pm2 logs whatsapp-worker`:

- Por batch: `{ts, batch_id, picked, sent, failed, duration_ms}`
- Por mensagem falha: `{ts, message_id, contact_phone, error_code, error_message}`

### Health check

`GET /api/whatsapp/health` retorna:

```json
{
  "worker_last_run_at": "2026-05-28T...",
  "queued_count": 47,
  "oldest_queued_age_seconds": 3,
  "webhook_last_event_at": "2026-05-28T..."
}
```

A home consome para banners.

## Testes

Foco em `lib/whatsapp/*` (camada crítica). Stack: Vitest.

### Unit

- `phone.ts`: normalização E.164 (com/sem `+55`, com formatação, número internacional, lixo)
- `template.ts`: render de variáveis (missing var, escape de `{{}}`, campo inválido)
- `webhook.ts`: validação HMAC SHA256 (assinatura válida/inválida, payload alterado)
- `csv.ts`: parse + validação (linhas inválidas, duplicatas, tags com vírgula)

### Integration

- Worker dequeue: 2 instâncias do worker pegando mesmas linhas → SKIP LOCKED não duplica
- Worker retry: 5xx da Meta → linha volta para `queued` com `attempts++`
- Webhook → DB: payload conhecido entra, `wa_messages` atualiza, contadores incrementam
- Import CSV: parse → preview → commit → upsert correto

### Mock da Meta

Cliente `lib/whatsapp/meta-client.ts` recebe `fetch` por dependency injection. Em testes, injeta mock; em produção, `globalThis.fetch`.

### Fora de escopo

- E2E (Playwright) — validação manual da UI na Fase 1
- Testes de carga

## Configuração

### Variáveis de ambiente novas

```
META_WABA_ID=
META_PHONE_NUMBER_ID=
META_ACCESS_TOKEN=                # System User Token, não expira
META_WEBHOOK_VERIFY_TOKEN=        # string aleatória gerada por nós
META_APP_SECRET=                  # para validar X-Hub-Signature-256
```

### `ecosystem.config.js`

Adicionar segundo app:

```js
{
  name: 'whatsapp-worker',
  script: 'node_modules/.bin/tsx',
  args: 'workers/whatsapp-sender.ts',
  env: { NODE_ENV: 'production' },
  max_memory_restart: '300M'
}
```

### Setup necessário no Business Manager (manual, antes do code)

- Criar WhatsApp Business Account
- Verificar número telefônico
- Aprovar Display Name
- Gerar System User Token com scope `whatsapp_business_messaging` + `whatsapp_business_management`
- Configurar webhook URL: `https://painel.dani.com.br/api/whatsapp/webhook` + Verify Token
- Aprovar pelo menos 1 template UTILITY para teste inicial

Prazo Meta: 2–5 dias para aprovação completa.

## Critérios de aceitação

A Fase 1 está pronta quando:

1. Limpeza completa (membros + frases) feita e build verde — *já feito*
2. Importar CSV de 1k linhas funciona end-to-end (preview + commit + lista carrega)
3. Disparar broadcast para audiência "todos" entrega ≥97% (taxa esperada considerando números fora do WhatsApp)
4. Webhook atualiza `delivered`/`read` em até 30s
5. Worker sobrevive a `pm2 restart` sem perder ou duplicar mensagem in-flight
6. Logs do worker permitem reconstruir o que aconteceu em qualquer disparo
7. Testes de `lib/whatsapp/*` passando

## Fora deste spec (próximas fases)

- **Fase 2**: criação/submissão de templates via API, webhook Hotmart/Kiwify sincronizando contatos, broadcast com mídia (imagem/documento), segmentação avançada
- **Fase 3**: inbox de conversas, resposta livre dentro de janela de 24h, atribuição para atendente, double opt-in formal
