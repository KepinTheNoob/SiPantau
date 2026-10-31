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
import { listUserAccounts } from "@/server/admin-only/accounts";
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

  it("audit logs support pagination with range and exact count", async () => {
    // Insert a project to trigger audit log insertion
    await serviceClient.from("projects").insert({
      agency_id: agencyAId,
      title: "Proyek Audit Test",
      slug: "proyek-audit-test",
      description: "Deskripsi audit test",
      category: "Jalan & Jembatan",
      location_name: "Ambon",
      budget_total: 500000000,
      start_date: "2026-01-01",
      target_end_date: "2026-12-31",
    });

    const {
      data: page1,
      count: totalCount,
      error,
    } = await superAdmin.client
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, 0);

    expect(error).toBeNull();
    expect(totalCount).toBeGreaterThanOrEqual(1);
    expect(page1).toBeDefined();
    expect(page1?.length).toBe(1);
  });

  it("standard admin cannot list user accounts", async () => {
    await expect(listUserAccounts(adminA.client)).rejects.toThrow(
      ForbiddenError
    );
  });

  it("super admin can list registered user accounts including emails", async () => {
    const accounts = await listUserAccounts(superAdmin.client);
    expect(accounts.length).toBeGreaterThanOrEqual(2);

    const emailList: string[] = [];

    for (const acc of accounts) {
      emailList.push(acc.email);
    }

    expect(emailList).toContain("super.governor@gov.id");
    expect(emailList).toContain("new.admin.kelautan@gov.id");

    const createdAdmin = accounts.find(
      (acc) => acc.email === "new.admin.kelautan@gov.id"
    );

    expect(createdAdmin).toBeDefined();
    expect(createdAdmin?.role).toBe("admin");
    expect(createdAdmin?.agencyName).toBe("Dinas Kelautan dan Perikanan");
  });
});
