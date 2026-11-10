-- Migration: tujuan dan dampak proyek (ditampilkan di halaman detail publik).
-- Atribut milik satu proyek, jadi cukup kolom di tabel projects (tetap 3NF).
-- Default '' agar proyek lama tetap valid; wajib diisi untuk proyek baru lewat validasi aplikasi.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS objective text NOT NULL DEFAULT ''
    CHECK (char_length(objective) <= 2000),
  ADD COLUMN IF NOT EXISTS impact text NOT NULL DEFAULT ''
    CHECK (char_length(impact) <= 2000);

COMMENT ON COLUMN public.projects.objective IS 'Tujuan proyek: masalah apa yang ingin diselesaikan.';
COMMENT ON COLUMN public.projects.impact IS 'Dampak yang diharapkan bagi warga setelah proyek selesai.';
