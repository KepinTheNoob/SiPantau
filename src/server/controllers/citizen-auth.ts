"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  citizenSignInSchema,
  citizenSignUpSchema,
} from "@/lib/validation/citizen-auth";

export type CitizenAuthResult = {
  readonly success: boolean;
  readonly message?: string;
  /** true bila akun dibuat tetapi email harus dikonfirmasi sebelum bisa masuk. */
  readonly needsEmailConfirmation?: boolean;
};

export async function citizenSignInAction(
  formData: FormData
): Promise<CitizenAuthResult> {
  const parsed = citizenSignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Data masuk tidak valid.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error !== null) {
    return {
      success: false,
      message:
        error.code === "email_not_confirmed"
          ? "Email belum dikonfirmasi. Buka tautan konfirmasi di email Anda dulu."
          : "Email atau kata sandi salah.",
    };
  }

  return { success: true };
}

export async function citizenSignUpAction(
  formData: FormData
): Promise<CitizenAuthResult> {
  const parsed = citizenSignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ?? "Data pendaftaran tidak valid.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error !== null) {
    return {
      success: false,
      message:
        error.code === "user_already_exists"
          ? "Email ini sudah terdaftar. Silakan masuk."
          : `Pendaftaran gagal: ${error.message}`,
    };
  }

  if (data.session === null) {
    return {
      success: true,
      needsEmailConfirmation: true,
      message:
        "Akun dibuat. Buka tautan konfirmasi yang dikirim ke email Anda, lalu masuk.",
    };
  }

  return { success: true };
}

export async function citizenSignOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();
}
