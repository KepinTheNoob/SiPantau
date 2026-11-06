import type { DbClient, TableInsert } from "./db";

export function listProjectImages(db: DbClient, projectId: string) {
  return db
    .from("project_images")
    .select("*")
    .eq("project_id", projectId)
    .order("is_cover", { ascending: false })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
}

/** Foto sampul untuk sekumpulan proyek (dipakai kartu daftar proyek). */
export function listCoverImages(db: DbClient, projectIds: readonly string[]) {
  return db
    .from("project_images")
    .select("project_id, image_path, caption")
    .eq("is_cover", true)
    .in("project_id", [...projectIds]);
}

export function insertProjectImages(
  db: DbClient,
  values: readonly TableInsert<"project_images">[]
) {
  return db.from("project_images").insert([...values]);
}

export function findProjectImage(
  db: DbClient,
  projectId: string,
  imageId: string
) {
  return db
    .from("project_images")
    .select("*")
    .eq("id", imageId)
    .eq("project_id", projectId)
    .maybeSingle();
}

export function clearProjectCover(db: DbClient, projectId: string) {
  return db
    .from("project_images")
    .update({ is_cover: false })
    .eq("project_id", projectId)
    .eq("is_cover", true);
}

export function markProjectImageAsCover(
  db: DbClient,
  projectId: string,
  imageId: string
) {
  return db
    .from("project_images")
    .update({ is_cover: true })
    .eq("id", imageId)
    .eq("project_id", projectId);
}

export function deleteProjectImageInProject(
  db: DbClient,
  projectId: string,
  imageId: string
) {
  return db
    .from("project_images")
    .delete()
    .eq("id", imageId)
    .eq("project_id", projectId);
}

/** Foto tertua yang tersisa, untuk dijadikan sampul pengganti. */
export function findFirstProjectImage(db: DbClient, projectId: string) {
  return db
    .from("project_images")
    .select("id")
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
}

export function countProjectImages(db: DbClient, projectId: string) {
  return db
    .from("project_images")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
}
