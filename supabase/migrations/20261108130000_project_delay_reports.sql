-- Migration: laporan keterlambatan proyek.
-- Normalisasi:
--   * delay_reason_categories: lookup jenis alasan (label tidak diduplikasi di tiap laporan).
--   * project_delay_reports: satu baris per laporan; target lama TIDAK disimpan karena bisa
--     diturunkan dari laporan sebelumnya atau projects.target_end_date.
--   * delay_report_reasons: tabel penghubung many-to-many laporan <-> jenis alasan.
--   * project_delay_overview: view untuk nilai turunan (target efektif, perlu laporan atau tidak).
-- Laporan bersifat immutable (tidak ada policy UPDATE/DELETE): revisi = laporan baru.

-- 1. Lookup jenis alasan keterlambatan
CREATE TABLE IF NOT EXISTS public.delay_reason_categories (
  id smallint PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  position smallint NOT NULL DEFAULT 0
);

INSERT INTO public.delay_reason_categories (id, code, label, position) VALUES
  (1, 'cuaca', 'Cuaca ekstrem atau bencana', 1),
  (2, 'lahan', 'Pembebasan lahan', 2),
  (3, 'material', 'Pasokan material atau peralatan', 3),
  (4, 'anggaran', 'Pencairan anggaran', 4),
  (5, 'perizinan', 'Perizinan atau koordinasi utilitas', 5),
  (6, 'kontraktor', 'Kinerja kontraktor pelaksana', 6),
  (7, 'desain', 'Perubahan desain atau lingkup pekerjaan', 7),
  (8, 'lainnya', 'Lainnya', 99)
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, label = EXCLUDED.label, position = EXCLUDED.position;

ALTER TABLE public.delay_reason_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY delay_reason_categories_select ON public.delay_reason_categories
FOR SELECT
USING (true);

-- 2. Laporan keterlambatan
CREATE TABLE IF NOT EXISTS public.project_delay_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  reason_detail text NOT NULL CHECK (char_length(reason_detail) BETWEEN 20 AND 2000),
  recovery_plan text NOT NULL CHECK (char_length(recovery_plan) BETWEEN 20 AND 2000),
  revised_target_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_delay_reports_project_created
  ON public.project_delay_reports (project_id, created_at DESC);

ALTER TABLE public.project_delay_reports ENABLE ROW LEVEL SECURITY;

-- Publik boleh membaca laporan proyek aktif dari instansi terverifikasi (transparansi).
CREATE POLICY project_delay_reports_select ON public.project_delay_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.agencies a ON a.id = p.agency_id
    WHERE p.id = project_delay_reports.project_id
      AND p.archived_at IS NULL
      AND a.verified = true
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_delay_reports.project_id
      AND p.agency_id = public.get_user_agency_id()
  )
  OR public.is_super_admin()
);

-- Hanya admin instansi pemilik proyek yang boleh menulis laporan, atas namanya sendiri.
CREATE POLICY project_delay_reports_insert ON public.project_delay_reports
FOR INSERT
WITH CHECK (
  reported_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_delay_reports.project_id
      AND public.is_verified_agency_admin(p.agency_id)
  )
);

-- 3. Penghubung laporan <-> jenis alasan
CREATE TABLE IF NOT EXISTS public.delay_report_reasons (
  report_id uuid NOT NULL REFERENCES public.project_delay_reports(id) ON DELETE CASCADE,
  reason_category_id smallint NOT NULL REFERENCES public.delay_reason_categories(id),
  PRIMARY KEY (report_id, reason_category_id)
);

ALTER TABLE public.delay_report_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY delay_report_reasons_select ON public.delay_report_reasons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_delay_reports r
    WHERE r.id = delay_report_reasons.report_id
  )
);

CREATE POLICY delay_report_reasons_insert ON public.delay_report_reasons
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_delay_reports r
    JOIN public.projects p ON p.id = r.project_id
    WHERE r.id = delay_report_reasons.report_id
      AND r.reported_by = auth.uid()
      AND public.is_verified_agency_admin(p.agency_id)
  )
);

-- 4. Ringkasan per proyek: target efektif & apakah perlu laporan keterlambatan baru.
--    Proyek perlu laporan bila belum selesai dan hari ini sudah melewati target efektif
--    (target awal, atau target revisi dari laporan terakhir).
CREATE OR REPLACE VIEW public.project_delay_overview
WITH (security_invoker = true)
AS
SELECT
  p.id AS project_id,
  p.agency_id,
  p.target_end_date AS original_target_date,
  latest.id AS latest_report_id,
  latest.revised_target_date AS latest_revised_target_date,
  latest.created_at AS latest_report_at,
  COALESCE(latest.revised_target_date, p.target_end_date) AS effective_target_date,
  (
    s.status_waktu <> 'selesai'
    AND CURRENT_DATE > COALESCE(latest.revised_target_date, p.target_end_date)
  ) AS needs_delay_report
FROM public.projects p
JOIN public.project_stats s ON s.project_id = p.id
LEFT JOIN LATERAL (
  SELECT r.id, r.revised_target_date, r.created_at
  FROM public.project_delay_reports r
  WHERE r.project_id = p.id
  ORDER BY r.created_at DESC
  LIMIT 1
) latest ON true;

-- 5. Simpan laporan + jenis alasannya dalam satu transaksi (atomik).
--    SECURITY INVOKER: policy RLS di atas tetap berlaku untuk pemanggil.
CREATE OR REPLACE FUNCTION public.submit_delay_report(
  p_project_id uuid,
  p_reason_detail text,
  p_recovery_plan text,
  p_revised_target_date date,
  p_reason_category_ids smallint[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_report_id uuid;
BEGIN
  IF coalesce(array_length(p_reason_category_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Minimal satu jenis alasan keterlambatan wajib dipilih.';
  END IF;

  INSERT INTO public.project_delay_reports (
    project_id, reported_by, reason_detail, recovery_plan, revised_target_date
  )
  VALUES (
    p_project_id, auth.uid(), p_reason_detail, p_recovery_plan, p_revised_target_date
  )
  RETURNING id INTO v_report_id;

  INSERT INTO public.delay_report_reasons (report_id, reason_category_id)
  SELECT v_report_id, category.id
  FROM (SELECT DISTINCT unnest(p_reason_category_ids) AS id) AS category;

  RETURN v_report_id;
END;
$$;
