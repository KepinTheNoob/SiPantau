import type { DbClient } from "./db";

export function listDelayReasonCategories(db: DbClient) {
  return db
    .from("delay_reason_categories")
    .select("id, code, label")
    .order("position", { ascending: true });
}

/** Riwayat laporan keterlambatan satu proyek (terbaru dulu) beserta jenis alasannya. */
export function listDelayReportsForProject(db: DbClient, projectId: string) {
  return db
    .from("project_delay_reports")
    .select(
      "id, reason_detail, recovery_plan, revised_target_date, created_at, delay_report_reasons (delay_reason_categories (id, label))"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

export function findDelayOverview(db: DbClient, projectId: string) {
  return db
    .from("project_delay_overview")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
}

export function listDelayOverviews(
  db: DbClient,
  projectIds: readonly string[]
) {
  return db
    .from("project_delay_overview")
    .select("*")
    .in("project_id", [...projectIds]);
}

/** Ringkasan proyek instansi yang sudah lewat target efektif dan belum selesai. */
export function listOverviewsNeedingDelayReport(
  db: DbClient,
  agencyId: string
) {
  return db
    .from("project_delay_overview")
    .select(
      "project_id, original_target_date, effective_target_date, latest_report_id"
    )
    .eq("agency_id", agencyId)
    .eq("needs_delay_report", true)
    .order("effective_target_date", { ascending: true });
}

export function listActiveProjectTitles(
  db: DbClient,
  projectIds: readonly string[]
) {
  return db
    .from("projects")
    .select("id, title, slug")
    .in("id", [...projectIds])
    .is("archived_at", null);
}

/** Menyimpan laporan beserta jenis alasannya secara atomik (fungsi SQL submit_delay_report). */
export function submitDelayReportAtomically(
  db: DbClient,
  values: {
    readonly projectId: string;
    readonly reasonDetail: string;
    readonly recoveryPlan: string;
    readonly revisedTargetDate: string;
    readonly reasonCategoryIds: readonly number[];
  }
) {
  return db.rpc("submit_delay_report", {
    p_project_id: values.projectId,
    p_reason_detail: values.reasonDetail,
    p_recovery_plan: values.recoveryPlan,
    p_revised_target_date: values.revisedTargetDate,
    p_reason_category_ids: [...values.reasonCategoryIds],
  });
}

export type PendingDelayProjectRow = {
  readonly projectId: string;
  readonly title: string;
  readonly originalTargetDate: string;
  readonly effectiveTargetDate: string;
  readonly hasPreviousReport: boolean;
};

/** Proyek aktif instansi yang sudah lewat target efektif, belum selesai, dan butuh laporan. */
export async function loadPendingDelayProjects(
  db: DbClient,
  agencyId: string
): Promise<readonly PendingDelayProjectRow[]> {
  const { data: overviews, error } = await listOverviewsNeedingDelayReport(
    db,
    agencyId
  );

  if (error !== null || overviews.length === 0) {
    return [];
  }

  const { data: projects } = await listActiveProjectTitles(
    db,
    overviews.map((overview) => overview.project_id)
  );

  const titleById = new Map(
    (projects ?? []).map((project) => [project.id, project.title])
  );

  const pending: PendingDelayProjectRow[] = [];

  for (const overview of overviews) {
    const title = titleById.get(overview.project_id);

    if (title === undefined) {
      continue;
    }

    pending.push({
      projectId: overview.project_id,
      title,
      originalTargetDate: overview.original_target_date,
      effectiveTargetDate: overview.effective_target_date,
      hasPreviousReport: overview.latest_report_id !== null,
    });
  }

  return pending;
}

export type DelayReportViewRow = {
  readonly id: string;
  readonly reasonDetail: string;
  readonly recoveryPlan: string;
  readonly revisedTargetDate: string;
  readonly createdAt: string;
  readonly reasons: readonly string[];
};

/** Riwayat laporan dalam bentuk siap tampil (label alasan sudah diambil dari lookup). */
export async function loadDelayReportViews(
  db: DbClient,
  projectId: string
): Promise<readonly DelayReportViewRow[]> {
  const { data, error } = await listDelayReportsForProject(db, projectId);

  if (error !== null) {
    return [];
  }

  return data.map((report) => ({
    id: report.id,
    reasonDetail: report.reason_detail,
    recoveryPlan: report.recovery_plan,
    revisedTargetDate: report.revised_target_date,
    createdAt: report.created_at,
    reasons: report.delay_report_reasons.flatMap((reason) =>
      reason.delay_reason_categories === null
        ? []
        : [reason.delay_reason_categories.label]
    ),
  }));
}
