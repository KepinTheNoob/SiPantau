-- Migration: laporan warga langsung publik + tanggapan tertulis instansi.
--   * Moderasi (status pending/approved/rejected) dihapus: laporan tampil ke publik begitu dikirim.
--   * Laporan terikat ke akun pelapor (reporter_id) supaya warga bisa memantau laporannya sendiri.
--   * Instansi menanggapi dengan tulisan (citizen_report_replies), bukan tombol setuju/tolak.
--     Tanggapan tidak bisa diubah atau dihapus; tindak lanjut ditulis sebagai tanggapan baru.
-- Catatan: laporan lama yang berstatus 'rejected' ikut menjadi publik setelah kolom status dihapus.

-- 1. Laporan warga
DROP POLICY IF EXISTS citizen_reports_select ON public.citizen_reports;
DROP POLICY IF EXISTS citizen_reports_insert ON public.citizen_reports;
DROP POLICY IF EXISTS citizen_reports_update ON public.citizen_reports;

ALTER TABLE public.citizen_reports
  DROP COLUMN IF EXISTS status,
  ADD COLUMN IF NOT EXISTS reporter_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL
    DEFAULT auth.uid();

COMMENT ON COLUMN public.citizen_reports.reporter_id IS
  'Akun warga pengirim laporan. Tidak ditampilkan ke publik; dipakai untuk halaman Laporan Saya.';

CREATE INDEX IF NOT EXISTS citizen_reports_project_created
  ON public.citizen_reports (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS citizen_reports_reporter_created
  ON public.citizen_reports (reporter_id, created_at DESC);

-- Publik melihat semua laporan pada proyek aktif instansi terverifikasi.
-- Pelapor selalu melihat laporannya sendiri; admin instansi melihat laporan proyeknya.
CREATE POLICY citizen_reports_select ON public.citizen_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.agencies a ON a.id = p.agency_id
    WHERE p.id = citizen_reports.project_id
      AND p.archived_at IS NULL
      AND a.verified = true
  )
  OR (reporter_id IS NOT NULL AND reporter_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = citizen_reports.project_id
      AND p.agency_id = public.get_user_agency_id()
  )
  OR public.is_super_admin()
);

-- Hanya warga yang sudah masuk, atas nama akunnya sendiri, pada proyek aktif instansi terverifikasi.
-- Laporan tidak bisa diubah setelah dikirim (tidak ada policy UPDATE).
CREATE POLICY citizen_reports_insert ON public.citizen_reports
FOR INSERT
WITH CHECK (
  reporter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.agencies a ON a.id = p.agency_id
    WHERE p.id = citizen_reports.project_id
      AND p.archived_at IS NULL
      AND a.verified = true
  )
);

-- 2. Tanggapan tertulis instansi
CREATE TABLE IF NOT EXISTS public.citizen_report_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.citizen_reports(id) ON DELETE CASCADE,
  responder_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 20 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.citizen_report_replies IS
  'Tanggapan tertulis instansi atas laporan warga. Tidak bisa diubah; tindak lanjut ditulis sebagai tanggapan baru.';

CREATE INDEX IF NOT EXISTS citizen_report_replies_report_created
  ON public.citizen_report_replies (report_id, created_at);

ALTER TABLE public.citizen_report_replies ENABLE ROW LEVEL SECURITY;

-- Siapa pun yang boleh melihat laporannya boleh melihat tanggapannya (RLS citizen_reports ikut berlaku).
CREATE POLICY citizen_report_replies_select ON public.citizen_report_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.citizen_reports r
    WHERE r.id = citizen_report_replies.report_id
  )
);

-- Hanya admin instansi terverifikasi pemilik proyek, atas namanya sendiri.
CREATE POLICY citizen_report_replies_insert ON public.citizen_report_replies
FOR INSERT
WITH CHECK (
  responder_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.citizen_reports r
    JOIN public.projects p ON p.id = r.project_id
    WHERE r.id = citizen_report_replies.report_id
      AND public.is_verified_agency_admin(p.agency_id)
  )
);

-- 3. Foto laporan warga: warga yang masuk boleh mengunggah ke folder miliknya sendiri.
DROP POLICY IF EXISTS storage_evidence_citizen_report_insert ON storage.objects;
CREATE POLICY storage_evidence_citizen_report_insert ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'evidence'
  AND auth.uid() IS NOT NULL
  AND name LIKE ('reports/' || auth.uid()::text || '/%')
);
