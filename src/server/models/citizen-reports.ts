import type { DbClient, TableInsert } from "./db";

export function insertCitizenReport(
  db: DbClient,
  values: TableInsert<"citizen_reports">
) {
  return db.from("citizen_reports").insert(values);
}

export function setCitizenReportStatus(
  db: DbClient,
  projectId: string,
  reportId: string,
  status: "approved" | "rejected"
) {
  return db
    .from("citizen_reports")
    .update({ status })
    .eq("id", reportId)
    .eq("project_id", projectId);
}
