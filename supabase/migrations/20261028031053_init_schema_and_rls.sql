-- 1. Tables

-- agencies
CREATE TABLE IF NOT EXISTS public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  region text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('admin', 'super_admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- projects
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  location_name text NOT NULL,
  lat double precision,
  lng double precision,
  budget_total bigint NOT NULL CHECK (budget_total >= 0),
  start_date date NOT NULL,
  target_end_date date NOT NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- landmarks
CREATE TABLE IF NOT EXISTS public.landmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL,
  weight integer NOT NULL CHECK (weight > 0),
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  evidence_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  landmark_id uuid REFERENCES public.landmarks(id) ON DELETE SET NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  note text NOT NULL DEFAULT '',
  evidence_path text,
  spent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  agency_id uuid REFERENCES public.agencies(id),
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  entity text NOT NULL CHECK (entity IN ('projects', 'landmarks', 'expenses')),
  entity_id uuid NOT NULL,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Helper Functions (STABLE, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_agency_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT agency_id FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_verified_agency_admin(target_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.agencies a ON a.id = p.agency_id
    WHERE p.id = auth.uid()
      AND p.agency_id = target_agency_id
      AND a.verified = true
  );
$$;

-- 3. View project_stats (security_invoker = true)
CREATE OR REPLACE VIEW public.project_stats
WITH (security_invoker = true)
AS
SELECT
  p.id AS project_id,
  p.agency_id,
  p.slug,
  p.title,
  p.budget_total,
  p.target_end_date,
  p.archived_at,
  COALESCE(exp.spent_total, 0::bigint) AS spent_total,
  CASE
    WHEN COALESCE(lm.total_weight, 0) = 0 THEN 0::numeric
    ELSE ROUND((COALESCE(lm.done_weight, 0)::numeric / lm.total_weight::numeric) * 100, 2)
  END AS progress_percent,
  CASE
    WHEN COALESCE(lm.landmark_count, 0) > 0 AND lm.done_count = lm.landmark_count THEN 'selesai'
    WHEN CURRENT_DATE > p.target_end_date THEN 'terlambat'
    ELSE 'tepat waktu'
  END AS status_waktu
FROM public.projects p
LEFT JOIN (
  SELECT
    project_id,
    SUM(amount)::bigint AS spent_total
  FROM public.expenses
  GROUP BY project_id
) exp ON exp.project_id = p.id
LEFT JOIN (
  SELECT
    project_id,
    COUNT(*)::int AS landmark_count,
    COUNT(*) FILTER (WHERE done = true)::int AS done_count,
    SUM(weight)::bigint AS total_weight,
    SUM(weight) FILTER (WHERE done = true)::bigint AS done_weight
  FROM public.landmarks
  GROUP BY project_id
) lm ON lm.project_id = p.id;

-- 4. Audit Log Trigger Function
CREATE OR REPLACE FUNCTION public.log_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid;
  v_agency_id uuid;
  v_action text;
  v_entity text;
  v_entity_id uuid;
  v_before jsonb;
  v_after jsonb;
BEGIN
  v_actor_id := auth.uid();
  v_action := TG_OP;
  v_entity := TG_TABLE_NAME;

  IF TG_OP = 'INSERT' THEN
    v_entity_id := NEW.id;
    v_before := NULL;
    v_after := to_jsonb(NEW);
    IF v_entity = 'projects' THEN
      v_agency_id := NEW.agency_id;
    ELSIF v_entity IN ('landmarks', 'expenses') THEN
      SELECT agency_id INTO v_agency_id FROM public.projects WHERE id = NEW.project_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_entity_id := NEW.id;
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    IF v_entity = 'projects' THEN
      v_agency_id := NEW.agency_id;
    ELSIF v_entity IN ('landmarks', 'expenses') THEN
      SELECT agency_id INTO v_agency_id FROM public.projects WHERE id = NEW.project_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
    v_before := to_jsonb(OLD);
    v_after := NULL;
    IF v_entity = 'projects' THEN
      v_agency_id := OLD.agency_id;
    ELSIF v_entity IN ('landmarks', 'expenses') THEN
      SELECT agency_id INTO v_agency_id FROM public.projects WHERE id = OLD.project_id;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (
    actor_id,
    agency_id,
    action,
    entity,
    entity_id,
    before,
    after
  ) VALUES (
    v_actor_id,
    v_agency_id,
    v_action,
    v_entity,
    v_entity_id,
    v_before,
    v_after
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Triggers
DROP TRIGGER IF EXISTS audit_projects_trigger ON public.projects;
CREATE TRIGGER audit_projects_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trigger();

DROP TRIGGER IF EXISTS audit_landmarks_trigger ON public.landmarks;
CREATE TRIGGER audit_landmarks_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.landmarks
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trigger();

DROP TRIGGER IF EXISTS audit_expenses_trigger ON public.expenses;
CREATE TRIGGER audit_expenses_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trigger();

-- 5. Row Level Security (RLS)

-- Enable RLS on all tables
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5.1 agencies policies
CREATE POLICY agencies_select ON public.agencies
FOR SELECT
USING (
  verified = true
  OR id = public.get_user_agency_id()
  OR public.is_super_admin()
);

CREATE POLICY agencies_insert_super_admin ON public.agencies
FOR INSERT
WITH CHECK (public.is_super_admin());

CREATE POLICY agencies_update_super_admin ON public.agencies
FOR UPDATE
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY agencies_delete_super_admin ON public.agencies
FOR DELETE
USING (public.is_super_admin());

-- 5.2 profiles policies
CREATE POLICY profiles_select ON public.profiles
FOR SELECT
USING (
  id = auth.uid()
  OR public.is_super_admin()
);

CREATE POLICY profiles_insert_super_admin ON public.profiles
FOR INSERT
WITH CHECK (public.is_super_admin());

CREATE POLICY profiles_update_super_admin ON public.profiles
FOR UPDATE
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY profiles_delete_super_admin ON public.profiles
FOR DELETE
USING (public.is_super_admin());

-- 5.3 projects policies
CREATE POLICY projects_select ON public.projects
FOR SELECT
USING (
  (
    archived_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.agencies
      WHERE agencies.id = projects.agency_id
        AND agencies.verified = true
    )
  )
  OR agency_id = public.get_user_agency_id()
  OR public.is_super_admin()
);

CREATE POLICY projects_insert ON public.projects
FOR INSERT
WITH CHECK (
  public.is_verified_agency_admin(agency_id)
  OR public.is_super_admin()
);

CREATE POLICY projects_update ON public.projects
FOR UPDATE
USING (
  public.is_verified_agency_admin(agency_id)
  OR public.is_super_admin()
)
WITH CHECK (
  public.is_verified_agency_admin(agency_id)
  OR public.is_super_admin()
);

CREATE POLICY projects_delete ON public.projects
FOR DELETE
USING (
  public.is_verified_agency_admin(agency_id)
  OR public.is_super_admin()
);

-- 5.4 landmarks policies
CREATE POLICY landmarks_select ON public.landmarks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = landmarks.project_id
      AND (
        (
          projects.archived_at IS NULL
          AND EXISTS (
            SELECT 1 FROM public.agencies
            WHERE agencies.id = projects.agency_id
              AND agencies.verified = true
          )
        )
        OR projects.agency_id = public.get_user_agency_id()
        OR public.is_super_admin()
      )
  )
);

CREATE POLICY landmarks_insert ON public.landmarks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = landmarks.project_id
      AND (
        public.is_verified_agency_admin(projects.agency_id)
        OR public.is_super_admin()
      )
  )
);

CREATE POLICY landmarks_update ON public.landmarks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = landmarks.project_id
      AND (
        public.is_verified_agency_admin(projects.agency_id)
        OR public.is_super_admin()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = landmarks.project_id
      AND (
        public.is_verified_agency_admin(projects.agency_id)
        OR public.is_super_admin()
      )
  )
);

CREATE POLICY landmarks_delete ON public.landmarks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = landmarks.project_id
      AND (
        public.is_verified_agency_admin(projects.agency_id)
        OR public.is_super_admin()
      )
  )
);

-- 5.5 expenses policies
CREATE POLICY expenses_select ON public.expenses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = expenses.project_id
      AND (
        (
          projects.archived_at IS NULL
          AND EXISTS (
            SELECT 1 FROM public.agencies
            WHERE agencies.id = projects.agency_id
              AND agencies.verified = true
          )
        )
        OR projects.agency_id = public.get_user_agency_id()
        OR public.is_super_admin()
      )
  )
);

CREATE POLICY expenses_insert ON public.expenses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = expenses.project_id
      AND (
        public.is_verified_agency_admin(projects.agency_id)
        OR public.is_super_admin()
      )
  )
);

CREATE POLICY expenses_update ON public.expenses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = expenses.project_id
      AND (
        public.is_verified_agency_admin(projects.agency_id)
        OR public.is_super_admin()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = expenses.project_id
      AND (
        public.is_verified_agency_admin(projects.agency_id)
        OR public.is_super_admin()
      )
  )
);

CREATE POLICY expenses_delete ON public.expenses
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = expenses.project_id
      AND (
        public.is_verified_agency_admin(projects.agency_id)
        OR public.is_super_admin()
      )
  )
);

-- 5.6 audit_logs policies
-- SELECT only for super_admin and respective agency admin. NO insert/update/delete policies for application roles.
CREATE POLICY audit_logs_select ON public.audit_logs
FOR SELECT
USING (
  public.is_super_admin()
  OR agency_id = public.get_user_agency_id()
);

-- 6. Storage Bucket & Policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

DROP POLICY IF EXISTS storage_evidence_select ON storage.objects;
CREATE POLICY storage_evidence_select ON storage.objects
FOR SELECT
USING (bucket_id = 'evidence');

DROP POLICY IF EXISTS storage_evidence_insert ON storage.objects;
CREATE POLICY storage_evidence_insert ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'evidence'
  AND (
    public.is_super_admin()
    OR (
      name LIKE (public.get_user_agency_id()::text || '/%')
      AND public.is_verified_agency_admin(public.get_user_agency_id())
    )
  )
);

DROP POLICY IF EXISTS storage_evidence_update ON storage.objects;
CREATE POLICY storage_evidence_update ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'evidence'
  AND (
    public.is_super_admin()
    OR (
      name LIKE (public.get_user_agency_id()::text || '/%')
      AND public.is_verified_agency_admin(public.get_user_agency_id())
    )
  )
)
WITH CHECK (
  bucket_id = 'evidence'
  AND (
    public.is_super_admin()
    OR (
      name LIKE (public.get_user_agency_id()::text || '/%')
      AND public.is_verified_agency_admin(public.get_user_agency_id())
    )
  )
);

DROP POLICY IF EXISTS storage_evidence_delete ON storage.objects;
CREATE POLICY storage_evidence_delete ON storage.objects
FOR DELETE
USING (
  bucket_id = 'evidence'
  AND (
    public.is_super_admin()
    OR (
      name LIKE (public.get_user_agency_id()::text || '/%')
      AND public.is_verified_agency_admin(public.get_user_agency_id())
    )
  )
);
