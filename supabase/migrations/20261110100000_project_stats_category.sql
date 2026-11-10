-- Migration: kolom category di project_stats untuk filter kategori di dasbor publik dan admin.
-- Definisi sama dengan 20261110080000; category ditambah di akhir agar urutan kolom lama tetap.

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
    WHEN COALESCE(lm.landmark_count, 0) > 0 AND lm.done_count = lm.landmark_count THEN
      CASE
        WHEN lm.last_done_at IS NULL
          OR (lm.last_done_at AT TIME ZONE 'Asia/Jakarta')::date <= p.target_end_date
          THEN 'tepat_waktu'
        ELSE 'terlambat'
      END
    WHEN CURRENT_DATE > p.target_end_date THEN 'terlambat'
    ELSE 'pengerjaan'
  END AS status_waktu,
  (COALESCE(lm.landmark_count, 0) > 0 AND lm.done_count = lm.landmark_count) AS is_completed,
  CASE
    WHEN COALESCE(lm.landmark_count, 0) > 0 AND lm.done_count = lm.landmark_count
      THEN lm.last_done_at
  END AS completed_at,
  p.category
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
    SUM(weight) FILTER (WHERE done = true)::bigint AS done_weight,
    MAX(done_at) FILTER (WHERE done = true) AS last_done_at
  FROM public.landmarks
  GROUP BY project_id
) lm ON lm.project_id = p.id;
