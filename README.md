# Dani Rosa — Dashboard

Painel com login e métricas (tráfego pago, alunos, automações) — Next.js 15 + Supabase.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (Auth + Postgres)
- **Recharts** (gráficos)
- **lucide-react** (ícones)
- Deploy: **PM2 + Nginx** na VPS Hostinger

## Estrutura

```
app/
├── login/                  # página de login (pública)
├── auth/logout/            # rota de logout
└── (dashboard)/            # rotas protegidas
    ├── layout.tsx          # sidebar + header (checa sessão)
    ├── page.tsx            # home: frase do dia + cards
    ├── trafego/            # tráfego pago (Meta Ads)
    ├── alunos/             # lista de alunos
    └── automacoes/         # automações

lib/
├── supabase/               # clients (browser, server, middleware)
├── integrations/meta-ads.ts# API do Meta
└── messages.ts             # frases motivacionais (rotação diária)

components/                 # UI reutilizável
middleware.ts               # protege /* exceto /login
supabase/schema.sql         # schema + RLS + seed
```

## Setup local

```bash
npm install
cp .env.example .env.local
# preencha as chaves do Supabase no .env.local
npm run dev
```

Abra http://localhost:3000.

## Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Settings → API**, copie `URL`, `anon key` e `service_role key` para o `.env.local`.
3. Em **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute.
4. Em **Authentication → Users**, clique em **Add user → Create new user** e crie a conta do cliente (cadastro é fechado — não tem página de signup).

## Configurar APIs

### Meta Ads
1. Crie um App em [developers.facebook.com](https://developers.facebook.com).
2. Gere um **System User Token** com permissão `ads_read`.
3. Preencha `META_ACCESS_TOKEN` e `META_AD_ACCOUNT_ID` no `.env`.

Sem as chaves, o painel usa dados de exemplo (mock).

## Deploy na VPS Hostinger

### 1. Preparar VPS (Ubuntu)

```bash
# conectar via SSH
ssh root@seu-ip

# instalar Node 20+ e PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# instalar Nginx
apt install -y nginx

# criar pasta do projeto
mkdir -p /var/www/dani-rosa
cd /var/www/dani-rosa
```

### 2. Subir código

Da sua máquina local:

```bash
# via git (recomendado)
git init && git add . && git commit -m "init"
git remote add origin git@github.com:seu-user/dani-rosa.git
git push -u origin main

# na VPS
cd /var/www/dani-rosa
git clone git@github.com:seu-user/dani-rosa.git .
npm ci
```

Crie `.env.production` na VPS com as chaves reais, depois:

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # siga a instrução impressa para iniciar no boot
```

### 3. Nginx

Crie `/etc/nginx/sites-available/dani-rosa`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar e recarregar:

```bash
ln -s /etc/nginx/sites-available/dani-rosa /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 4. HTTPS (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d seu-dominio.com.br
```

Pronto, painel rodando em `https://seu-dominio.com.br`.

## Atualizar em produção

```bash
cd /var/www/dani-rosa
git pull
npm ci
npm run build
pm2 restart dani-rosa-dashboard
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | dev server local |
| `npm run build` | build de produção |
| `npm start` | roda o build (porta 3000) |
| `npm run lint` | ESLint |
