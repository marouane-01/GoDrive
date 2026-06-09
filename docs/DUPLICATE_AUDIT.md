# Duplicate `GoDrive/GoDrive/` Audit Report

**Date:** 2026-06-08  
**Status:** Resolved — nested duplicate removed, legacy i18n archived

---

## Executive summary

A full copy of the GoDrive application existed at `GoDrive/GoDrive/` inside the canonical project root. It was an **obsolete, pre-hardening snapshot** with materially weaker security. Every file in its `public/` tree was a subset of the root project; the root added 32 newer assets (minified bundles, lazy i18n JSON, a11y/seo modules).

**Verdict:** Safe to remove. No unique production assets were lost. Legacy i18n was archived to `archive/legacy-i18n/` before deletion.

---

## 1. Structure comparison

| Metric | Root (`GoDrive/`) | Nested (`GoDrive/GoDrive/`) |
|--------|-------------------|-----------------------------|
| App files (excl. `node_modules`) | 65+ in `public/`, full server tree | 56 app files |
| `public/` files | 65 | 33 (all present in root) |
| Unique to nested | **0** | — |
| Unique to root | 32+ (build output, i18n JSON, a11y, seo) | — |
| Identical checksums | 30 files | Same paths, stale content |
| Different checksums | 26 files | All superseded by root |
| Total size (incl. `node_modules`) | — | ~15.1 MB |

Nested-only artifacts (junk): `.DS_Store`, empty `godrive@1.0.0` / `nodemon` stub files, separate `node_modules/`, local `.env`.

---

## 2. Security comparison (nested = insecure)

| Control | Root (current) | Nested (removed) |
|---------|----------------|------------------|
| CORS | Allowlist via `CORS_ALLOWED_ORIGINS` | `app.use(cors())` — **any origin** |
| JWT secret | Min **32** chars, dedicated util | Min **8** chars |
| JWT verification | HS256 pin, `verifyAccessToken()` | Plain `jwt.verify()` |
| Role in token | Re-validated against DB on every request | Trusts JWT payload only |
| Registration | Route returns 403; controller hardened | `register()` still in controller (route blocked) |
| Order claiming | `FOR UPDATE` transaction, status FSM, ownership | Any driver can `UPDATE` any order by ID |
| Support API | Dev-only, `ENABLE_SUPPORT_API` flag | **Always enabled**; returns Ethereal `previewUrl` |
| Health / SEO | `/health`, dynamic `robots.txt` / `sitemap.xml` | Absent |
| HTTPS / proxy | `forceHttps`, `TRUST_PROXY`, HSTS | Absent |
| Default port | 3001 | 3000 |
| Admin role | Supported (`migrations/001_add_admin_role.sql`) | Not present |
| Docker / PM2 | `Dockerfile`, `docker-compose.yml`, `ecosystem.config.js` | Not present |

**Risk if nested were deployed by mistake:** open CORS, weak JWT policy, IDOR on order updates, exposed support endpoint, no health monitoring.

---

## 3. References before removal

| Referrer | Path used | Resolution |
|----------|-----------|------------|
| `scripts/generate-i18n-core.js` | `GoDrive/public/js/i18n.js` | → `archive/legacy-i18n/i18n.js` |
| `scripts/audit-i18n-keys.js` | `GoDrive/public/js/i18n.js` + `i18n-content.js` | → `public/js/i18n-core.js` + `i18n-content.js` |
| `.dockerignore` | `GoDrive` (exclude nested from image) | → `archive` (exclude recovery snapshot) |
| `docs/PRODUCTION.md` | — | Added project layout section |
| `docker-compose.yml`, `ecosystem.config.js` | — | No nested paths (unchanged) |

No runtime code, HTML, or deployment config served from the nested tree.

---

## 4. Archive (retained)

```
archive/legacy-i18n/
├── README.md
├── i18n.js          # monolithic core dictionary (recovery source)
└── i18n-content.js  # content dictionary snapshot at removal time
```

Canonical translation workflow (unchanged):

1. Edit `public/js/i18n-core.js` and/or `public/js/i18n-content.js`
2. `npm run build:frontend`
3. `npm run i18n:verify`

---

## 5. Actions taken

- [x] Compared root vs nested (checksums, `public/` inventory)
- [x] Confirmed nested security regressions
- [x] Archived legacy i18n to `archive/legacy-i18n/`
- [x] Updated `scripts/generate-i18n-core.js` and `scripts/audit-i18n-keys.js`
- [x] Updated `docs/PRODUCTION.md` deployment paths
- [x] Updated `.dockerignore`
- [x] Removed `GoDrive/GoDrive/` directory

---

## 6. Post-removal verification

Run after any i18n or build change:

```bash
npm run i18n:verify
npm run build:frontend
```

Deploy commands (from repository root only):

```bash
docker compose up -d --build    # or
pm2 start ecosystem.config.js --env production
```

Health check: `GET /health` on port **3001**.
