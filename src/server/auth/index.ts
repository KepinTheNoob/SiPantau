import type { User, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  UnauthorizedError,
  ForbiddenError,
  ProjectNotFoundError,
  AgencyAccessDeniedError,
  UnverifiedAgencyError,
} from "./errors";

export type ProfileData = Database["public"]["Tables"]["profiles"]["Row"];

export type AgencyData = Database["public"]["Tables"]["agencies"]["Row"];

export type ProjectData = Database["public"]["Tables"]["projects"]["Row"];

export type CurrentUserResult = {
  readonly user: User;
  readonly profile: ProfileData;
  readonly agency: AgencyData | null;
};

export type AgencyAccessResult = {
  readonly user: User;
  readonly profile: ProfileData;
  readonly agency: AgencyData;
  readonly project: ProjectData;
};

export async function getCurrentUser(
  client?: SupabaseClient<Database>
): Promise<CurrentUserResult | null> {
  const supabase = client ?? (await createSupabaseServerClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError !== null || user === null) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError !== null || profile === null) {
    return null;
  }

  let agency: AgencyData | null = null;

  if (profile.agency_id !== null) {
    const { data: agencyData } = await supabase
      .from("agencies")
      .select("*")
      .eq("id", profile.agency_id)
      .maybeSingle();

    agency = agencyData;
  }

  return {
    user,
    profile,
    agency,
  };
}

export async function requireUser(
  client?: SupabaseClient<Database>
): Promise<CurrentUserResult> {
  const current = await getCurrentUser(client);

  if (current === null) {
    throw new UnauthorizedError();
  }

  return current;
}

export async function requireAdmin(
  client?: SupabaseClient<Database>
): Promise<CurrentUserResult> {
  const current = await requireUser(client);

  if (
    current.profile.role !== "admin" &&
    current.profile.role !== "super_admin"
  ) {
    throw new ForbiddenError("Akses ditolak: Memerlukan hak akses admin.");
  }

  return current;
}

export async function requireSuperAdmin(
  client?: SupabaseClient<Database>
): Promise<CurrentUserResult> {
  const current = await requireUser(client);

  if (current.profile.role !== "super_admin") {
    throw new ForbiddenError(
      "Akses ditolak: Memerlukan hak akses super admin."
    );
  }

  return current;
}

export async function requireAgencyAccess(
  projectId: string,
  client?: SupabaseClient<Database>
): Promise<AgencyAccessResult> {
  const current = await requireAdmin(client);
  const supabase = client ?? (await createSupabaseServerClient());

  if (current.profile.agency_id === null) {
    throw new ForbiddenError(
      "Akses ditolak: Akun admin tidak terhubung ke instansi mana pun."
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError !== null || project === null) {
    throw new ProjectNotFoundError();
  }

  if (project.agency_id !== current.profile.agency_id) {
    throw new AgencyAccessDeniedError();
  }

  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .select("*")
    .eq("id", project.agency_id)
    .maybeSingle();

  if (agencyError !== null || agency === null || !agency.verified) {
    throw new UnverifiedAgencyError();
  }

  return {
    user: current.user,
    profile: current.profile,
    agency,
    project,
  };
}
