import { getAdminServiceClient } from "./client";
import type { Database } from "@/db/types";
import { requireSuperAdmin } from "@/server/auth";

export type AgencyAdminAccount = {
  readonly id: string;
  readonly agency_id: string | null;
  readonly created_at: string;
  readonly email: string | null;
};

export async function updateAgencyAdminAccount(
  {
    adminId,
    email,
    agencyId,
  }: {
    readonly adminId: string;
    readonly email: string;
    readonly agencyId: string;
  },
  client?: import("@supabase/supabase-js").SupabaseClient<Database>
): Promise<void> {
  await requireSuperAdmin(client);

  const adminClient = getAdminServiceClient();

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, agency_id")
    .eq("id", adminId)
    .eq("role", "admin")
    .maybeSingle();

  if (profileError !== null) {
    throw new Error(`Gagal memuat data admin: ${profileError.message}`);
  }

  if (profile === null) {
    throw new Error("Admin instansi tidak ditemukan.");
  }

  const { data: authData, error: userError } =
    await adminClient.auth.admin.getUserById(adminId);

  if (userError !== null || authData.user === null) {
    throw new Error(
      userError?.message ?? "Akun autentikasi admin tidak ditemukan."
    );
  }

  const { error: profileUpdateError } = await adminClient
    .from("profiles")
    .update({ agency_id: agencyId })
    .eq("id", adminId)
    .eq("role", "admin");

  if (profileUpdateError !== null) {
    throw new Error(
      `Gagal mengubah instansi admin: ${profileUpdateError.message}`
    );
  }

  if (authData.user.email !== email) {
    const { error: emailUpdateError } =
      await adminClient.auth.admin.updateUserById(adminId, {
        email,
        email_confirm: true,
      });

    if (emailUpdateError !== null) {
      const { error: rollbackError } = await adminClient
        .from("profiles")
        .update({ agency_id: profile.agency_id })
        .eq("id", adminId)
        .eq("role", "admin");

      const rollbackMessage =
        rollbackError === null
          ? ""
          : ` Gagal memulihkan instansi sebelumnya: ${rollbackError.message}`;

      throw new Error(`${emailUpdateError.message}${rollbackMessage}`);
    }
  }
}

export async function deleteAgencyAdminAccount(
  adminId: string,
  client?: import("@supabase/supabase-js").SupabaseClient<Database>
): Promise<void> {
  await requireSuperAdmin(client);

  const adminClient = getAdminServiceClient();

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", adminId)
    .eq("role", "admin")
    .maybeSingle();

  if (profileError !== null) {
    throw new Error(`Gagal memuat data admin: ${profileError.message}`);
  }

  if (profile === null) {
    throw new Error("Admin instansi tidak ditemukan.");
  }

  const { error: deleteError } =
    await adminClient.auth.admin.deleteUser(adminId);

  if (deleteError !== null) {
    throw new Error(`Gagal menghapus admin: ${deleteError.message}`);
  }
}

export async function listAgencyAdminAccounts(
  client?: import("@supabase/supabase-js").SupabaseClient<Database>
): Promise<readonly AgencyAdminAccount[]> {
  await requireSuperAdmin(client);

  const adminClient = getAdminServiceClient();

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, agency_id, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: false });

  if (profilesError !== null) {
    throw new Error(`Gagal memuat daftar admin: ${profilesError.message}`);
  }

  if (profiles.length === 0) {
    return [];
  }

  const usersById = new Map<string, string | null>();
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error !== null) {
      throw new Error(`Gagal memuat email admin: ${error.message}`);
    }

    for (const user of data.users) {
      if (user.email !== undefined) {
        usersById.set(user.id, user.email);
      }
    }

    if (data.users.length < perPage) {
      break;
    }
  }

  return profiles.map((profile) => ({
    ...profile,
    email: usersById.get(profile.id) ?? null,
  }));
}

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
