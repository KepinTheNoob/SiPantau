"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { findProfileRole } from "@/server/models/profiles";

export type AuthActionResult = {
  readonly success: boolean;
  readonly message?: string;
  readonly requireMfa?: boolean;
};

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(6, "Kata sandi minimal 6 karakter."),
  totpCode: z.string().optional(),
});

export async function loginAction(
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    totpCode: formData.get("totpCode") || undefined,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Input tidak valid.";

    return { success: false, message: firstError };
  }

  const { email, password, totpCode } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError !== null || signInData.user === null) {
    return {
      success: false,
      message: signInError?.message ?? "Email atau kata sandi salah.",
    };
  }

  // Check MFA level
  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (
    aalData !== null &&
    aalData.nextLevel === "aal2" &&
    aalData.currentLevel !== "aal2"
  ) {
    if (totpCode === undefined || totpCode.trim() === "") {
      return {
        success: false,
        requireMfa: true,
        message: "Masukkan kode 6 digit dari aplikasi autentikator Anda.",
      };
    }

    const { data: factorsData, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError !== null || factorsData.totp.length === 0) {
      return {
        success: false,
        message: "Faktor TOTP tidak ditemukan pada akun ini.",
      };
    }

    const factor = factorsData.totp[0];

    if (factor === undefined) {
      return {
        success: false,
        message: "Faktor autentikasi TOTP tidak valid.",
      };
    }

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });

    if (challengeError !== null) {
      return {
        success: false,
        message:
          challengeError.message ?? "Gagal membuat challenge verifikasi TOTP.",
      };
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challengeData.id,
      code: totpCode.trim(),
    });

    if (verifyError !== null) {
      return {
        success: false,
        requireMfa: true,
        message: "Kode TOTP salah atau telah kedaluwarsa.",
      };
    }
  }

  const { data: profile, error: profileError } = await findProfileRole(
    supabase,
    signInData.user.id
  );

  if (profileError !== null || profile === null) {
    await supabase.auth.signOut();

    return {
      success: false,
      message:
        profileError?.message ??
        "Akun ini bukan akun pengelola instansi. Warga cukup masuk dari halaman proyek saat membuat laporan.",
    };
  }

  if (profile.role === "super_admin") {
    redirect("/super-admin");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  await supabase.auth.signOut();

  return {
    success: false,
    message: "Akun tidak memiliki peran pengelola yang valid.",
  };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin-login");
}
