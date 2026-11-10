import type { DbClient } from "./db";

/** Bucket publik untuk semua berkas bukti dan foto proyek. */
export const EVIDENCE_BUCKET = "evidence";

export function uploadEvidenceFile(db: DbClient, path: string, file: File) {
  return db.storage.from(EVIDENCE_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
}

export function removeEvidenceFiles(db: DbClient, paths: readonly string[]) {
  return db.storage.from(EVIDENCE_BUCKET).remove([...paths]);
}

/** Unggah berkas baru tanpa menimpa (tidak butuh izin UPDATE di storage). */
export function uploadNewEvidenceFile(db: DbClient, path: string, file: File) {
  return db.storage.from(EVIDENCE_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
}
