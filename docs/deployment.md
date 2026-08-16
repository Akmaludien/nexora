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

## Hosting: Vercel + Neon (opsi yang dipakai)

- **Web**: Vercel (deteksi framework Next.js). Vercel meneruskan `x-forwarded-proto: https`, sehingga flag `Secure` cookie aktif otomatis; `hasSameOrigin` memakai header `Origin` per request, jadi tidak ada domain yang di-hardcode.
- **Database**: Neon - gunakan pooled connector untuk `DATABASE_URL` runtime dan koneksi langsung untuk `migrate`/seed.
- **Worker**: Vercel tidak memiliki proses persisten. Selama `AI_PROVIDER=mock` tidak ada yang perlu dijalankan. Begitu provider AI nyata aktif, `AiJob` harus di-drain lewat cron (Vercel Cron ke endpoint) atau `npm run worker` di host terpisah.
- **MCP**: stdio, dijalankan lokal oleh coding agent - bukan di Vercel.
- **Domain kustom**: BELUM DITETAPKAN. Jangan menuliskan URL production mana pun sebagai konstanta.

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
| `NEXORA_INTEGRATION_TOKEN` | Bila integrasi Vinyasa dipakai | Secret bersama; Vinyasa harus menyetel nilai identik dan mengirimnya sebagai Bearer |
| `AI_FALLBACK_BASE_URL` / `AI_FALLBACK_API_KEY` / `AI_FALLBACK_MODEL` | Opsional | Provider kedua untuk failover AI otomatis |
| `COOKIE_SECURE` | Opsional | `"true"` memaksa flag `Secure` cookie bila proxy tidak meneruskan `x-forwarded-proto` |
| `SEED_STRICT` | Opsional | `"true"` menerapkan guard seed production di lingkungan apa pun |

Jangan pernah menaruh secret di `NEXT_PUBLIC_*`. Jangan commit `.env`.

## HTTPS dan cookie session

Cookie session memakai flag `Secure` secara otomatis ketika:

- request datang via HTTPS (`request.url` https), atau
- ada header `x-forwarded-proto: https` (proxy TLS), atau
- `COOKIE_SECURE=true` dieksplisitkan.

Di belakang reverse proxy yang melakukan TLS termination, pastikan `x-forwarded-proto` diteruskan agar `Secure` aktif dan origin check (`hasSameOrigin`) cocok. `COOKIE_SECURE=true` juga bisa dipakai untuk memaksa.

## Seed production

`npm run db:seed` idempotent (upsert), tetapi klausa `update`-nya **menyetel ulang password owner** ke nilai `SEED_OWNER_PASSWORD` pada setiap execution. Jangan pernah menjalankan seed ulang dengan password berbeda dari yang sedang dipakai - owner akan terkunci.

Di production (`NODE_ENV=production`, atau `SEED_STRICT=true` di lingkungan mana pun), seed menolak kredensial demo (`architect@nexora.local` / `nexora-production-foundation`): kedua nilai harus disetel eksplisit dan password minimal 12 karakter.

```bash
SEED_OWNER_EMAIL="owner@yourdomain.com" SEED_OWNER_PASSWORD="<random-32-karakter>" npm run db:seed
```

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
5. Untuk rollback: gunakan release sebelumnya; pastikan migration tetap backward-compatible (tidak ada destructive change tanpa strategi expand-contract). Lakukan restore drill dari backup secara berkala agar RPO/RTO terbukti, bukan diasumsikan.

## Observability

- Logging aplikasi sudah structured (JSON) untuk AI/design-context/project events; tambahkan aggregator (mis. systemd journal / CloudWatch / Loki) sesuai platform.
- Pantau: error rate HTTP, p99 latency, antrian `AiJob` (jumlah PENDING), koneksi DB, dan rate-limit 429.
- Ekspor metrik dasar dari `/api/health` dan dependency audit (`npm audit`).
