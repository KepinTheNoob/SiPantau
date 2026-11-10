"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin, requireAgencyAccess } from "@/server/auth";
import {
  deleteProjectById,
  insertProject,
  updateProjectById,
} from "@/server/models/projects";
import { insertLandmarks } from "@/server/models/landmarks";
import type { TableUpdate } from "@/server/models/db";
import { ForbiddenError, UnverifiedAgencyError } from "@/server/auth/errors";
import {
  createProjectSchema,
  initialLandmarksSchema,
  updateProjectSchema,
  archiveProjectSchema,
} from "@/lib/validation/projects";

export type FieldError = {
  readonly field: string;
  readonly message: string;
};

export type ProjectActionResult = {
  readonly success: boolean;
  readonly message?: string;
  readonly projectId?: string;
  readonly fieldErrors?: readonly FieldError[];
};

/** Menggabungkan field `landmark_name[]` dan `landmark_weight[]` dari form menjadi daftar tahapan. */
function readInitialLandmarks(formData: FormData): readonly {
  readonly name: FormDataEntryValue;
  readonly weight: FormDataEntryValue;
}[] {
  const names = formData.getAll("landmark_name");
  const weights = formData.getAll("landmark_weight");

  return names.map((name, index) => ({ name, weight: weights[index] ?? "" }));
}

export async function createProject(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<ProjectActionResult> {
  const parsed = createProjectSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    category: formData.get("category"),
    location_name: formData.get("location_name"),
    budget_total: formData.get("budget_total"),
    start_date: formData.get("start_date"),
    target_end_date: formData.get("target_end_date"),
    lat: formData.get("lat") || null,
    lng: formData.get("lng") || null,
    objective: formData.get("objective") ?? "",
    impact: formData.get("impact") ?? "",
  });

  const parsedLandmarks = initialLandmarksSchema.safeParse(
    readInitialLandmarks(formData)
  );

  if (!parsed.success || !parsedLandmarks.success) {
    const projectIssues = parsed.success ? [] : parsed.error.issues;

    const landmarkIssues = parsedLandmarks.success
      ? []
      : parsedLandmarks.error.issues;

    const fieldErrors = [
      ...projectIssues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
      ...landmarkIssues.map((issue) => ({
        field: ["landmarks", ...issue.path].join("."),
        message: issue.message,
      })),
    ];

    return {
      success: false,
      message: fieldErrors[0]?.message ?? "Data input proyek tidak valid.",
      fieldErrors,
    };
  }

  const supabase = client ?? (await createSupabaseServerClient());
  const current = await requireAdmin(client);

  if (current.profile.agency_id === null) {
    throw new ForbiddenError(
      "Akun admin Anda belum terhubung ke instansi mana pun."
    );
  }

  if (current.agency === null || !current.agency.verified) {
    throw new UnverifiedAgencyError(
      "Instansi Anda belum terverifikasi oleh Super Admin."
    );
  }

  const data = parsed.data;

  const { data: newProject, error: insertError } = await insertProject(
    supabase,
    {
      agency_id: current.profile.agency_id,
      title: data.title,
      slug: data.slug,
      description: data.description,
      category: data.category,
      location_name: data.location_name,
      budget_total: data.budget_total,
      start_date: data.start_date,
      target_end_date: data.target_end_date,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      objective: data.objective,
      impact: data.impact,
    }
  );

  if (insertError !== null || newProject === null) {
    return {
      success: false,
      message:
        insertError?.message.includes("unique") ||
        insertError?.message.includes("slug")
          ? "Slug proyek sudah digunakan. Silakan gunakan slug lain."
          : (insertError?.message ?? "Gagal menyimpan proyek baru."),
    };
  }

  const { error: landmarksError } = await insertLandmarks(
    supabase,
    parsedLandmarks.data.map((landmark, index) => ({
      project_id: newProject.id,
      name: landmark.name,
      weight: landmark.weight,
      position: index + 1,
    }))
  );

  // Proyek tanpa tahapan tidak boleh tersimpan: batalkan proyek bila tahapan gagal disimpan.
  if (landmarksError !== null) {
    await deleteProjectById(supabase, newProject.id);

    return {
      success: false,
      message: `Gagal menyimpan tahapan proyek, proyek tidak dibuat: ${landmarksError.message}`,
    };
  }

  return {
    success: true,
    message: "Proyek berhasil dibuat.",
    projectId: newProject.id,
  };
}

export async function updateProject(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<ProjectActionResult> {
  const parsed = updateProjectSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    category: formData.get("category"),
    location_name: formData.get("location_name"),
    budget_total: formData.get("budget_total"),
    start_date: formData.get("start_date"),
    target_end_date: formData.get("target_end_date"),
    lat: formData.get("lat") || null,
    lng: formData.get("lng") || null,
    objective: formData.get("objective") ?? "",
    impact: formData.get("impact") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return {
      success: false,
      message: fieldErrors[0]?.message ?? "Data input proyek tidak valid.",
      fieldErrors,
    };
  }

  const data = parsed.data;
  // Memverifikasi izin kepemilikan instansi & status verifikasi instansi
  await requireAgencyAccess(data.projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  // Tujuan & dampak hanya ditimpa bila field dikirim, supaya klien lama tidak mengosongkannya.
  const narrativeUpdate: Pick<
    TableUpdate<"projects">,
    "objective" | "impact"
  > = {};

  if (formData.has("objective")) {
    narrativeUpdate.objective = data.objective;
  }

  if (formData.has("impact")) {
    narrativeUpdate.impact = data.impact;
  }

  const { error: updateError } = await updateProjectById(
    supabase,
    data.projectId,
    {
      title: data.title,
      slug: data.slug,
      description: data.description,
      category: data.category,
      location_name: data.location_name,
      budget_total: data.budget_total,
      start_date: data.start_date,
      target_end_date: data.target_end_date,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      ...narrativeUpdate,
    }
  );

  if (updateError !== null) {
    return {
      success: false,
      message: updateError.message ?? "Gagal memperbarui data proyek.",
    };
  }

  return {
    success: true,
    message: "Data proyek berhasil diperbarui.",
    projectId: data.projectId,
  };
}

export async function archiveProject(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<ProjectActionResult> {
  const parsed = archiveProjectSchema.safeParse({
    projectId: formData.get("projectId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "ID proyek tidak valid.",
    };
  }

  const { projectId } = parsed.data;

  // Memverifikasi izin kepemilikan instansi
  await requireAgencyAccess(projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  const { error: archiveError } = await updateProjectById(supabase, projectId, {
    archived_at: new Date().toISOString(),
  });

  if (archiveError !== null) {
    return {
      success: false,
      message: archiveError.message ?? "Gagal mengarsipkan proyek.",
    };
  }

  return {
    success: true,
    message: "Proyek berhasil diarsipkan.",
    projectId,
  };
}
