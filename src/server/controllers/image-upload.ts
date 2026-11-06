import type { CollectedImage } from "@/lib/validation/images";
import type { DbClient } from "@/server/models/db";
import {
  removeEvidenceFiles,
  uploadEvidenceFile,
} from "@/server/models/storage";

export type UploadedFilesResult =
  | { readonly ok: true; readonly paths: readonly string[] }
  | { readonly ok: false; readonly message: string };

/**
 * Mengunggah beberapa gambar ke `folder`. Kalau salah satu gagal,
 * berkas yang sudah terunggah dihapus lagi supaya tidak ada sampah di storage.
 */
export async function uploadImagesToFolder(
  db: DbClient,
  folder: string,
  images: readonly CollectedImage[]
): Promise<UploadedFilesResult> {
  const paths: string[] = [];

  for (const image of images) {
    const path = `${folder}/${crypto.randomUUID()}.${image.extension}`;
    const { error } = await uploadEvidenceFile(db, path, image.file);

    if (error !== null) {
      if (paths.length > 0) {
        await removeEvidenceFiles(db, paths);
      }

      return {
        ok: false,
        message: `Gagal mengunggah "${image.file.name}": ${error.message}`,
      };
    }

    paths.push(path);
  }

  return { ok: true, paths };
}
