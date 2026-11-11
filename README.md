# SIPANTAU - Platform Transparansi Proyek Pemerintah

Platform publik tempat instansi pemerintah mempublikasikan proyek pembangunan beserta tahapan (_landmark_) dan realisasi anggaran. Masyarakat dapat memantau progres dan anggaran tanpa perlu login; login warga hanya diperlukan untuk mengirim laporan. Admin instansi mengelola data proyek milik instansinya sendiri melalui panel terproteksi dengan halaman login terpisah.

## Fitur Utama

- **Halaman publik** — daftar proyek, filter status/anggaran, detail proyek dengan peta interaktif, progres berbobot, dan riwayat pengeluaran
- **Laporan warga** — warga yang login mengirim laporan yang langsung tampil ke publik; instansi menanggapi secara tertulis
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

| Role                        | Email                            | Password       | Login lewat                |
| --------------------------- | -------------------------------- | -------------- | -------------------------- |
| Super Admin                 | `superadmin@sipantau.co.id`      | `Password123!` | `/admin-login`             |
| Admin Instansi (PUPR)       | `admin.pupr@sipantau.co.id`      | `Password123!` | `/admin-login`             |
| Admin Instansi (Bina Marga) | `admin.binamarga@sipantau.co.id` | `Password123!` | `/admin-login`             |
| Warga                       | `warga@sipantau.co.id`           | `Password123!` | Tombol **Masuk** di navbar |

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
| `/admin-login`       | Halaman login pengelola                    | —              |
| `/pantau-sekitar`    | Peta proyek di sekitar pengguna            | Publik         |
| `/laporan-saya`      | PantauLaporan: laporan milik warga         | Warga (login)  |
| `/admin`             | Dashboard admin instansi                   | Admin Instansi |
| `/admin/proyek`      | Daftar & kelola proyek                     | Admin Instansi |
| `/admin/proyek/baru` | Buat proyek baru                           | Admin Instansi |
| `/admin/proyek/[id]` | Edit proyek, landmark, pengeluaran         | Admin Instansi |
| `/admin/riwayat`     | Audit log instansi sendiri                 | Admin Instansi |
| `/super-admin`       | Panel super admin                          | Super Admin    |

## Login

SIPANTAU punya **dua pintu login yang terpisah**. Akun dari satu pintu tidak bisa dipakai di pintu yang lain.

### Login pengelola (admin & super admin) — `/admin-login`

- Halaman ini sengaja tidak ditautkan dari halaman publik. Pengelola membuka `/admin-login` langsung.
- Alamat lama `/masuk` otomatis dialihkan ke `/admin-login` (lihat `redirects` di `next.config.ts`).
- Setelah login berhasil, pengguna diarahkan sesuai perannya: super admin ke `/super-admin`, admin instansi ke `/admin`.
- Akun yang mengaktifkan MFA (TOTP) diminta memasukkan kode 6 digit dari aplikasi autentikator.
- Akun warga (tanpa profil pengelola di tabel `profiles`) ditolak dan sesinya langsung diakhiri.
- Membuka `/admin` atau `/super-admin` tanpa sesi akan dialihkan ke `/admin-login?redirect=...`. Pengelola yang sudah login lalu membuka `/admin-login` langsung diarahkan ke panelnya.
- Akun pengelola dibuat oleh super admin dari panel super admin; tidak ada pendaftaran mandiri.
- Kode terkait: `src/app/(routes)/admin-login/`, `loginAction` dan `logoutAction` di `src/server/controllers/auth.ts`, serta pengecekan rute di `src/lib/supabase/middleware.ts`.

### Login warga — popup di halaman publik

- Dibuka dari tombol **Masuk** di navbar atau tombol **Buat Laporan Warga** di halaman proyek. Popup yang sama juga melayani pendaftaran akun warga (email, NIK, kata sandi).
- Akun pengelola ditolak di popup ini dengan pesan yang sama seperti kata sandi salah, supaya email pengelola tidak bisa ditebak dari halaman publik.
- Setelah login, tombol **Masuk** berganti menjadi menu akun berisi PantauLaporan (`/laporan-saya`) dan tombol keluar.
- Kode terkait: `src/components/citizen-auth-dialog.tsx` dan `src/server/controllers/citizen-auth.ts`.

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
- Laporan warga & tanggapan instansi
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
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Layout root + globals.css
│   └── (routes)/           # Semua halaman (route group, tidak memengaruhi URL)
│       ├── page.tsx        # / (daftar proyek)
│       ├── proyek/         # /proyek/[slug]
│       ├── instansi/       # /instansi/[slug]
│       ├── pantau-sekitar/ # Peta proyek di sekitar pengguna
│       ├── laporan-saya/   # PantauLaporan (laporan milik warga yang login)
│       ├── admin/          # Panel admin instansi
│       ├── super-admin/    # Panel super admin
│       └── admin-login/    # Halaman login pengelola (admin & super admin)
├── components/             # Komponen React (view) yang dipakai banyak halaman
├── db/                     # Tipe database (di-generate)
├── lib/                    # Utilitas (rupiah, progres, validasi, supabase client)
└── server/
    ├── models/             # Akses data: query Supabase & storage per entitas
    ├── controllers/        # Server Actions: validasi, otorisasi, lalu panggil model
    ├── admin-only/         # Operasi service role (hanya digunakan server)
    └── auth/               # Helper autentikasi & otorisasi

supabase/
└── migrations/             # Migrasi SQL (schema + RLS)

tests/                      # Test suite Vitest
scripts/
└── seed.ts                 # Script data demo
```

## Aturan Keamanan (Tidak Boleh Dilanggar)

1. Semua mutasi data **hanya** melalui Server Actions di `src/server/controllers/`, yang memakai query dari `src/server/models/`
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
