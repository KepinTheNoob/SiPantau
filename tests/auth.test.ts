import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getServiceClient,
  getAnonClient,
  createTestUserClient,
  cleanupTestData,
  type TestUserContext,
} from "./support/supabase";
import {
  getCurrentUser,
  requireUser,
  requireAdmin,
  requireSuperAdmin,
  requireAgencyAccess,
} from "@/server/auth";
import {
  UnauthorizedError,
  ForbiddenError,
  ProjectNotFoundError,
  AgencyAccessDeniedError,
  UnverifiedAgencyError,
} from "@/server/auth/errors";

describe("Authentication and Authorization Functions", () => {
  let verifiedAgencyAId: string;
  let verifiedAgencyBId: string;
  let unverifiedAgencyCId: string;

  let projectAId: string;
  let projectCId: string;

  let adminA: TestUserContext;
  let adminB: TestUserContext;
  let adminC: TestUserContext;
  let superAdmin: TestUserContext;

  const serviceClient = getServiceClient();
  const anonClient = getAnonClient();

  beforeAll(async () => {
    await cleanupTestData();

    // 1. Seed Agencies
    const { data: agencyA, error: errA } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Pendidikan",
        slug: "dinas-pendidikan",
        region: "Jakarta",
        verified: true,
      })
      .select()
      .single();

    if (errA !== null || agencyA === null) {
      throw new Error(`Failed to seed agency A: ${errA?.message}`);
    }

    verifiedAgencyAId = agencyA.id;

    const { data: agencyB, error: errB } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Pariwisata",
        slug: "dinas-pariwisata",
        region: "Bali",
        verified: true,
      })
      .select()
      .single();

    if (errB !== null || agencyB === null) {
      throw new Error(`Failed to seed agency B: ${errB?.message}`);
    }

    verifiedAgencyBId = agencyB.id;

    const { data: agencyC, error: errC } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Lingkungan",
        slug: "dinas-lingkungan",
        region: "Surabaya",
        verified: false,
      })
      .select()
      .single();

    if (errC !== null || agencyC === null) {
      throw new Error(`Failed to seed agency C: ${errC?.message}`);
    }

    unverifiedAgencyCId = agencyC.id;

    // 2. Seed Users
    adminA = await createTestUserClient(
      "admin.pendidikan@example.gov",
      "admin",
      verifiedAgencyAId
    );
    adminB = await createTestUserClient(
      "admin.pariwisata@example.gov",
      "admin",
      verifiedAgencyBId
    );
    adminC = await createTestUserClient(
      "admin.lingkungan@example.gov",
      "admin",
      unverifiedAgencyCId
    );
    superAdmin = await createTestUserClient(
      "super.auth@example.gov",
      "super_admin",
      null
    );

    // 3. Seed Projects using service client
    const { data: projA, error: errProjA } = await serviceClient
      .from("projects")
      .insert({
        agency_id: verifiedAgencyAId,
        title: "Pembangunan Sekolah Dasar 01",
        slug: "pembangunan-sd-01",
        description: "Renovasi dan pembangunan gedung sekolah baru",
        category: "Pendidikan",
        location_name: "Jakarta Pusat",
        start_date: "2026-01-01",
        budget_total: 1500000000,
        target_end_date: "2026-12-31",
      })
      .select()
      .single();

    if (errProjA !== null || projA === null) {
      throw new Error(`Failed to seed project A: ${errProjA?.message}`);
    }

    projectAId = projA.id;

    const { data: projC, error: errProjC } = await serviceClient
      .from("projects")
      .insert({
        agency_id: unverifiedAgencyCId,
        title: "Pengolahan Sampah Terpadu",
        slug: "pengolahan-sampah-terpadu",
        description: "Fasilitas daur ulang sampah kota",
        category: "Lingkungan",
        location_name: "Surabaya Timur",
        start_date: "2026-02-01",
        budget_total: 800000000,
        target_end_date: "2026-11-30",
      })
      .select()
      .single();

    if (errProjC !== null || projC === null) {
      throw new Error(`Failed to seed project C: ${errProjC?.message}`);
    }

    projectCId = projC.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("getCurrentUser returns null when unauthenticated", async () => {
    const userResult = await getCurrentUser(anonClient);

    expect(userResult).toBeNull();
  });

  it("getCurrentUser returns user profile and agency for authenticated admin", async () => {
    const userResult = await getCurrentUser(adminA.client);

    expect(userResult).not.toBeNull();
    expect(userResult?.user.id).toBe(adminA.userId);
    expect(userResult?.profile.role).toBe("admin");
    expect(userResult?.agency?.id).toBe(verifiedAgencyAId);
    expect(userResult?.agency?.name).toBe("Dinas Pendidikan");
  });

  it("requireUser throws UnauthorizedError when unauthenticated", async () => {
    await expect(requireUser(anonClient)).rejects.toThrow(UnauthorizedError);
  });

  it("requireUser succeeds for authenticated user", async () => {
    const userResult = await requireUser(adminA.client);

    expect(userResult.user.id).toBe(adminA.userId);
  });

  it("requireAdmin succeeds for admin and super_admin", async () => {
    const adminResult = await requireAdmin(adminA.client);
    expect(adminResult.profile.role).toBe("admin");

    const superResult = await requireAdmin(superAdmin.client);
    expect(superResult.profile.role).toBe("super_admin");
  });

  it("requireSuperAdmin succeeds for super_admin and rejects standard admin", async () => {
    const superResult = await requireSuperAdmin(superAdmin.client);
    expect(superResult.profile.role).toBe("super_admin");

    await expect(requireSuperAdmin(adminA.client)).rejects.toThrow(
      ForbiddenError
    );
  });

  it("requireAgencyAccess rejects unauthenticated session with UnauthorizedError", async () => {
    await expect(requireAgencyAccess(projectAId, anonClient)).rejects.toThrow(
      UnauthorizedError
    );
  });

  it("requireAgencyAccess rejects access to non-existent project with ProjectNotFoundError", async () => {
    const nonExistentId = "00000000-0000-0000-0000-000000000999";

    await expect(
      requireAgencyAccess(nonExistentId, adminA.client)
    ).rejects.toThrow(ProjectNotFoundError);
  });

  it("requireAgencyAccess rejects admin of agency B accessing project of agency A with AgencyAccessDeniedError", async () => {
    await expect(
      requireAgencyAccess(projectAId, adminB.client)
    ).rejects.toThrow(AgencyAccessDeniedError);
  });

  it("requireAgencyAccess rejects admin from unverified agency with UnverifiedAgencyError", async () => {
    await expect(
      requireAgencyAccess(projectCId, adminC.client)
    ).rejects.toThrow(UnverifiedAgencyError);
  });

  it("requireAgencyAccess succeeds for admin of agency A on verified project A", async () => {
    const result = await requireAgencyAccess(projectAId, adminA.client);

    expect(result.user.id).toBe(adminA.userId);
    expect(result.agency.id).toBe(verifiedAgencyAId);
    expect(result.project.id).toBe(projectAId);
    expect(result.project.title).toBe("Pembangunan Sekolah Dasar 01");
  });
});
