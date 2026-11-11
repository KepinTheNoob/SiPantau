import type { DbClient, TableInsert, TableUpdate } from "./db";

export function insertProject(db: DbClient, values: TableInsert<"projects">) {
  return db.from("projects").insert(values).select().single();
}

export function updateProjectById(
  db: DbClient,
  projectId: string,
  values: TableUpdate<"projects">
) {
  return db.from("projects").update(values).eq("id", projectId);
}

export function deleteProjectById(db: DbClient, projectId: string) {
  return db.from("projects").delete().eq("id", projectId);
}

export function findProjectById(db: DbClient, projectId: string) {
  return db.from("projects").select("*").eq("id", projectId).maybeSingle();
}

/** Kategori yang dipakai proyek; dipersempit dengan `.eq("agency_id", ...)` bila perlu. */
export function listProjectCategories(db: DbClient) {
  return db.from("projects").select("category");
}

/** Jadwal dan pagu proyek aktif instansi, untuk ringkasan tahunan. */
export function listAgencyProjectSchedules(db: DbClient, agencyId: string) {
  return db
    .from("projects")
    .select("id, start_date, target_end_date, budget_total")
    .eq("agency_id", agencyId)
    .is("archived_at", null);
}
