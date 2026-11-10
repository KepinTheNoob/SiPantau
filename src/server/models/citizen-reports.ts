import type { DbClient, TableInsert } from "./db";

export function insertCitizenReport(
  db: DbClient,
  values: TableInsert<"citizen_reports">
) {
  return db.from("citizen_reports").insert(values);
}

/** Semua laporan warga satu proyek (terbaru dulu) beserta tanggapan instansi. */
export function listProjectCitizenReports(db: DbClient, projectId: string) {
  return db
    .from("citizen_reports")
    .select(
      "id, content, photo_path, created_at, citizen_report_replies (id, body, created_at)"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

/** Laporan yang dikirim satu akun warga, beserta proyek dan tanggapan instansinya. */
export function listCitizenReportsByReporter(db: DbClient, reporterId: string) {
  return db
    .from("citizen_reports")
    .select(
      "id, content, photo_path, created_at, citizen_report_replies (id, body, created_at), projects (title, slug, agencies (name))"
    )
    .eq("reporter_id", reporterId)
    .order("created_at", { ascending: false });
}

/** Laporan pada proyek aktif milik instansi, hanya dengan id tanggapan untuk menghitung yang belum dibalas. */
export function listAgencyCitizenReports(db: DbClient, agencyId: string) {
  return db
    .from("citizen_reports")
    .select(
      "id, content, created_at, projects!inner (id, title, agency_id, archived_at), citizen_report_replies (id)"
    )
    .eq("projects.agency_id", agencyId)
    .is("projects.archived_at", null)
    .order("created_at", { ascending: true });
}

export function findCitizenReportInProject(
  db: DbClient,
  projectId: string,
  reportId: string
) {
  return db
    .from("citizen_reports")
    .select("id")
    .eq("id", reportId)
    .eq("project_id", projectId)
    .maybeSingle();
}

export function insertCitizenReportReply(
  db: DbClient,
  values: TableInsert<"citizen_report_replies">
) {
  return db.from("citizen_report_replies").insert(values);
}
