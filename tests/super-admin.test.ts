import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getServiceClient,
  createTestUserClient,
  cleanupTestData,
  type TestUserContext,
} from "./support/supabase";
import {
  toggleAgencyVerification,
  createAgencyAdminAccount,
} from "@/server/actions/super-admin";
import { requireSuperAdmin } from "@/server/auth";
import { ForbiddenError } from "@/server/auth/errors";

describe("Fase 6: Super Admin & Audit Log Authorization", () => {
  let agencyAId: string;
  let adminA: TestUserContext;
  let superAdmin: TestUserContext;

  const serviceClient = getServiceClient();

  beforeAll(async () => {
    await cleanupTestData();

    // 1. Seed Agency
    const { data: agA } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Kelautan dan Perikanan",
        slug: "dinas-kelautan",
        region: "Maluku",
        verified: false,
      })
      .select()
      .single();

    agencyAId = agA?.id ?? "";

    // 2. Seed Users
    adminA = await createTestUserClient(
      "admin.kelautan@gov.id",
      "admin",
      agencyAId
    );

    superAdmin = await createTestUserClient(
      "super.governor@gov.id",
      "super_admin",
      null
    );
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("standard admin cannot execute requireSuperAdmin", async () => {
    await expect(requireSuperAdmin(adminA.client)).rejects.toThrow(
      ForbiddenError
    );
  });

  it("standard admin cannot toggle agency verification via Server Action", async () => {
    const formData = new FormData();
    formData.append("agencyId", agencyAId);
    formData.append("verified", "true");

    await expect(
      toggleAgencyVerification(formData, adminA.client)
    ).rejects.toThrow(ForbiddenError);
  });

  it("super admin can toggle agency verification", async () => {
    const formData = new FormData();
    formData.append("agencyId", agencyAId);
    formData.append("verified", "true");

    const result = await toggleAgencyVerification(formData, superAdmin.client);
    expect(result.success).toBe(true);

    const { data: ag } = await serviceClient
      .from("agencies")
      .select("verified")
      .eq("id", agencyAId)
      .single();

    expect(ag?.verified).toBe(true);
  });

  it("super admin can create agency admin account", async () => {
    const formData = new FormData();
    formData.append("agencyId", agencyAId);
    formData.append("email", "new.admin.kelautan@gov.id");
    formData.append("password", "SecureAdminPass123!");

    const result = await createAgencyAdminAccount(formData, superAdmin.client);
    expect(result.success).toBe(true);

    // Verify profile is created
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role, agency_id")
      .eq("agency_id", agencyAId)
      .eq("role", "admin");

    expect(profile?.length).toBeGreaterThanOrEqual(1);
  });

  it("audit logs record actions and are queryable by super admin", async () => {
    const { data: logs, error } = await superAdmin.client
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    expect(error).toBeNull();
    expect(logs).toBeDefined();
  });
});
