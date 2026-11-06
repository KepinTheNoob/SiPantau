import type { DbClient, TableInsert, TableUpdate } from "./db";

export function insertLandmark(db: DbClient, values: TableInsert<"landmarks">) {
  return db.from("landmarks").insert(values).select().single();
}

export function insertLandmarks(
  db: DbClient,
  values: readonly TableInsert<"landmarks">[]
) {
  return db.from("landmarks").insert([...values]);
}

/** Mengubah satu tahapan, dibatasi pada proyeknya supaya tidak bisa menyentuh proyek lain. */
export function updateLandmarkInProject(
  db: DbClient,
  projectId: string,
  landmarkId: string,
  values: TableUpdate<"landmarks">
) {
  return db
    .from("landmarks")
    .update(values)
    .eq("id", landmarkId)
    .eq("project_id", projectId);
}

export function findLandmarkInProject(
  db: DbClient,
  projectId: string,
  landmarkId: string
) {
  return db
    .from("landmarks")
    .select("id, evidence_path")
    .eq("id", landmarkId)
    .eq("project_id", projectId)
    .maybeSingle();
}

export function deleteLandmarkInProject(
  db: DbClient,
  projectId: string,
  landmarkId: string
) {
  return db
    .from("landmarks")
    .delete()
    .eq("id", landmarkId)
    .eq("project_id", projectId)
    .select("id")
    .maybeSingle();
}
