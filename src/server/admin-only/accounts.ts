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

export type UserAccountItem = {
  readonly id: string;
  readonly email: string;
  readonly role: "admin" | "super_admin" | "user";
  readonly agencyId: string | null;
  readonly agencyName: string | null;
  readonly agencyRegion: string | null;
  readonly createdAt: string;
  readonly lastSignInAt: string | null;
  readonly isEmailConfirmed: boolean;
};

export async function listUserAccounts(
  client?: import("@supabase/supabase-js").SupabaseClient<
    import("@/db/types").Database
  >
): Promise<readonly UserAccountItem[]> {
  // Pastikan pemanggil memiliki hak akses super_admin
  await requireSuperAdmin(client);

  const adminClient = getAdminServiceClient();

  const { data: usersData, error: usersError } =
    await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (usersError !== null) {
    throw new Error(`Gagal memuat daftar pengguna: ${usersError.message}`);
  }

  const { data: profilesData } = await adminClient
    .from("profiles")
    .select("id, role, agency_id");

  const { data: agenciesData } = await adminClient
    .from("agencies")
    .select("id, name, region");

  const profilesMap = new Map<
    string,
    { readonly role: string; readonly agency_id: string | null }
  >();

  if (profilesData !== null) {
    for (const profile of profilesData) {
      profilesMap.set(profile.id, {
        role: profile.role,
        agency_id: profile.agency_id,
      });
    }
  }

  const agenciesMap = new Map<
    string,
    { readonly name: string; readonly region: string }
  >();

  if (agenciesData !== null) {
    for (const agency of agenciesData) {
      agenciesMap.set(agency.id, {
        name: agency.name,
        region: agency.region,
      });
    }
  }

  const accounts: UserAccountItem[] = [];

  for (const user of usersData.users) {
    const profile = profilesMap.get(user.id);

    const agency =
      profile?.agency_id !== null && profile?.agency_id !== undefined
        ? agenciesMap.get(profile.agency_id)
        : undefined;

    const role: "admin" | "super_admin" | "user" =
      profile?.role === "super_admin"
        ? "super_admin"
        : profile?.role === "admin"
          ? "admin"
          : "user";

    const isConfirmed =
      user.email_confirmed_at !== null &&
      user.email_confirmed_at !== undefined &&
      user.email_confirmed_at !== "";

    accounts.push({
      id: user.id,
      email: user.email ?? "Tanpa Email",
      role,
      agencyId: profile?.agency_id ?? null,
      agencyName: agency?.name ?? null,
      agencyRegion: agency?.region ?? null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      isEmailConfirmed: isConfirmed,
    });
  }

  accounts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return accounts;
}
