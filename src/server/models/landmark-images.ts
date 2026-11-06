import type { DbClient, TableInsert } from "./db";

export function listLandmarkImages(
  db: DbClient,
  landmarkIds: readonly string[]
) {
  return db
    .from("landmark_images")
    .select("*")
    .in("landmark_id", [...landmarkIds])
    .order("created_at", { ascending: true });
}

export function insertLandmarkImages(
  db: DbClient,
  values: readonly TableInsert<"landmark_images">[]
) {
  return db.from("landmark_images").insert([...values]);
}

export function findLandmarkImage(
  db: DbClient,
  landmarkId: string,
  imageId: string
) {
  return db
    .from("landmark_images")
    .select("*")
    .eq("id", imageId)
    .eq("landmark_id", landmarkId)
    .maybeSingle();
}

export function deleteLandmarkImageById(
  db: DbClient,
  landmarkId: string,
  imageId: string
) {
  return db
    .from("landmark_images")
    .delete()
    .eq("id", imageId)
    .eq("landmark_id", landmarkId);
}
