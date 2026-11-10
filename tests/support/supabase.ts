import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";

export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";

export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export type TestSupabaseClient = SupabaseClient<Database>;

export function getServiceClient(): TestSupabaseClient {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getAnonClient(): TestSupabaseClient {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type TestUserContext = {
  readonly userId: string;
  readonly email: string;
  readonly client: TestSupabaseClient;
};

export async function createTestUserClient(
  email: string,
  role: "admin" | "super_admin",
  agencyId: string | null
): Promise<TestUserContext> {
  const adminClient = getServiceClient();
  const password = "password123!";

  const { data: usersList } = await adminClient.auth.admin.listUsers();
  const existingUser = usersList?.users?.find((u) => u.email === email);

  if (existingUser !== undefined) {
    await adminClient.auth.admin.deleteUser(existingUser.id);
  }

  const { data: userData, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError !== null || userData.user === null) {
    throw new Error(
      `Failed to create test user ${email}: ${createError?.message}`
    );
  }

  const userId = userData.user.id;

  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userId,
    agency_id: agencyId,
    role,
  });

  if (profileError !== null) {
    throw new Error(
      `Failed to create profile for test user ${email}: ${profileError.message}`
    );
  }

  const anonClient = getAnonClient();

  const { data: sessionData, error: signInError } =
    await anonClient.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError !== null || sessionData.session === null) {
    throw new Error(
      `Failed to sign in test user ${email}: ${signInError?.message}`
    );
  }

  const userClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    },
  });

  return {
    userId,
    email,
    client: userClient,
  };
}

/** Akun warga biasa (tanpa profil admin) yang sudah login. */
export async function createCitizenTestClient(
  email: string
): Promise<TestUserContext> {
  const adminClient = getServiceClient();
  const password = "password123!";

  const { data: userData, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError !== null || userData.user === null) {
    throw new Error(
      `Failed to create citizen ${email}: ${createError?.message}`
    );
  }

  const { data: sessionData, error: signInError } =
    await getAnonClient().auth.signInWithPassword({ email, password });

  if (signInError !== null || sessionData.session === null) {
    throw new Error(
      `Failed to sign in citizen ${email}: ${signInError?.message}`
    );
  }

  return {
    userId: userData.user.id,
    email,
    client: createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      },
    }),
  };
}

export async function cleanupTestData(): Promise<void> {
  const adminClient = getServiceClient();

  await adminClient
    .from("audit_logs")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  await adminClient
    .from("citizen_reports")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  await adminClient
    .from("citizen_profiles")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  await adminClient
    .from("expenses")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  await adminClient
    .from("project_delay_reports")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  await adminClient
    .from("landmark_images")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  await adminClient
    .from("project_images")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  await adminClient
    .from("landmarks")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  await adminClient
    .from("projects")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  await adminClient
    .from("profiles")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  await adminClient
    .from("agencies")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  const { data: usersData } = await adminClient.auth.admin.listUsers();

  if (usersData?.users !== undefined) {
    for (const u of usersData.users) {
      await adminClient.auth.admin.deleteUser(u.id);
    }
  }
}
