# Nexora Production Deployment

## Deployment topology

```text
Client (HTTPS)
   ↓ TLS termination (reverse proxy / load balancer)
Next.js application (Nexora)        AI worker (npm run worker)        MCP server (npm run mcp)
   ↓                                      ↓                              ↓
PostgreSQL (managed, TLS + pooled)
```

- **Web**: `next build` lalu `next start`. Satu proses per instance; skala horizontal aman karena state semua di PostgreSQL.
- **AI worker**: proses terpisah `npm run worker` memproses `AiJob` (PENDING → PROCESSING → COMPLETED/FAILED) dengan claim transactional. Skala beberapa worker tanpa double-claim karena status di-klaim dalam transaction.
- **MCP**: proses terpisah `npm run mcp` (stdio) untuk coding agents; semua tool read-only.

## Managed PostgreSQL

Gunakan layanan PostgreSQL managed (Neon, RDS, Supabase, Cloud SQL, dsb):

- Buat database, user aplikasi dengan **least privilege** (SELECT/INSERT/UPDATE/DELETE pada schema aplikasi; tanpa `superuser`, tanpa `pg_dump` bila tidak perlu).
- Wajib TLS (`sslmode=require`) pada `DATABASE_URL`.
- Aktifkan backup otomatis + point-in-time recovery, dan **uji restore** secara berkala.
- Gunakan connection pooling (mis. PgBouncer/Neon pooler) dengan `DATABASE_URL` yang menunjuk pooler untuk runtime aplikasi.
- Terapkan migration sebelum rollout aplikasi:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/nexora?sslmode=require" npx prisma migrate deploy
DATABASE_URL="postgresql://user:pass@host:5432/nexora?sslmode=require" npm run db:seed  # hanya untuk seed demo
```

## Environment production

| Variable | Wajib | Catatan |
|---|---|---|
| `DATABASE_URL` | Ya | Managed PostgreSQL, `sslmode=require`, pooled bila ada |
| `AUTH_SECRET` | Ya | ≥ 32 karakter random, simpan di secret manager |
| `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` | Seed saja | Hanya saat inisialisasi |
| `AI_PROVIDER` | Ya | `mock` (no network) atau `openai-compatible` |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | Bila AI aktif | Server-only |
| `NEXORA_MCP_TOKEN` | Bila MCP dipakai | Token untuk tool MCP server |

Jangan pernah menaruh secret di `NEXT_PUBLIC_*`. Jangan commit `.env`.

## HTTPS dan cookie session

Cookie session memakai flag `Secure` secara otomatis ketika:

- request datang via HTTPS (`request.url` https), atau
- ada header `x-forwarded-proto: https` (proxy TLS), atau
- `COOKIE_SECURE=true` dieksplisitkan.

Di belakang reverse proxy yang melakukan TLS termination, pastikan `x-forwarded-proto` diteruskan agar `Secure` aktif dan origin check (`hasSameOrigin`) cocok. `COOKIE_SECURE=true` juga bisa dipakai untuk memaksa.

## Readiness

`GET /api/health` mengembalikan `200` bila koneksi database sehat, `503` bila tidak. Gunakan endpoint ini untuk healthcheck container/orchestrator:

```bash
curl -fsS http://localhost:3000/api/health
```

## Docker

`docker-compose.yml` menyediakan `nexora-db` (PostgreSQL 16) dan `nexora-app` (build dari `Dockerfile`). Sediakan `Dockerfile` sesuai stack Next.js (lihat pola standar `next build` + `next start`; tambahkan `npx prisma generate` saat build image). Contoh menjalankan compose dengan managed DB di luar compose cukup menonaktifkan service `nexora-db`.

## Rollout

1. `prisma migrate deploy` pada database.
2. Deploy aplikasi baru.
3. Jalankan seed hanya jika diperlukan (idempotent).
4. Verifikasi `/api/health`, login, dan satu alur save artifact.
5. Untuk rollback: gunakan release sebelumnya; pastikan migration tetap backward-compatible (tidak ada destructive change tanpa strategi expand-contract).

## Observability

- Logging aplikasi sudah structured (JSON) untuk AI/design-context/project events; tambahkan aggregator (mis. systemd journal / CloudWatch / Loki) sesuai platform.
- Pantau: error rate HTTP, p99 latency, antrian `AiJob` (jumlah PENDING), koneksi DB, dan rate-limit 429.
- Ekspor metrik dasar dari `/api/health` dan dependency audit (`npm audit`).
