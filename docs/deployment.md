# Nexora Production Deployment

## Deployment topology

```text
Client (HTTPS)
   | TLS termination (reverse proxy / load balancer)
   v
Next.js application (Nexora)        AI worker (npm run worker)        MCP server (npm run mcp)
   |                                      |                              |
   v                                      v                              v
PostgreSQL (managed, TLS + pooled)
```

- **Web**: `next build` lalu `next start`. Satu proses per instance; skala horizontal aman karena state semua di PostgreSQL.
- **AI worker**: proses terpisah `npm run worker` memproses `AiJob` (PENDING - PROCESSING - COMPLETED/FAILED) dengan claim transactional. Skala beberapa worker tanpa double-claim karena status di-klaim dalam transaction.
- **MCP**: proses terpisah `npm run mcp` (stdio) untuk coding agents; semua tool read-only. MCP bersifat lokal (stdio), tidak ikut dideploy ke Web production.

Catatan platform: jika target adalah Vercel (serverless), **tidak ada proses persistent** - worker `npm run worker` tidak dapat berjalan di sana (lihat Strategi worker). Untuk deployment minimal integrasi Vinyasa - Nexora, AI boleh tetap `mock` sehingga worker tidak diperlukan sama sekali.

## Target hosting (rekomendasi)

| Komponen | Rekomendasi | Alternatif |
|---|---|---|
| Web (Next.js) | Vercel | VPS/Docker (Dockerfile + docker-compose.yml sudah tersedia di repo) |
| PostgreSQL | Neon atau Supabase (managed, TLS + pooler) | RDS / Cloud SQL |
| Secrets | Secret manager platform (mis. Vercel Environment Variables) | systemd EnvironmentFile / Docker secrets |
| Domain | **BELUM DITETAPKAN - keputusan user sebelum deploy** | - |

> **Gate Phase 6:** deployment aktual belum dilakukan. Domain production, account hosting, dan instance managed PostgreSQL adalah keputusan user. Dokumen ini memakai `<domain>` sebagai placeholder yang WAJIB diganti - jangan deploy dengan placeholder.

## Managed PostgreSQL

Gunakan layanan PostgreSQL managed (Neon, RDS, Supabase, Cloud SQL, dsb):

- Buat database, user aplikasi dengan **least privilege** (SELECT/INSERT/UPDATE/DELETE pada schema aplikasi; tanpa `superuser`, tanpa akses dump yang tidak perlu).
- Wajib TLS (`sslmode=require`) pada `DATABASE_URL`.
- Aktifkan backup otomatis + point-in-time recovery, dan **uji restore** secara berkala (lihat Rollback).
- Gunakan connection pooling (mis. PgBouncer/Neon pooler) dengan `DATABASE_URL` runtime menunjuk ke pooler.
- Migration diterapkan **sebelum** rollout aplikasi (urutan di bagian Seed production / Rollout).

## Environment production

| Variable | Wajib | Catatan |
|---|---|---|
| `DATABASE_URL` | Ya | Managed PostgreSQL, `sslmode=require`, pooled bila ada. Nexora server only. |
| `AUTH_SECRET` | Ya | 32+ karakter random, di secret manager. Nexora server only. Tanpa ini, signup production dinonaktifkan (503). |
| `COOKIE_SECURE` | Ya (disarankan) | `true` di belakang TLS termination (juga terdeteksi otomatis dari `https://` / `x-forwarded-proto`). |
| `NEXORA_INTEGRATION_TOKEN` | Ya untuk integrasi Vinyasa | Nilai yang SAMA harus di-set di server Vinyasa. Server-only di kedua sisi, dikirim sebagai `Authorization: Bearer` server-to-server, **jangan pernah** ke browser. Kosong = akses programmatic non-session dinonaktifkan (fail closed). |
| `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` | Saat seed | Hanya saat inisialisasi. Di production (`NODE_ENV=production` atau `SEED_STRICT=true`) **wajib** diisi dan password harus berbeda dari default demo - seed menolak berjalan jika tidak (guard di `prisma/seed.ts`, teruji). |
| `AI_PROVIDER` | Ya | `mock` (no network, default) atau provider compatible. |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | Bila AI aktif | Server-only. |
| `NEXORA_MCP_TOKEN` | Bila MCP dipakai | Token untuk tool MCP server (lokal). |

Aturan secret (tidak bisa ditawar):

- Jangan pernah menaruh secret di `NEXT_PUBLIC_*`.
- Jangan commit `.env` (sudah di-ignore: `.env`, `.env.*`, kecuali `.env.example`).
- `NEXORA_INTEGRATION_TOKEN` hanya di server Nexora + server Vinyasa. `VINYASA_PROXY_KEY` (di sisi Vinyasa) bukan token ini.

## HTTPS dan cookie session

Cookie session memakai flag `Secure` secara otomatis ketika:

- request datang via HTTPS (`request.url` https), atau
- ada header `x-forwarded-proto: https` (proxy TLS), atau
- `COOKIE_SECURE=true` dieksplisitkan.

Di belakang reverse proxy dengan TLS termination, pastikan `x-forwarded-proto` diteruskan agar `Secure` aktif dan origin check (`hasSameOrigin`) cocok. Cookie login: `HttpOnly`, `SameSite=Lax`, `Secure` (production), expiry 8 jam. Session token di-DB disimpan sebagai hash SHA-256 (bukan plaintext).

## Seed production

Urutan inisialisasi (satu kali, sebelum deploy Vinyasa production):

```bash
# 1. Migration (idempotent; selalu dijalankan di DB production SEBELUM app baru)
npx prisma migrate deploy

# 2. Seed owner production - guard menolak default demo di production
export NODE_ENV=production
export SEED_OWNER_EMAIL=owner@<domain>
export SEED_OWNER_PASSWORD=<password-strong-unique>
npm run db:seed
```

Setelah seed:

1. Login dengan owner production (verifikasi `/api/health` 200 + login HTTP 200 + `Set-Cookie` Secure).
2. Ganti password owner (jangan tinggalkan password seed).
3. Pastikan user ACTIVE, project ACTIVE, membership OWNER.
4. **Peringatan:** `db:seed` bersifat upsert - menjalankan ulang seed akan MENGGANTI password owner dengan `SEED_OWNER_PASSWORD`. Setelah rotasi password, jangan re-seed (atau sinkronkan `SEED_OWNER_PASSWORD` dengan password terbaru bila re-seed memang diperlukan).

## Integrasi Vinyasa (production)

Kontrak server-to-server:

- Vinyasa (server) - Nexora dengan `Authorization: Bearer <NEXORA_INTEGRATION_TOKEN>`.
- Token divalidasi constant-time; validitas token saja belum cukup - project harus ACTIVE dan punya member dengan role yang diizinkan.
- Request berbasis token membawa subject sistem `system:vinyasa-integration` dengan `actorId: null` (tidak ada UUID sintetis ke foreign key).
- Mutasi session dari browser tetap wajib same-origin (CSRF - 403); mutasi berbasis token diizinkan lintas origin karena kredensialnya secret server-to-server.

Verifikasi production (token dan kredensi lewat env, jangan di-commit):

```bash
# Side Nexora - 20 checks: product context, design context, duplicate/versioning,
# lossless read-back, denial, CSRF. Butuh login owner production.
E2E_BASE_URL=https://nexora.<domain> E2E_OWNER_EMAIL=owner@<domain> \
E2E_OWNER_PASSWORD=<password-owner> NEXORA_INTEGRATION_TOKEN=<token-shared> \
npm run test:http

# Side Vinyasa - 9 checks: proxy guard, product context, sync + denial.
# Jalankan setelah Vinyasa production live (lihat docs/deployment.md di repo Vinyasa).
VINYASA_BASE_URL=https://vinyasa.<domain> VINYASA_PROXY_KEY=<proxy-key> \
node scripts/verify-nexora-http.mjs
```

## Strategi worker (production)

| Skenario | Strategi |
|---|---|
| Minimal integrasi (AI `mock`) | **Tanpa worker.** Sync design context adalah alur sinkronik; tidak ada queue. |
| AI aktif di Vercel | Tambahkan endpoint drain (mis. `POST /api/ai/jobs/drain`, guarded integration token) + Vercel Cron tiap 1 menit yang memanggilnya. Job tetap di-claim transactional. |
| AI aktif di VPS/Docker | Jalankan `npm run worker` sebagai service terpisah (systemd/compose) dengan `DATABASE_URL` yang sama. |

## Rollback dan disaster recovery

**Aplikasi:**

- Simpan artifact build/deployment sebelumnya. Vercel: Promote deployment sebelumnya dari panel. VPS: simpan direktori build / tag git per release.
- Rollback app tidak menyentuh schema - oleh karena itu aturan database di bawah.

**Database (expand-contract):**

- Hanya migration **backward-compatible** (tambah column/index dulu, migrasikan data, barulah hapus column lama di release terpisah).
- Destructive change tanpa strategi expand-contract dilarang.
- Jangan pernah `prisma migrate reset` / `prisma migrate dev` di database production.
- Restore drill: buat branch/snapshot DB production (Neon branching / PITR), kembalikan, verifikasi data + login + satu alur sync. Jadwalkan secara berkala.

**Urutan deploy produksi (Nexora):**

1. `npx prisma migrate deploy` (additive) pada DB production.
2. Deploy build baru (`npm ci`, `npm run build`, `npm run start` - atau Vercel auto).
3. Seed hanya jika inisialisasi pertama (lihat Seed production).
4. Verifikasi: `GET /api/health` 200 `{"database":"ok"}`, login owner 200 + cookie Secure, lalu round-trip `test:http`.
5. (Release berikutnya bila perlu) cleanup column/index lama.

## Readiness

`GET /api/health` mengembalikan `200 {"status":"ok","database":"ok",...}` bila koneksi database sehat, `503` bila tidak. Gunakan untuk healthcheck platform:

```bash
curl -fsS https://nexora.<domain>/api/health
```

## Docker

`Dockerfile` dan `docker-compose.yml` tersedia di root repo (`nexora-db` PostgreSQL 16 untuk lokal, `nexora-app` untuk aplikasi). Untuk target VPS: jalankan app di belakang reverse proxy dengan TLS; `nexora-db` compose hanya untuk dev - production memakai managed PostgreSQL.

## Observability

- Logging aplikasi structured (JSON): `login_failed`, `login_rate_limited`, `design_context_import_failed`, `ai_request_failed`, `project_creation_failed`, `artifact_mutation_failed`. Tidak ada secret/token yang dicetak ke log (sudah diaudit).
- Pantau minimal: `/api/health` 503, error rate HTTP 5xx, p99 latency, jumlah `AiJob` PENDING, koneksi DB, spike rate-limit 429 (login/signup/AI).
- Platform: Vercel Analytics/Alerts (5xx, latency, function errors) + monitoring provider DB (koneksi, slow queries).
- Rate limit aktif: login 5x/300 dtk (per email+IP), signup 5x/jam, AI 12x/menit + job 20x/jam. Endpoint integration token tidak di-rate-limit secara eksplisit - perlindungan dari secret Bearer + limit platform; pertimbangkan limit per-source bila ada penyalahgunaan.
- Body size: Vinyasa membatasi payload sync 2 MiB (413). Di sisi Nexora, limit datang dari platform (mis. batas body Vercel) - waspadai payload besar bila migrasi ke host lain.

## Status dokumen

- Kode integration + login fix: sudah di main (remote main `6dc44a3`).
- Guard seed production + structured login-failure logging: perubahan siap commit (lihat laporan deployment readiness).
- Deployment aktual: **BELUM** - menunggu domain, hosting, managed DB, dan production secrets dari user.