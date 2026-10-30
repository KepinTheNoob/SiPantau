import { getAdminServiceClient } from "./client";
import { requireSuperAdmin } from "@/server/auth";

export async function createAgencyAdminUser(
  {
    email,
    password,
    agencyId,
  }: {
    readonly email: string;
    readonly password: string;
    readonly agencyId: string;
  },
  client?: import("@supabase/supabase-js").SupabaseClient<
    import("@/db/types").Database
  >
): Promise<{ readonly userId: string }> {
  // Pastikan pemanggil memiliki hak akses super_admin
  await requireSuperAdmin(client);

  const adminClient = getAdminServiceClient();

  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError !== null || authData.user === null) {
    throw new Error(
      authError?.message ?? "Gagal membuat akun autentikasi admin instansi."
    );
  }

  const userId = authData.user.id;

  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userId,
    agency_id: agencyId,
    role: "admin",
  });

  if (profileError !== null) {
    // Rollback user auth jika gagal membuat profile
    await adminClient.auth.admin.deleteUser(userId);
    throw new Error(
      `Gagal membuat profil admin instansi: ${profileError.message}`
    );
  }

  return { userId };
}
