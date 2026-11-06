"use server";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAgencyAccess } from "@/server/auth";
import {
  deleteLandmarkInProject,
  findLandmarkInProject,
  insertLandmark,
  updateLandmarkInProject,
} from "@/server/models/landmarks";
import {
  removeEvidenceFiles,
  uploadEvidenceFile,
} from "@/server/models/storage";
import {
  landmarkFormSchema,
  updateLandmarkSchema,
  deleteLandmarkSchema,
  reorderLandmarksSchema,
  toggleLandmarkDoneSchema,
} from "@/lib/validation/landmarks";

export type FieldError = {
  readonly field: string;
  readonly message: string;
};

export type LandmarkActionResult = {
  readonly success: boolean;
  readonly message?: string;
  readonly landmarkId?: string;
  readonly fieldErrors?: readonly FieldError[];
};

export async function addLandmark(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<LandmarkActionResult> {
  const parsed = landmarkFormSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    position: formData.get("position"),
    weight: formData.get("weight"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return {
      success: false,
      message: fieldErrors[0]?.message ?? "Data tahapan tidak valid.",
      fieldErrors,
    };
  }

  const data = parsed.data;
  await requireAgencyAccess(data.projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  const { data: newLandmark, error: insertError } = await insertLandmark(
    supabase,
    {
      project_id: data.projectId,
      name: data.name,
      position: data.position,
      weight: data.weight,
    }
  );

  if (insertError !== null || newLandmark === null) {
    return {
      success: false,
      message: insertError?.message ?? "Gagal menambahkan tahapan proyek.",
    };
  }

  return {
    success: true,
    message: "Tahapan berhasil ditambahkan.",
    landmarkId: newLandmark.id,
  };
}

export async function updateLandmark(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<LandmarkActionResult> {
  const parsed = updateLandmarkSchema.safeParse({
    landmarkId: formData.get("landmarkId"),
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    position: formData.get("position"),
    weight: formData.get("weight"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return {
      success: false,
      message: fieldErrors[0]?.message ?? "Data tahapan tidak valid.",
      fieldErrors,
    };
  }

  const data = parsed.data;
  await requireAgencyAccess(data.projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  const { error: updateError } = await updateLandmarkInProject(
    supabase,
    data.projectId,
    data.landmarkId,
    {
      name: data.name,
      position: data.position,
      weight: data.weight,
    }
  );

  if (updateError !== null) {
    return {
      success: false,
      message: updateError.message ?? "Gagal memperbarui tahapan proyek.",
    };
  }

  return {
    success: true,
    message: "Tahapan berhasil diperbarui.",
    landmarkId: data.landmarkId,
  };
}

export async function deleteLandmark(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<LandmarkActionResult> {
  const parsed = deleteLandmarkSchema.safeParse({
    landmarkId: formData.get("landmarkId"),
    projectId: formData.get("projectId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Data tahapan tidak valid.",
    };
  }

  const { projectId, landmarkId } = parsed.data;
  await requireAgencyAccess(projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  const { data: landmark, error: landmarkError } = await findLandmarkInProject(
    supabase,
    projectId,
    landmarkId
  );

  if (landmarkError !== null) {
    return {
      success: false,
      message: `Gagal memuat tahapan proyek: ${landmarkError.message}`,
    };
  }

  if (landmark === null) {
    return {
      success: false,
      message: "Tahapan tidak ditemukan pada proyek ini.",
    };
  }

  const { data: deletedLandmark, error: deleteError } =
    await deleteLandmarkInProject(supabase, projectId, landmarkId);

  if (deleteError !== null || deletedLandmark === null) {
    return {
      success: false,
      message:
        deleteError?.message ?? "Tahapan tidak dapat dihapus dari proyek ini.",
    };
  }

  if (landmark.evidence_path !== null) {
    const { error: storageError } = await removeEvidenceFiles(supabase, [
      landmark.evidence_path,
    ]);

    if (storageError !== null) {
      return {
        success: true,
        message: `Tahapan berhasil dihapus, tetapi berkas buktinya gagal dihapus: ${storageError.message}`,
        landmarkId,
      };
    }
  }

  return {
    success: true,
    message: "Tahapan berhasil dihapus.",
    landmarkId,
  };
}

export async function reorderLandmarks(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<LandmarkActionResult> {
  const rawOrders = z.string().safeParse(formData.get("orders"));

  if (!rawOrders.success) {
    return {
      success: false,
      message: "Format urutan tahapan tidak valid.",
    };
  }

  let parsedJson;

  try {
    parsedJson = JSON.parse(rawOrders.data);
  } catch {
    return {
      success: false,
      message: "Format JSON urutan tahapan tidak valid.",
    };
  }

  const parsed = reorderLandmarksSchema.safeParse({
    projectId: formData.get("projectId"),
    orders: parsedJson,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Daftar urutan tahapan tidak valid.",
    };
  }

  const { projectId, orders } = parsed.data;
  await requireAgencyAccess(projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  for (const item of orders) {
    const { error: reorderError } = await updateLandmarkInProject(
      supabase,
      projectId,
      item.id,
      { position: item.position }
    );

    if (reorderError !== null) {
      return {
        success: false,
        message: reorderError.message ?? "Gagal menyusun ulang urutan tahapan.",
      };
    }
  }

  return {
    success: true,
    message: "Urutan tahapan berhasil diperbarui.",
  };
}

export async function toggleLandmarkDone(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<LandmarkActionResult> {
  const parsed = toggleLandmarkDoneSchema.safeParse({
    projectId: formData.get("projectId"),
    landmarkId: formData.get("landmarkId"),
    done: formData.get("done"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Data status selesai tidak valid.",
    };
  }

  const { projectId, landmarkId, done } = parsed.data;
  const access = await requireAgencyAccess(projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  if (done === "true") {
    const file = formData.get("evidence");

    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.name === "undefined"
    ) {
      return {
        success: false,
        message:
          "Menandai tahapan selesai wajib melampirkan berkas bukti dokumentasi.",
      };
    }

    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        message: "Ukuran berkas bukti maksimal 10 MB.",
      };
    }

    const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const allowedExts = ["jpg", "jpeg", "png", "pdf", "webp"];
    const ext = allowedExts.includes(rawExt) ? rawExt : "jpg";

    const storagePath = `${access.agency.id}/${projectId}/landmarks/${landmarkId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await uploadEvidenceFile(
      supabase,
      storagePath,
      file
    );

    if (uploadError !== null) {
      return {
        success: false,
        message: `Gagal mengunggah bukti ke penyimpanan: ${uploadError.message}`,
      };
    }

    const { error: updateError } = await updateLandmarkInProject(
      supabase,
      projectId,
      landmarkId,
      {
        done: true,
        done_at: new Date().toISOString(),
        evidence_path: storagePath,
      }
    );

    if (updateError !== null) {
      return {
        success: false,
        message:
          updateError.message ?? "Gagal memperbarui status selesai tahapan.",
      };
    }

    return {
      success: true,
      message: "Tahapan berhasil ditandai selesai beserta bukti dokumentasi.",
      landmarkId,
    };
  }

  // done === "false": Batalkan tanda selesai
  const { error: unmarkError } = await updateLandmarkInProject(
    supabase,
    projectId,
    landmarkId,
    {
      done: false,
      done_at: null,
      evidence_path: null,
    }
  );

  if (unmarkError !== null) {
    return {
      success: false,
      message:
        unmarkError.message ?? "Gagal membatalkan status selesai tahapan.",
    };
  }

  return {
    success: true,
    message: "Status selesai tahapan berhasil dibatalkan.",
    landmarkId,
  };
}
