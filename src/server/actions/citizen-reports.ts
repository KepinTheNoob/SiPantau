"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAgencyAccess } from "@/server/auth";
import {
  citizenReportFormSchema,
  moderateReportSchema,
} from "@/lib/validation/citizen-reports";

export type ReportActionResult = {
  readonly success: boolean;
  readonly message?: string;
  readonly reportId?: string;
};

export async function submitCitizenReport(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<ReportActionResult> {
  const parsed = citizenReportFormSchema.safeParse({
    projectId: formData.get("projectId"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    const errorMsg =
      parsed.error.issues[0]?.message ?? "Isi laporan tidak valid.";

    return {
      success: false,
      message: errorMsg,
    };
  }

  const { projectId, content } = parsed.data;
  const supabase = client ?? (await createSupabaseServerClient());

  let photoPath: string | null = null;
  const photo = formData.get("photo");

  if (photo instanceof File && photo.size > 0 && photo.name !== "undefined") {
    if (photo.size > 5 * 1024 * 1024) {
      return {
        success: false,
        message: "Ukuran foto maksimal 5 MB.",
      };
    }

    const rawExt = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const allowedExts = ["jpg", "jpeg", "png", "webp"];
    const ext = allowedExts.includes(rawExt) ? rawExt : "jpg";

    photoPath = `reports/${projectId}/${Date.now()}.${ext}`;

    await supabase.storage.from("evidence").upload(photoPath, photo, {
      contentType: photo.type || "image/jpeg",
      upsert: true,
    });
  }

  const reportId = crypto.randomUUID();

  const { error: insertError } = await supabase.from("citizen_reports").insert({
    id: reportId,
    project_id: projectId,
    content,
    photo_path: photoPath,
    status: "pending",
  });

  if (insertError !== null) {
    return {
      success: false,
      message:
        insertError.message ??
        "Gagal mengirimkan laporan warga. Pastikan proyek aktif dan terverifikasi.",
    };
  }

  return {
    success: true,
    message:
      "Terima kasih. Laporan Anda berhasil dikirim dan akan diverifikasi oleh tim pengawas instansi sebelum ditampilkan ke publik.",
    reportId,
  };
}

export async function moderateCitizenReport(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<ReportActionResult> {
  const parsed = moderateReportSchema.safeParse({
    reportId: formData.get("reportId"),
    projectId: formData.get("projectId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Data moderasi tidak valid.",
    };
  }

  const { reportId, projectId, status } = parsed.data;
  await requireAgencyAccess(projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  const { error: updateError } = await supabase
    .from("citizen_reports")
    .update({ status })
    .eq("id", reportId)
    .eq("project_id", projectId);

  if (updateError !== null) {
    return {
      success: false,
      message: updateError.message ?? "Gagal memoderasi laporan warga.",
    };
  }

  return {
    success: true,
    message: `Status laporan warga berhasil diubah menjadi ${
      status === "approved" ? "Disetujui" : "Ditolak"
    }.`,
    reportId,
  };
}
