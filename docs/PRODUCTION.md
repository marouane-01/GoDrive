# GoDrive — Production Deployment Guide

This document describes how to deploy the GoDrive Node.js application in production using Docker, Docker Compose, or PM2 behind a reverse proxy (nginx, Caddy, Traefik, etc.).

## Project layout

Deploy from the **repository root** (the directory containing `server.js` and `package.json`). There is a single application tree:

| Path | Role |
|------|------|
| `server.js` | Express entry point (default port **3001**) |
| `public/` | Static HTML, CSS, JS, images |
| `routes/`, `controllers/`, `middlewares/` | API and server logic |
| `docs/PRODUCTION.md` | This guide |
| `archive/legacy-i18n/` | Read-only i18n recovery snapshot (not served) |

The former nested duplicate `GoDrive/GoDrive/` was removed (see `docs/DUPLICATE_AUDIT.md`). **Never** deploy from a subdirectory copy.

---

## Frontend build (before deploy)

Minify CSS/JS and refresh translation bundles:

```bash
npm run build:frontend
npm run i18n:verify
npm run measure:perf
```

Translation sources (build-time only): `public/js/i18n-core.js` + `public/js/i18n-content.js` → `public/js/i18n/{lang}/*.json`.

This produces `public/css/app.min.css`, `public/js/*.min.js`, and lazy-loaded JSON bundles.

---

## Requirements

- Node.js **20+** (if not using Docker)
- PostgreSQL **14+**
- TLS certificate for your public domain (Let's Encrypt recommended)
- Reverse proxy terminating HTTPS in front of the app

---

## Environment variables

Copy `.env.example` to `.env` and configure every value before deploying.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Port the Node.js server listens on |
| `NODE_ENV` | Yes (prod) | `development` | Set to `production` in production |
| `PUBLIC_BASE_URL` | Yes (prod) | `http://localhost:3001` | Public site URL used in QR codes and absolute links (e.g. `https://godrive.example.com`) |
| `CORS_ALLOWED_ORIGINS` | Yes (prod) | — | Comma-separated browser origins allowed to call the API |
| `JWT_SECRET` | Yes | — | Min. 32 random characters. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `TRUST_PROXY` | No | `true` when `NODE_ENV=production` | Trust `X-Forwarded-*` headers from reverse proxy |
| `TRUST_PROXY_HOPS` | No | `1` | Number of reverse-proxy hops |
| `FORCE_HTTPS` | No | `true` in production | Redirect HTTP→HTTPS when `X-Forwarded-Proto` is not `https` |
| `DB_USER` | Yes | `postgres` | PostgreSQL user |
| `DB_HOST` | Yes | `localhost` | PostgreSQL host (`db` in Docker Compose) |
| `DB_NAME` | Yes | `godrive` | Database name |
| `DB_PASSWORD` | Yes | — | Database password |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `CONTACT_MAIL_TO` | Yes (prod) | — | Inbox for contact form submissions |
| `CONTACT_SMTP_*` | Yes (prod) | — | SMTP credentials for contact form |
| `CONTACT_RATE_MAX_PER_HOUR` | No | `15` | Contact form rate limit per IP |
| `ENABLE_SUPPORT_API` | No | disabled | Dev-only test endpoint; **never enable in production** |

### Production example

```env
PORT=3001
NODE_ENV=production
PUBLIC_BASE_URL=https://godrive.example.com
CORS_ALLOWED_ORIGINS=https://godrive.example.com,https://www.godrive.example.com

JWT_SECRET=<96-char-random-hex>
TRUST_PROXY=true
TRUST_PROXY_HOPS=1
FORCE_HTTPS=true

DB_USER=postgres
DB_HOST=db
DB_NAME=godrive
DB_PASSWORD=<strong-password>
DB_PORT=5432

CONTACT_MAIL_TO=support@godrive.example.com
CONTACT_SMTP_HOST=smtp.example.com
CONTACT_SMTP_PORT=587
CONTACT_SMTP_SECURE=false
CONTACT_SMTP_USER=noreply@godrive.example.com
CONTACT_SMTP_PASS=<smtp-password>
```

---

## Health check

```
GET /health
```

**200** when app and database are healthy:

```json
{
  "status": "ok",
  "service": "godrive",
  "database": "ok",
  "port": 3001,
  "publicBaseUrl": "https://godrive.example.com"
}
```

**503** when the database is unreachable (`status: "degraded"`).

Use this endpoint for load balancers, Docker health checks, and uptime monitoring.

---

## HTTPS & reverse proxy

The app does **not** terminate TLS directly. Run it behind a reverse proxy that:

1. Handles HTTPS certificates
2. Forwards traffic to `http://127.0.0.1:3001` (or your `PORT`)
3. Sets headers:
   - `X-Forwarded-Proto: https`
   - `X-Forwarded-For: <client-ip>`
   - `Host: godrive.example.com`

With `TRUST_PROXY=true` and `FORCE_HTTPS=true` (production defaults):

- Express trusts proxy headers for correct client IPs (rate limiting)
- HTTP requests are redirected to HTTPS
- HSTS is enabled via Helmet (`max-age=31536000`, `includeSubDomains`, `preload`)

### nginx example

```nginx
server {
    listen 443 ssl http2;
    server_name godrive.example.com;

    ssl_certificate     /etc/letsencrypt/live/godrive.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/godrive.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Docker

### Build and run (app only)

```bash
docker build -t godrive:latest .
docker run --env-file .env -p 3001:3001 godrive:latest
```

### Docker Compose (app + PostgreSQL)

```bash
# 1. Configure .env (see above)
cp .env.example .env

# 2. Start services
docker compose up -d --build

# 3. Verify health
curl http://localhost:3001/health
```

Stop:

```bash
docker compose down
```

---

## PM2

```bash
npm ci --omit=dev
mkdir -p logs uploads

# Start in production mode
pm2 start ecosystem.config.js --env production

# Persist across reboots
pm2 save
pm2 startup
```

Useful commands:

```bash
pm2 status
pm2 logs godrive
pm2 restart godrive
```

---

## Database setup

### New installation

`database.sql` is applied automatically by Docker Compose on first PostgreSQL start.

### Existing database

Run migrations manually:

```bash
psql -h localhost -U postgres -d godrive -f migrations/001_add_admin_role.sql
```

---

## Startup validation

In `NODE_ENV=production`, the server **refuses to start** unless:

- `JWT_SECRET` — min. 32 random characters (weak placeholders rejected)
- `PUBLIC_BASE_URL` — valid `https://` URL (no path)
- `CORS_ALLOWED_ORIGINS` — at least one valid origin URL
- `CONTACT_SMTP_HOST`, `CONTACT_SMTP_USER`, `CONTACT_SMTP_PASS`, `CONTACT_MAIL_TO` — or `CONTACT_USE_ETHEREAL=true` for staging only

API request bodies are limited to **100 KB** (JSON and urlencoded). Oversized payloads return `413`.

Internal errors in production return a generic `500` message; details are logged server-side only.

---

## Pre-deployment checklist

- [ ] `JWT_SECRET` is at least 32 random characters
- [ ] `PUBLIC_BASE_URL` uses your real `https://` domain
- [ ] `CORS_ALLOWED_ORIGINS` lists your production domain(s)
- [ ] `NODE_ENV=production`
- [ ] Contact SMTP is configured and tested
- [ ] `ENABLE_SUPPORT_API` is **not** set
- [ ] `.env` is **not** committed to git (see `.gitignore`)
- [ ] Reverse proxy forwards `X-Forwarded-Proto`
- [ ] `GET /health` returns `200`
- [ ] TLS certificate is valid and auto-renewing

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors in browser | Add your domain to `CORS_ALLOWED_ORIGINS` |
| QR codes point to localhost | Set `PUBLIC_BASE_URL` to production URL |
| Rate limit uses wrong IP | Enable `TRUST_PROXY=true` behind reverse proxy |
| Redirect loop on localhost | Set `FORCE_HTTPS=false` in development |
| Contact form 503 | Configure `CONTACT_SMTP_*` and `CONTACT_MAIL_TO` |
| Health returns 503 | Check PostgreSQL connectivity and `DB_*` variables |
