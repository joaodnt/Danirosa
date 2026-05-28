# Setup Meta Ads — Painel Tráfego

Passo a passo pra ligar o painel `/trafego` com a conta de anúncios da Meta.

## 1. Criar System User no Business Manager

1. Entre em [business.facebook.com](https://business.facebook.com) → **Configurações da empresa**
2. **Usuários** → **Usuários do sistema** → **Adicionar**
3. Nome: `Painel Dani Rosa` — Função: **Funcionário**
4. Após criar, clique em **Atribuir ativos** → escolha sua conta de anúncios → permissão **Gerenciar campanhas** (essa permissão já inclui `ads_read`)

## 2. Gerar token

1. No mesmo System User → **Gerar novo token**
2. Selecione o App da Meta (ou crie um App em [developers.facebook.com](https://developers.facebook.com))
3. Marque as permissões: `ads_read` e `business_management`
4. **Token nunca expira** — guarde em lugar seguro, ele só aparece uma vez

## 3. Identificar o Ad Account ID

1. No menu de Conta de Anúncios, copie o ID (formato `act_739218456` ou `739218456`)
2. Use **apenas o número**, sem o prefixo `act_`

## 4. Configurar variáveis de ambiente

No servidor onde o painel roda, edite `.env.local` (ou `.env.production`):

```
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
META_AD_ACCOUNT_ID=739218456
META_AD_ACCOUNT_CURRENCY=BRL
```

Reinicie o serviço:

```bash
pm2 restart dani-rosa-dashboard
```

## 5. Verificar

- Abra `/trafego` no painel
- Banner amarelo "Dados de exemplo" deve sumir
- KPIs no topo refletem dados reais da Meta
- Os buckets Perpétuo / Lançamento devem aparecer com seus top 3 anúncios

## Resolver problemas

| Sintoma | Causa provável | Correção |
|---|---|---|
| Banner vermelho "Token expirado (190)" | Token revogado ou trocado | Gere novo token no Business Manager e atualize `.env` |
| Banner amarelo persiste | Variáveis não foram carregadas | `pm2 restart` e confira `.env` |
| Bucket "Outros" lotado | Campanhas com objetivos como TRAFFIC/REACH | Esperado; só campanhas de SALES e LEADS entram em Perpétuo/Lançamento |
| Hook/hold mostrando `—` em vídeos | Vídeo muito curto ou Meta ainda não populou | Aguardar 24h após o anúncio começar a rodar |
| Erro 17 (Rate limit) | Muitos refreshes em pouco tempo | Aguardar 5 min; o cache de 1h evita o problema |
