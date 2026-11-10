"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAgencyAccess } from "@/server/auth";
import {
  findCitizenReportInProject,
  insertCitizenReport,
  insertCitizenReportReply,
} from "@/server/models/citizen-reports";
import { uploadNewEvidenceFile } from "@/server/models/storage";
import {
  citizenReportFormSchema,
  citizenReportReplySchema,
} from "@/lib/validation/citizen-reports";

export type ReportActionResult = {
  readonly success: boolean;
  readonly message?: string;
  readonly reportId?: string;
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const ALLOWED_PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

/** Warga yang sudah masuk mengirim laporan; laporan langsung tampil di halaman publik proyek. */
export async function submitCitizenReport(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<ReportActionResult> {
  const parsed = citizenReportFormSchema.safeParse({
    projectId: formData.get("projectId"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Isi laporan tidak valid.",
    };
  }

  const { projectId, content } = parsed.data;
  const supabase = client ?? (await createSupabaseServerClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    return {
      success: false,
      message: "Silakan masuk dulu untuk mengirim laporan.",
    };
  }

  let photoPath: string | null = null;
  const photo = formData.get("photo");

  if (photo instanceof File && photo.size > 0 && photo.name !== "undefined") {
    if (photo.size > MAX_PHOTO_BYTES) {
      return {
        success: false,
        message: "Ukuran foto maksimal 5 MB.",
      };
    }

    const rawExt = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const ext = ALLOWED_PHOTO_EXTENSIONS.includes(rawExt) ? rawExt : "jpg";

    // Folder per akun: storage hanya mengizinkan warga menulis ke reports/<id akunnya>/.
    photoPath = `reports/${user.id}/${projectId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await uploadNewEvidenceFile(
      supabase,
      photoPath,
      photo
    );

    if (uploadError !== null) {
      return {
        success: false,
        message: "Foto gagal diunggah. Coba lagi atau kirim tanpa foto.",
      };
    }
  }

  const reportId = crypto.randomUUID();

  const { error: insertError } = await insertCitizenReport(supabase, {
    id: reportId,
    project_id: projectId,
    reporter_id: user.id,
    content,
    photo_path: photoPath,
  });

  if (insertError !== null) {
    return {
      success: false,
      message:
        "Gagal mengirim laporan. Pastikan proyek masih aktif dan dikelola instansi terverifikasi.",
    };
  }

  return {
    success: true,
    message:
      "Terima kasih. Laporan Anda sudah tampil di halaman proyek ini. Tanggapan instansi bisa dipantau di menu PantauLaporan.",
    reportId,
  };
}

/** Admin instansi menanggapi laporan warga dengan tulisan; tanggapan langsung tampil ke publik. */
export async function replyToCitizenReport(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<ReportActionResult> {
  const parsed = citizenReportReplySchema.safeParse({
    reportId: formData.get("reportId"),
    projectId: formData.get("projectId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Tanggapan tidak valid.",
    };
  }

  const { reportId, projectId, body } = parsed.data;
  await requireAgencyAccess(projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  const { data: report } = await findCitizenReportInProject(
    supabase,
    projectId,
    reportId
  );

  if (report === null) {
    return {
      success: false,
      message: "Laporan tidak ditemukan pada proyek ini.",
    };
  }

  const { error: insertError } = await insertCitizenReportReply(supabase, {
    report_id: reportId,
    body,
  });

  if (insertError !== null) {
    return {
      success: false,
      message:
        "Gagal menyimpan tanggapan. Pastikan instansi Anda sudah terverifikasi.",
    };
  }

  return {
    success: true,
    message: "Tanggapan tersimpan dan sudah tampil di halaman publik proyek.",
    reportId,
  };
}
