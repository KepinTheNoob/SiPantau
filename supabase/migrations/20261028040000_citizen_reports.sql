-- Migration: citizen_reports table and RLS policies

CREATE TABLE IF NOT EXISTS public.citizen_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content text NOT NULL,
  photo_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.citizen_reports ENABLE ROW LEVEL SECURITY;

-- 1. SELECT
-- Publik (anon) hanya dapat melihat laporan berstatus 'approved' pada proyek aktif & terverifikasi.
-- Admin instansi dapat melihat semua laporan pada proyek milik instansinya.
-- Super admin dapat melihat seluruh laporan.
CREATE POLICY citizen_reports_select ON public.citizen_reports
FOR SELECT
USING (
  (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.agencies a ON a.id = p.agency_id
      WHERE p.id = citizen_reports.project_id
        AND p.archived_at IS NULL
        AND a.verified = true
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = citizen_reports.project_id
      AND p.agency_id = public.get_user_agency_id()
  )
  OR public.is_super_admin()
);

-- 2. INSERT
-- Publik atau warga dapat mengirim laporan baru dengan status 'pending' pada proyek yang aktif.
CREATE POLICY citizen_reports_insert ON public.citizen_reports
FOR INSERT
WITH CHECK (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.agencies a ON a.id = p.agency_id
    WHERE p.id = citizen_reports.project_id
      AND p.archived_at IS NULL
      AND a.verified = true
  )
);

-- 3. UPDATE (Moderasi Laporan)
-- Hanya admin instansi terkait atau super admin yang dapat mengubah status laporan (misal: pending -> approved/rejected).
CREATE POLICY citizen_reports_update ON public.citizen_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = citizen_reports.project_id
      AND p.agency_id = public.get_user_agency_id()
  )
  OR public.is_super_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = citizen_reports.project_id
      AND p.agency_id = public.get_user_agency_id()
  )
  OR public.is_super_admin()
);

-- 4. DELETE
-- Hanya admin instansi terkait atau super admin yang dapat menghapus laporan warga.
CREATE POLICY citizen_reports_delete ON public.citizen_reports
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = citizen_reports.project_id
      AND p.agency_id = public.get_user_agency_id()
  )
  OR public.is_super_admin()
);
