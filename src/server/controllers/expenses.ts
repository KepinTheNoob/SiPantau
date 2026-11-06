"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAgencyAccess } from "@/server/auth";
import {
  deleteExpenseInProject,
  insertExpense,
  updateExpenseInProject,
} from "@/server/models/expenses";
import { uploadEvidenceFile } from "@/server/models/storage";
import {
  expenseFormSchema,
  updateExpenseSchema,
  deleteExpenseSchema,
} from "@/lib/validation/expenses";

export type FieldError = {
  readonly field: string;
  readonly message: string;
};

export type ExpenseActionResult = {
  readonly success: boolean;
  readonly message?: string;
  readonly expenseId?: string;
  readonly fieldErrors?: readonly FieldError[];
};

export async function addExpense(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<ExpenseActionResult> {
  const parsed = expenseFormSchema.safeParse({
    projectId: formData.get("projectId"),
    landmarkId: formData.get("landmarkId") || null,
    amount: formData.get("amount"),
    note: formData.get("note"),
    spent_at: formData.get("spent_at") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return {
      success: false,
      message: fieldErrors[0]?.message ?? "Data pengeluaran tidak valid.",
      fieldErrors,
    };
  }

  const data = parsed.data;
  const access = await requireAgencyAccess(data.projectId, client);

  const file = formData.get("evidence");
  let storagePath: string | null = null;

  const supabase = client ?? (await createSupabaseServerClient());

  if (file instanceof File && file.size > 0 && file.name !== "undefined") {
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        message: "Ukuran berkas bukti maksimal 10 MB.",
      };
    }

    const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const allowedExts = ["jpg", "jpeg", "png", "pdf", "webp"];
    const ext = allowedExts.includes(rawExt) ? rawExt : "jpg";

    storagePath = `${access.agency.id}/${data.projectId}/expenses/${Date.now()}.${ext}`;

    const { error: uploadError } = await uploadEvidenceFile(
      supabase,
      storagePath,
      file
    );

    if (uploadError !== null) {
      return {
        success: false,
        message: `Gagal mengunggah bukti pengeluaran: ${uploadError.message}`,
      };
    }
  } else {
    return {
      success: false,
      message:
        "Pencatatan realisasi anggaran wajib melampirkan berkas bukti/kuitansi.",
    };
  }

  const { data: newExpense, error: insertError } = await insertExpense(
    supabase,
    {
      project_id: data.projectId,
      landmark_id: data.landmarkId ?? null,
      amount: data.amount,
      note: data.note,
      spent_at: data.spent_at
        ? new Date(data.spent_at).toISOString()
        : new Date().toISOString(),
      evidence_path: storagePath,
    }
  );

  if (insertError !== null || newExpense === null) {
    return {
      success: false,
      message: insertError?.message ?? "Gagal menyimpan pengeluaran anggaran.",
    };
  }

  return {
    success: true,
    message: "Realisasi anggaran berhasil dicatat.",
    expenseId: newExpense.id,
  };
}

export async function updateExpense(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<ExpenseActionResult> {
  const parsed = updateExpenseSchema.safeParse({
    expenseId: formData.get("expenseId"),
    projectId: formData.get("projectId"),
    landmarkId: formData.get("landmarkId") || null,
    amount: formData.get("amount"),
    note: formData.get("note"),
    spent_at: formData.get("spent_at") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return {
      success: false,
      message: fieldErrors[0]?.message ?? "Data pengeluaran tidak valid.",
      fieldErrors,
    };
  }

  const data = parsed.data;
  await requireAgencyAccess(data.projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  const { error: updateError } = await updateExpenseInProject(
    supabase,
    data.projectId,
    data.expenseId,
    {
      landmark_id: data.landmarkId ?? null,
      amount: data.amount,
      note: data.note,
      spent_at: data.spent_at
        ? new Date(data.spent_at).toISOString()
        : undefined,
    }
  );

  if (updateError !== null) {
    return {
      success: false,
      message: updateError.message ?? "Gagal memperbarui catatan pengeluaran.",
    };
  }

  return {
    success: true,
    message: "Catatan pengeluaran berhasil diperbarui.",
    expenseId: data.expenseId,
  };
}

export async function deleteExpense(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<ExpenseActionResult> {
  const parsed = deleteExpenseSchema.safeParse({
    projectId: formData.get("projectId"),
    expenseId: formData.get("expenseId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Data pengeluaran tidak valid.",
    };
  }

  const { projectId, expenseId } = parsed.data;
  await requireAgencyAccess(projectId, client);

  const supabase = client ?? (await createSupabaseServerClient());

  const { error: deleteError } = await deleteExpenseInProject(
    supabase,
    projectId,
    expenseId
  );

  if (deleteError !== null) {
    return {
      success: false,
      message: deleteError.message ?? "Gagal menghapus pengeluaran.",
    };
  }

  return {
    success: true,
    message: "Catatan pengeluaran berhasil dihapus.",
    expenseId,
  };
}
