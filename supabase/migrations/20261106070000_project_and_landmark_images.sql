-- Migration: galeri foto proyek (dengan satu foto sampul) dan foto bukti pengerjaan per tahapan.

-- 1. Galeri foto proyek
CREATE TABLE IF NOT EXISTS public.project_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  caption text NOT NULL DEFAULT '',
  is_cover boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Paling banyak satu foto sampul per proyek.
CREATE UNIQUE INDEX IF NOT EXISTS project_images_one_cover_per_project
  ON public.project_images (project_id)
  WHERE is_cover;

CREATE INDEX IF NOT EXISTS project_images_project_position
  ON public.project_images (project_id, position);

ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;

-- Publik melihat foto proyek aktif dari instansi terverifikasi; admin instansi & super admin melihat semua miliknya.
CREATE POLICY project_images_select ON public.project_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.agencies a ON a.id = p.agency_id
    WHERE p.id = project_images.project_id
      AND p.archived_at IS NULL
      AND a.verified = true
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_images.project_id
      AND p.agency_id = public.get_user_agency_id()
  )
  OR public.is_super_admin()
);

CREATE POLICY project_images_insert ON public.project_images
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_images.project_id
      AND (public.is_verified_agency_admin(p.agency_id) OR public.is_super_admin())
  )
);

CREATE POLICY project_images_update ON public.project_images
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_images.project_id
      AND (public.is_verified_agency_admin(p.agency_id) OR public.is_super_admin())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_images.project_id
      AND (public.is_verified_agency_admin(p.agency_id) OR public.is_super_admin())
  )
);

CREATE POLICY project_images_delete ON public.project_images
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_images.project_id
      AND (public.is_verified_agency_admin(p.agency_id) OR public.is_super_admin())
  )
);

-- 2. Foto bukti pengerjaan per tahapan (landmark)
CREATE TABLE IF NOT EXISTS public.landmark_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landmark_id uuid NOT NULL REFERENCES public.landmarks(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  caption text NOT NULL DEFAULT '',
  uploaded_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS landmark_images_landmark
  ON public.landmark_images (landmark_id, created_at);

ALTER TABLE public.landmark_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY landmark_images_select ON public.landmark_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.landmarks l
    JOIN public.projects p ON p.id = l.project_id
    JOIN public.agencies a ON a.id = p.agency_id
    WHERE l.id = landmark_images.landmark_id
      AND p.archived_at IS NULL
      AND a.verified = true
  )
  OR EXISTS (
    SELECT 1 FROM public.landmarks l
    JOIN public.projects p ON p.id = l.project_id
    WHERE l.id = landmark_images.landmark_id
      AND p.agency_id = public.get_user_agency_id()
  )
  OR public.is_super_admin()
);

-- Hanya admin instansi pemilik proyek (terverifikasi) atau super admin yang boleh menambah bukti.
-- Warga tidak punya jalur insert sama sekali.
CREATE POLICY landmark_images_insert ON public.landmark_images
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.landmarks l
    JOIN public.projects p ON p.id = l.project_id
    WHERE l.id = landmark_images.landmark_id
      AND (public.is_verified_agency_admin(p.agency_id) OR public.is_super_admin())
  )
);

-- Tidak ada policy UPDATE: foto bukti tidak bisa diubah setelah diunggah, hanya dihapus oleh admin yang sama.
CREATE POLICY landmark_images_delete ON public.landmark_images
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.landmarks l
    JOIN public.projects p ON p.id = l.project_id
    WHERE l.id = landmark_images.landmark_id
      AND (public.is_verified_agency_admin(p.agency_id) OR public.is_super_admin())
  )
);
