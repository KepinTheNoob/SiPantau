"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  collectImageFiles,
  projectImageActionSchema,
  uploadProjectImagesSchema,
} from "@/lib/validation/images";
import { requireAgencyAccess } from "@/server/auth";
import {
  clearProjectCover,
  countProjectImages,
  deleteProjectImageInProject,
  findFirstProjectImage,
  findProjectImage,
  insertProjectImages,
  listCoverImages,
  markProjectImageAsCover,
} from "@/server/models/project-images";
import { removeEvidenceFiles } from "@/server/models/storage";
import { uploadImagesToFolder } from "./image-upload";

export type ProjectImageActionResult = {
  readonly success: boolean;
  readonly message?: string;
};

export async function uploadProjectImages(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<ProjectImageActionResult> {
  const parsed = uploadProjectImagesSchema.safeParse({
    projectId: formData.get("projectId"),
    caption: formData.get("caption") ?? "",
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Data foto tidak valid.",
    };
  }

  const { projectId, caption } = parsed.data;
  const access = await requireAgencyAccess(projectId, client);
  const collected = collectImageFiles(formData, "images");

  if (!collected.ok) {
    return { success: false, message: collected.message };
  }

  const supabase = client ?? (await createSupabaseServerClient());

  const [{ count }, { data: covers }] = await Promise.all([
    countProjectImages(supabase, projectId),
    listCoverImages(supabase, [projectId]),
  ]);

  const hasCover = (covers ?? []).length > 0;
  const startPosition = count ?? 0;

  const uploaded = await uploadImagesToFolder(
    supabase,
    `${access.agency.id}/${projectId}/gallery`,
    collected.images
  );

  if (!uploaded.ok) {
    return { success: false, message: uploaded.message };
  }

  const { error: insertError } = await insertProjectImages(
    supabase,
    uploaded.paths.map((path, index) => ({
      project_id: projectId,
      image_path: path,
      caption,
      // Foto pertama yang diunggah otomatis jadi sampul kalau proyek belum punya sampul.
      is_cover: !hasCover && index === 0,
      position: startPosition + index,
    }))
  );

  if (insertError !== null) {
    await removeEvidenceFiles(supabase, uploaded.paths);

    return {
      success: false,
      message: `Gagal menyimpan foto: ${insertError.message}`,
    };
  }

  return {
    success: true,
    message: `${uploaded.paths.length} foto berhasil ditambahkan ke galeri.`,
  };
}

export async function setProjectCoverImage(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<ProjectImageActionResult> {
  const parsed = projectImageActionSchema.safeParse({
    projectId: formData.get("projectId"),
    imageId: formData.get("imageId"),
  });

  if (!parsed.success) {
    return { success: false, message: "Data foto tidak valid." };
  }

  const { projectId, imageId } = parsed.data;
  await requireAgencyAccess(projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  const { data: image } = await findProjectImage(supabase, projectId, imageId);

  if (image === null) {
    return { success: false, message: "Foto tidak ditemukan di proyek ini." };
  }

  // Lepas sampul lama dulu karena satu proyek hanya boleh punya satu sampul.
  const { error: clearError } = await clearProjectCover(supabase, projectId);

  if (clearError !== null) {
    return { success: false, message: clearError.message };
  }

  const { error: coverError } = await markProjectImageAsCover(
    supabase,
    projectId,
    imageId
  );

  if (coverError !== null) {
    return { success: false, message: coverError.message };
  }

  return { success: true, message: "Foto sampul berhasil diganti." };
}

export async function deleteProjectImage(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<ProjectImageActionResult> {
  const parsed = projectImageActionSchema.safeParse({
    projectId: formData.get("projectId"),
    imageId: formData.get("imageId"),
  });

  if (!parsed.success) {
    return { success: false, message: "Data foto tidak valid." };
  }

  const { projectId, imageId } = parsed.data;
  await requireAgencyAccess(projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  const { data: image } = await findProjectImage(supabase, projectId, imageId);

  if (image === null) {
    return { success: false, message: "Foto tidak ditemukan di proyek ini." };
  }

  const { error: deleteError } = await deleteProjectImageInProject(
    supabase,
    projectId,
    imageId
  );

  if (deleteError !== null) {
    return { success: false, message: deleteError.message };
  }

  await removeEvidenceFiles(supabase, [image.image_path]);

  if (image.is_cover) {
    const { data: replacement } = await findFirstProjectImage(
      supabase,
      projectId
    );

    if (replacement !== null) {
      await markProjectImageAsCover(supabase, projectId, replacement.id);
    }
  }

  return { success: true, message: "Foto berhasil dihapus dari galeri." };
}
