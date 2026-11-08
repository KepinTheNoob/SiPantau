"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { delayReportFormSchema } from "@/lib/validation/delay-reports";
import { requireAgencyAccess } from "@/server/auth";
import {
  findDelayOverview,
  submitDelayReportAtomically,
} from "@/server/models/delay-reports";

export type FieldError = {
  readonly field: string;
  readonly message: string;
};

export type DelayReportActionResult = {
  readonly success: boolean;
  readonly message?: string;
  readonly fieldErrors?: readonly FieldError[];
};

/** Admin instansi menjelaskan keterlambatan proyek: alasan, rencana percepatan, target baru. */
export async function submitDelayReport(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<DelayReportActionResult> {
  const parsed = delayReportFormSchema.safeParse({
    projectId: formData.get("projectId"),
    reasonCategoryIds: formData.getAll("reasonCategoryIds"),
    reasonDetail: formData.get("reasonDetail"),
    recoveryPlan: formData.get("recoveryPlan"),
    revisedTargetDate: formData.get("revisedTargetDate"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((issue) => ({
      field: String(issue.path[0] ?? ""),
      message: issue.message,
    }));

    return {
      success: false,
      message: fieldErrors[0]?.message ?? "Data laporan tidak valid.",
      fieldErrors,
    };
  }

  const data = parsed.data;
  await requireAgencyAccess(data.projectId, client);
  const supabase = client ?? (await createSupabaseServerClient());

  const { data: overview } = await findDelayOverview(supabase, data.projectId);

  if (
    overview !== null &&
    data.revisedTargetDate <= overview.effective_target_date
  ) {
    return {
      success: false,
      message: `Target baru harus setelah target yang berlaku sekarang (${overview.effective_target_date}).`,
      fieldErrors: [
        {
          field: "revisedTargetDate",
          message: "Target baru harus setelah target yang berlaku sekarang.",
        },
      ],
    };
  }

  const { error: submitError } = await submitDelayReportAtomically(supabase, {
    projectId: data.projectId,
    reasonDetail: data.reasonDetail,
    recoveryPlan: data.recoveryPlan,
    revisedTargetDate: data.revisedTargetDate,
    reasonCategoryIds: data.reasonCategoryIds,
  });

  if (submitError !== null) {
    return {
      success: false,
      message: `Gagal menyimpan laporan keterlambatan: ${submitError.message}`,
    };
  }

  return {
    success: true,
    message:
      "Laporan keterlambatan tersimpan dan sudah tampil di halaman publik proyek.",
  };
}
