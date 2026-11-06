import { z } from "zod";

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const IMAGE_MAX_FILES_PER_UPLOAD = 5;

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

/** Ekstensi berkas dari tipe MIME, atau null bila bukan JPG/PNG/WebP. */
export function imageExtensionFor(mimeType: string): string | null {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

export const uploadProjectImagesSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
  caption: z.string().trim().max(200, "Keterangan maksimal 200 karakter."),
});

export const projectImageActionSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
  imageId: z.string().uuid("ID foto tidak valid."),
});

export const uploadLandmarkImagesSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
  landmarkId: z.string().uuid("ID tahapan tidak valid."),
  caption: z.string().trim().max(200, "Keterangan maksimal 200 karakter."),
});

export const landmarkImageActionSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
  landmarkId: z.string().uuid("ID tahapan tidak valid."),
  imageId: z.string().uuid("ID foto tidak valid."),
});

export type CollectedImage = {
  readonly file: File;
  readonly extension: string;
};

export type CollectImagesResult =
  | { readonly ok: true; readonly images: readonly CollectedImage[] }
  | { readonly ok: false; readonly message: string };

/** Mengambil dan memeriksa berkas gambar dari field form `fieldName` (boleh lebih dari satu). */
export function collectImageFiles(
  formData: FormData,
  fieldName: string
): CollectImagesResult {
  const images: CollectedImage[] = [];

  for (const entry of formData.getAll(fieldName)) {
    if (!(entry instanceof File) || entry.size === 0) {
      continue;
    }

    const extension = imageExtensionFor(entry.type);

    if (extension === null) {
      return {
        ok: false,
        message: `"${entry.name}" bukan gambar JPG, PNG, atau WebP.`,
      };
    }

    if (entry.size > IMAGE_MAX_BYTES) {
      return {
        ok: false,
        message: `"${entry.name}" lebih dari 5 MB.`,
      };
    }

    images.push({ file: entry, extension });
  }

  if (images.length === 0) {
    return { ok: false, message: "Pilih minimal satu foto." };
  }

  if (images.length > IMAGE_MAX_FILES_PER_UPLOAD) {
    return {
      ok: false,
      message: `Maksimal ${IMAGE_MAX_FILES_PER_UPLOAD} foto sekali unggah.`,
    };
  }

  return { ok: true, images };
}
