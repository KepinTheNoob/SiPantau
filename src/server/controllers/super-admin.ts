"use server";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/server/auth";
import { setAgencyVerified } from "@/server/models/agencies";
import {
  createAgencyAdminUser,
  deleteAgencyAdminAccount,
  updateAgencyAdminAccount,
} from "@/server/admin-only/accounts";

export type SuperAdminActionResult = {
  readonly success: boolean;
  readonly message?: string;
};

const agencyVerifySchema = z.object({
  agencyId: z.string().uuid("ID instansi tidak valid."),
  verified: z.enum(["true", "false"]),
});

export async function toggleAgencyVerification(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<SuperAdminActionResult> {
  const parsed = agencyVerifySchema.safeParse({
    agencyId: formData.get("agencyId"),
    verified: formData.get("verified"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Data verifikasi instansi tidak valid.",
    };
  }

  const { agencyId, verified } = parsed.data;
  await requireSuperAdmin(client);

  const supabase = client ?? (await createSupabaseServerClient());

  const { error: updateError } = await setAgencyVerified(
    supabase,
    agencyId,
    verified === "true"
  );

  if (updateError !== null) {
    return {
      success: false,
      message: updateError.message ?? "Gagal mengubah status verifikasi.",
    };
  }

  return {
    success: true,
    message: `Status verifikasi instansi berhasil ${
      verified === "true" ? "disetujui" : "dicabut"
    }.`,
  };
}

const createAdminSchema = z.object({
  agencyId: z.string().uuid("ID instansi tidak valid."),
  email: z.string().email("Format email admin tidak valid."),
  password: z
    .string()
    .min(8, "Kata sandi admin minimal 8 karakter demi keamanan."),
});

export async function createAgencyAdminAccount(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<SuperAdminActionResult> {
  const parsed = createAdminSchema.safeParse({
    agencyId: formData.get("agencyId"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Input tidak valid.";

    return {
      success: false,
      message: firstError,
    };
  }

  await requireSuperAdmin(client);

  try {
    await createAgencyAdminUser(parsed.data, client);

    return {
      success: true,
      message: `Akun admin instansi (${parsed.data.email}) berhasil dibuat.`,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal membuat akun admin.";

    return {
      success: false,
      message: errorMsg,
    };
  }
}

const updateAdminSchema = z.object({
  adminId: z.string().uuid("ID admin tidak valid."),
  agencyId: z.string().uuid("ID instansi tidak valid."),
  email: z.string().email("Format email admin tidak valid."),
});

export async function updateAgencyAdmin(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<SuperAdminActionResult> {
  const parsed = updateAdminSchema.safeParse({
    adminId: formData.get("adminId"),
    agencyId: formData.get("agencyId"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Input tidak valid.",
    };
  }

  await requireSuperAdmin(client);

  try {
    await updateAgencyAdminAccount(parsed.data, client);

    return { success: true, message: "Data admin berhasil diperbarui." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengubah admin.",
    };
  }
}

const deleteAdminSchema = z.object({
  adminId: z.string().uuid("ID admin tidak valid."),
});

export async function deleteAgencyAdmin(
  formData: FormData,
  client?: SupabaseClient<Database>
): Promise<SuperAdminActionResult> {
  const parsed = deleteAdminSchema.safeParse({
    adminId: formData.get("adminId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Input tidak valid.",
    };
  }

  await requireSuperAdmin(client);

  try {
    await deleteAgencyAdminAccount(parsed.data.adminId, client);

    return { success: true, message: "Akun admin berhasil dihapus." };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal menghapus admin.",
    };
  }
}
