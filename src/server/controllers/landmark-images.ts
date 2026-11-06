"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  collectImageFiles,
  landmarkImageActionSchema,
  uploadLandmarkImagesSchema,
} from "@/lib/validation/images";
import { requireAgencyAccess } from "@/server/auth";
import {
  deleteLandmarkImageById,
  findLandmarkImage,
  insertLandmarkImages,
} from "@/server/models/landmark-images";
import { findLandmarkInProject } from "@/server/models/landmarks";
import { removeEvidenceFiles } from "@/server/models/storage";
import { uploadImagesToFolder } from "./image-upload";

export type LandmarkImageActionResult = {
  readonly success: boolean;
  readonly message?: string;
};

/** Foto bukti pengerjaan tahapan. Hanya admin instansi pemilik proyek (dicek di sini dan di RLS). */
export async function uploadLandmarkImages(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<LandmarkImageActionResult> {
  const parsed = uploadLandmarkImagesSchema.safeParse({
    projectId: formData.get("projectId"),
    landmarkId: formData.get("landmarkId"),
    caption: formData.get("caption") ?? "",
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Data foto tidak valid.",
    };
  }

  const { projectId, landmarkId, caption } = parsed.data;
  const access = await requireAgencyAccess(projectId, client);
  const collected = collectImageFiles(formData, "images");

  if (!collected.ok) {
    return { success: false, message: collected.message };
  }

  const supabase = client ?? (await createSupabaseServerClient());

  const { data: landmark } = await findLandmarkInProject(
    supabase,
    projectId,
    landmarkId
  );

  if (landmark === null) {
    return {
      success: false,
      message: "Tahapan tidak ditemukan di proyek ini.",
    };
  }

  const uploaded = await uploadImagesToFolder(
    supabase,
    `${access.agency.id}/${projectId}/landmarks/${landmarkId}/photos`,
    collected.images
  );

  if (!uploaded.ok) {
    return { success: false, message: uploaded.message };
  }

  const { error: insertError } = await insertLandmarkImages(
    supabase,
    uploaded.paths.map((path) => ({
      landmark_id: landmarkId,
      image_path: path,
      caption,
      uploaded_by: access.user.id,
    }))
  );

  if (insertError !== null) {
    await removeEvidenceFiles(supabase, uploaded.paths);

    return {
      success: false,
      message: `Gagal menyimpan foto bukti: ${insertError.message}`,
    };
  }

  return {
    success: true,
    message: `${uploaded.paths.length} foto bukti berhasil ditambahkan.`,
  };
}

export async function deleteLandmarkImage(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<LandmarkImageActionResult> {
  const parsed = landmarkImageActionSchema.safeParse({
    projectId: formData.get("projectId"),
    landmarkId: formData.get("landmarkId"),
    imageId: formData.get("imageId"),
  });

  if (!parsed.success) {
    return { success: false, message: "Data foto tidak valid." };
  }

  const { projectId, landmarkId, imageId } = parsed.data;
  await requireAgencyAccess(projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  const { data: landmark } = await findLandmarkInProject(
    supabase,
    projectId,
    landmarkId
  );

  if (landmark === null) {
    return {
      success: false,
      message: "Tahapan tidak ditemukan di proyek ini.",
    };
  }

  const { data: image } = await findLandmarkImage(
    supabase,
    landmarkId,
    imageId
  );

  if (image === null) {
    return { success: false, message: "Foto bukti tidak ditemukan." };
  }

  const { error: deleteError } = await deleteLandmarkImageById(
    supabase,
    landmarkId,
    imageId
  );

  if (deleteError !== null) {
    return { success: false, message: deleteError.message };
  }

  await removeEvidenceFiles(supabase, [image.image_path]);

  return { success: true, message: "Foto bukti berhasil dihapus." };
}
