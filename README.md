# SIPANTAU - Platform Transparansi Proyek Pemerintah

Platform publik tempat instansi pemerintah mempublikasikan proyek pembangunan beserta tahapan (_landmark_) dan realisasi anggaran. Masyarakat dapat memantau progres dan anggaran tanpa perlu login. Admin instansi mengelola data proyek milik instansinya sendiri melalui panel terproteksi.

## Fitur Utama

- **Halaman publik** — daftar proyek, filter status/anggaran, detail proyek dengan peta interaktif, progres berbobot, dan riwayat pengeluaran
- **Laporan warga** — publik dapat mengirim laporan; admin memoderasi
- **Panel admin instansi** — kelola proyek, landmark, dan pengeluaran (bukti upload)
- **Panel super admin** — verifikasi instansi, buat akun admin, pantau audit log
- **Keamanan berlapis** — RLS Supabase, `requireAgencyAccess`, validasi Zod, audit log immutable, MFA

## Prasyarat

| Alat                           | Versi Minimum |
| ------------------------------ | ------------- |
| Node.js                        | 20            |
| pnpm                           | 11            |
| Docker Desktop / Docker Engine | Terbaru       |
| Supabase CLI                   | Terbaru       |

Instalasi Supabase CLI:

```bash
# macOS/Linux
brew install supabase/tap/supabase

# atau via npm
npm install -g supabase
```

## Setup Awal (Fresh Clone)

### 1. Install dependensi

```bash
pnpm install
```

### 2. Konfigurasi variabel lingkungan

```bash
cp .env.example .env.local
```

Jalankan Supabase untuk mendapatkan nilai key:

```bash
pnpm supabase start
```

Output perintah di atas akan menampilkan:

```
API URL:        http://127.0.0.1:54321
anon key:       eyJ...
service_role key: eyJ...
```

Salin nilai tersebut ke `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key dari output>
SUPABASE_SERVICE_ROLE_KEY=<service_role key dari output>
```

### 3. Terapkan migrasi database

```bash
pnpm supabase db reset
```

> Perintah ini menerapkan semua migrasi dari `supabase/migrations/` ke database lokal.

### 4. (Opsional) Isi data demo

```bash
pnpm db:seed
```

Script ini membuat:

- 2 instansi terverifikasi (Dinas PUPR, Dinas Perumahan Rakyat)
- 3 proyek dengan landmark, pengeluaran, dan laporan warga
- Akun super admin dan admin instansi

Kredensial akun demo:

| Role                  | Email                           | Password       |
| --------------------- | ------------------------------- | -------------- |
| Super Admin           | `superadmin@transparansi.go.id` | `Password123!` |
| Admin Instansi (PUPR) | `admin.pupr@transparansi.go.id` | `Password123!` |

### 5. Jalankan server pengembangan

```bash
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Halaman Aplikasi

| URL                  | Deskripsi                                  | Akses          |
| -------------------- | ------------------------------------------ | -------------- |
| `/`                  | Daftar proyek publik dengan filter         | Publik         |
| `/proyek/[slug]`     | Detail proyek, peta, landmark, pengeluaran | Publik         |
| `/instansi/[slug]`   | Profil instansi dan daftar proyeknya       | Publik         |
| `/masuk`             | Halaman login pengelola                    | —              |
| `/admin`             | Dashboard admin instansi                   | Admin Instansi |
| `/admin/proyek`      | Daftar & kelola proyek                     | Admin Instansi |
| `/admin/proyek/baru` | Buat proyek baru                           | Admin Instansi |
| `/admin/proyek/[id]` | Edit proyek, landmark, pengeluaran         | Admin Instansi |
| `/admin/riwayat`     | Audit log instansi sendiri                 | Admin Instansi |
| `/super-admin`       | Panel super admin                          | Super Admin    |

## Script yang Tersedia

```bash
pnpm dev           # Jalankan dev server (Next.js + Turbopack)
pnpm build         # Build produksi
pnpm check         # Lint + format + typecheck + test (jalankan sebelum commit)
pnpm test          # Jalankan test saja (Vitest)
pnpm db:types      # Regenerasi tipe TypeScript dari skema database
pnpm db:seed       # Isi database dengan data demo
```

## Menjalankan Test

Pastikan Supabase lokal berjalan (`pnpm supabase start`), lalu:

```bash
pnpm test
```

Test suite mencakup:

- RLS (penolakan akses lintas instansi)
- Autentikasi & otorisasi
- CRUD proyek, landmark, pengeluaran
- Kalkulasi progres berbobot
- Moderasi laporan warga
- Kueri publik

## Stack Teknologi

| Lapisan       | Teknologi                                   |
| ------------- | ------------------------------------------- |
| Framework     | Next.js 16 (App Router, TypeScript strict)  |
| Styling       | Tailwind CSS v4                             |
| Database      | Supabase (Postgres + Auth + Storage)        |
| ORM           | Tanpa ORM — query langsung dengan RLS aktif |
| Tipe Database | Digenerate dari `supabase gen types`        |
| Validasi      | Zod                                         |
| Testing       | Vitest + Supabase lokal                     |
| Linting       | Oxlint + anti-slop                          |

## Struktur Direktori

```
src/
├── app/                    # Halaman Next.js (App Router)
│   ├── (halaman publik)    # /, /proyek/[slug], /instansi/[slug]
│   ├── admin/              # Panel admin instansi
│   ├── super-admin/        # Panel super admin
│   └── masuk/              # Halaman login
├── components/             # Komponen React (map, audit log, laporan warga)
├── db/                     # Tipe database (di-generate)
├── lib/                    # Utilitas (rupiah, progres, validasi, supabase client)
└── server/
    ├── actions/            # Server Actions (semua mutasi data)
    ├── admin-only/         # Operasi service role (hanya digunakan server)
    └── auth/               # Helper autentikasi & otorisasi

supabase/
└── migrations/             # Migrasi SQL (schema + RLS)

tests/                      # Test suite Vitest
scripts/
└── seed.ts                 # Script data demo
```

## Aturan Keamanan (Tidak Boleh Dilanggar)

1. Semua mutasi data **hanya** melalui Server Actions di `src/server/actions/`
2. Setiap action wajib: cek sesi → `requireAgencyAccess` → validasi Zod → audit log
3. `SUPABASE_SERVICE_ROLE_KEY` hanya boleh dipakai di `src/server/admin-only/`
4. Semua tabel menggunakan RLS — query memakai session client agar RLS berlaku
5. Proyek tidak dihapus permanen (gunakan `archived_at`)
6. Nilai uang disimpan sebagai `bigint` dalam satuan rupiah, bukan float

## Kontribusi

1. Fork repositori ini
2. Buat branch fitur: `git checkout -b fitur/nama-fitur`
3. Jalankan `pnpm check` sampai lulus sebelum commit
4. Buat Pull Request
