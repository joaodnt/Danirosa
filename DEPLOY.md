# Deploy na Hostinger VPS

Passo a passo completo pra colocar o painel no ar.

## Pré-requisitos

- VPS Ubuntu 22.04+ na Hostinger (plano com pelo menos 2GB RAM)
- Domínio apontando pra VPS (ex: `painel.seudominio.com.br`)
- Acesso SSH ao servidor
- Projeto em um repositório Git (GitHub/GitLab)

---

## 1. Subir o projeto pro GitHub

Na sua máquina (pasta `Dani Rosa`):

```bash
git init
git add .
git commit -m "init: painel Dani Rosa"
git branch -M main
git remote add origin git@github.com:seu-usuario/dani-rosa.git
git push -u origin main
```

Se for repositório privado, você precisa configurar uma chave SSH ou usar HTTPS com token.

---

## 2. Preparar a VPS

### 2.1 Conectar via SSH

```bash
ssh root@IP_DA_VPS
```

### 2.2 Atualizar sistema e instalar dependências

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git
npm install -g pm2
```

Confira as versões:

```bash
node -v    # v20+
npm -v     # v10+
nginx -v
pm2 -v
```

### 2.3 Criar pasta do projeto

```bash
mkdir -p /var/www/dani-rosa
cd /var/www/dani-rosa
```

---

## 3. Clonar e configurar

```bash
cd /var/www/dani-rosa
git clone https://github.com/seu-usuario/dani-rosa.git .
npm ci
```

### 3.1 Criar `.env.production`

```bash
nano .env.production
```

Cole o conteúdo (troque pelas suas chaves):

```env
NEXT_PUBLIC_SUPABASE_URL=https://fbsximiqrpowhdskdcrl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xfnaZzZ3u7WKXlP_3oyHTA_xdnqH3mj

# Opcionais — só quando for integrar as APIs reais
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=
IG_BUSINESS_ACCOUNT_ID=
```

Salve com `Ctrl+O`, `Enter`, `Ctrl+X`.

### 3.2 Build de produção

```bash
npm run build
```

Se der erro de memória, aumente o swap:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 4. Iniciar com PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

O comando `pm2 startup` vai imprimir uma linha pra você copiar e colar — ela configura o PM2 pra iniciar no boot.

Verifique que está rodando:

```bash
pm2 status
pm2 logs dani-rosa-dashboard --lines 50
```

Teste localmente na VPS:

```bash
curl http://localhost:3000
```

Deve responder o HTML do painel.

---

## 5. Nginx como proxy reverso

### 5.1 Criar config

```bash
nano /etc/nginx/sites-available/dani-rosa
```

Cole (troque `painel.seudominio.com.br`):

```nginx
server {
    listen 80;
    server_name painel.seudominio.com.br;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
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

### 5.2 Ativar

```bash
ln -s /etc/nginx/sites-available/dani-rosa /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default   # desativa o default
nginx -t
systemctl reload nginx
```

Teste pelo navegador: `http://painel.seudominio.com.br` — deve abrir o login.

---

## 6. HTTPS grátis com Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d painel.seudominio.com.br
```

Siga as instruções (e-mail, aceitar termos). No final, escolha opção `2` pra forçar redirect HTTP → HTTPS.

O certbot renova automaticamente. Confira:

```bash
systemctl status certbot.timer
```

---

## 7. Firewall (opcional mas recomendado)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## 8. Atualizações futuras

Quando mexer no código na sua máquina:

```bash
# local
git add .
git commit -m "ajuste"
git push

# na VPS
cd /var/www/dani-rosa
git pull
npm ci
npm run build
pm2 restart dani-rosa-dashboard
```

---

## Troubleshooting

| Problema | Solução |
|---------|---------|
| `502 Bad Gateway` | `pm2 logs` — ver erro. Geralmente é env faltando ou porta errada. |
| `500` em páginas com dados | Verificar que o SQL foi rodado no Supabase (`schema.sql` + `storage.sql`) |
| Imagens não carregam | Verificar bucket `course-covers` público no Supabase Storage |
| PM2 morreu | `pm2 resurrect` ou `pm2 start ecosystem.config.js` |
| Build sem memória | Aumentar swap (ver seção 3.2) |

---

## Checklist final antes de divulgar o link

- [ ] SQL completo rodado no Supabase (`schema.sql` + `storage.sql`)
- [ ] Bucket `course-covers` criado e público
- [ ] Usuário criado em `Authentication → Users` (com Auto Confirm)
- [ ] Login testado no domínio
- [ ] HTTPS ativo (cadeado verde na URL)
- [ ] Logo e favicon aparecendo
- [ ] Capas dos cursos enviadas (hover no card → botão dourado "Capa")
