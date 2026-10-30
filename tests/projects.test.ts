import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getServiceClient,
  createTestUserClient,
  cleanupTestData,
  type TestUserContext,
} from "./support/supabase";
import {
  createProject,
  updateProject,
  archiveProject,
} from "@/server/actions/projects";
import { addLandmark } from "@/server/actions/landmarks";
import { AgencyAccessDeniedError } from "@/server/auth/errors";

describe("Fase 3: Project and Landmark CRUD & Authorization", () => {
  let agencyAId: string;
  let agencyBId: string;

  let adminA: TestUserContext;
  let adminB: TestUserContext;

  let projectAId: string;
  let projectBId: string;

  const serviceClient = getServiceClient();

  beforeAll(async () => {
    await cleanupTestData();

    // 1. Seed Verified Agencies
    const { data: agA } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Bina Marga",
        slug: "dinas-bina-marga",
        region: "Jakarta",
        verified: true,
      })
      .select()
      .single();

    agencyAId = agA?.id ?? "";

    const { data: agB } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Cipta Karya",
        slug: "dinas-cipta-karya",
        region: "Bandung",
        verified: true,
      })
      .select()
      .single();

    agencyBId = agB?.id ?? "";

    // 2. Seed Admin Users
    adminA = await createTestUserClient(
      "admin.binamarga@test.gov",
      "admin",
      agencyAId
    );

    adminB = await createTestUserClient(
      "admin.ciptakarya@test.gov",
      "admin",
      agencyBId
    );

    // 3. Seed Projects via service client
    const { data: projA } = await serviceClient
      .from("projects")
      .insert({
        agency_id: agencyAId,
        slug: "jembatan-penyeberangan-a",
        title: "Jembatan Penyeberangan A",
        description: "Proyek jembatan penyeberangan orang di halte bus",
        category: "Infrastruktur",
        location_name: "Jakarta Pusat",
        budget_total: 500000000,
        start_date: "2026-01-01",
        target_end_date: "2026-06-30",
      })
      .select()
      .single();

    projectAId = projA?.id ?? "";

    const { data: projB } = await serviceClient
      .from("projects")
      .insert({
        agency_id: agencyBId,
        slug: "renovasi-taman-kota-b",
        title: "Renovasi Taman Kota B",
        description: "Renovasi ruang terbuka hijau dan taman bermain",
        category: "Lingkungan",
        location_name: "Bandung Wetan",
        budget_total: 750000000,
        start_date: "2026-02-01",
        target_end_date: "2026-08-31",
      })
      .select()
      .single();

    projectBId = projB?.id ?? "";
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("admin A can create a new project via Server Action", async () => {
    const formData = new FormData();
    formData.append("title", "Pembangunan Flyover Baru");
    formData.append("slug", "pembangunan-flyover-baru");
    formData.append(
      "description",
      "Pembangunan flyover untuk mengurai kemacetan lalu lintas kota."
    );
    formData.append("category", "Infrastruktur");
    formData.append("location_name", "Jakarta Timur");
    formData.append("budget_total", "2500000000");
    formData.append("start_date", "2026-03-01");
    formData.append("target_end_date", "2026-12-31");

    const result = await createProject(formData, adminA.client);

    expect(result.success).toBe(true);
    expect(result.projectId).toBeDefined();

    // Verify in database
    const { data: createdProj } = await adminA.client
      .from("projects")
      .select("*")
      .eq("id", result.projectId ?? "")
      .single();

    expect(createdProj?.agency_id).toBe(agencyAId);
    expect(createdProj?.slug).toBe("pembangunan-flyover-baru");
  });

  it("admin A can update own project via Server Action", async () => {
    const formData = new FormData();
    formData.append("projectId", projectAId);
    formData.append("title", "Jembatan Penyeberangan A (Revisi)");
    formData.append("slug", "jembatan-penyeberangan-a");
    formData.append(
      "description",
      "Deskripsi yang telah diperbarui oleh admin instansi sendiri."
    );
    formData.append("category", "Infrastruktur");
    formData.append("location_name", "Jakarta Pusat");
    formData.append("budget_total", "600000000");
    formData.append("start_date", "2026-01-01");
    formData.append("target_end_date", "2026-07-31");

    const result = await updateProject(formData, adminA.client);

    expect(result.success).toBe(true);

    const { data: updatedProj } = await adminA.client
      .from("projects")
      .select("title, budget_total")
      .eq("id", projectAId)
      .single();

    expect(updatedProj?.title).toBe("Jembatan Penyeberangan A (Revisi)");
    expect(Number(updatedProj?.budget_total)).toBe(600000000);
  });

  it("admin A CANNOT update project B via Server Action (tertolak requireAgencyAccess)", async () => {
    const formData = new FormData();
    formData.append("projectId", projectBId);
    formData.append("title", "Upaya Pembajakan Proyek B");
    formData.append("slug", "renovasi-taman-kota-b");
    formData.append("description", "Deskripsi tidak sah dari admin asing.");
    formData.append("category", "Lingkungan");
    formData.append("location_name", "Bandung");
    formData.append("budget_total", "999999999");
    formData.append("start_date", "2026-02-01");
    formData.append("target_end_date", "2026-08-31");

    await expect(updateProject(formData, adminA.client)).rejects.toThrow(
      AgencyAccessDeniedError
    );
  });

  it("admin A CANNOT update project B directly via Supabase API (tertolak RLS)", async () => {
    const { data, error } = await adminA.client
      .from("projects")
      .update({
        title: "Perubahan Ilegal Langsung Lewat Supabase Client",
      })
      .eq("id", projectBId)
      .select();

    // RLS policy prevents update; returns 0 rows updated
    expect(error).toBeNull();
    expect(data?.length).toBe(0);

    // Verify project B is unchanged
    const { data: projB } = await serviceClient
      .from("projects")
      .select("title")
      .eq("id", projectBId)
      .single();

    expect(projB?.title).toBe("Renovasi Taman Kota B");
  });

  it("admin A can add landmarks to own project and cannot add to project B", async () => {
    // Add to project A (own)
    const formA = new FormData();
    formA.append("projectId", projectAId);
    formA.append("name", "Tahap 1: Pengukuran dan Desain");
    formA.append("position", "0");
    formA.append("weight", "20");

    const resultA = await addLandmark(formA, adminA.client);
    expect(resultA.success).toBe(true);

    // Try add to project B (other agency) -> rejected
    const formB = new FormData();
    formB.append("projectId", projectBId);
    formB.append("name", "Tahap Ilegal pada Proyek B");
    formB.append("position", "0");
    formB.append("weight", "50");

    await expect(addLandmark(formB, adminA.client)).rejects.toThrow(
      AgencyAccessDeniedError
    );
  });

  it("admin A can archive own project (soft delete)", async () => {
    const formArchive = new FormData();
    formArchive.append("projectId", projectAId);

    const result = await archiveProject(formArchive, adminA.client);
    expect(result.success).toBe(true);

    const { data: projA } = await serviceClient
      .from("projects")
      .select("archived_at")
      .eq("id", projectAId)
      .single();

    expect(projA?.archived_at).not.toBeNull();
  });

  it("admin B can update own project B via Server Action", async () => {
    const formData = new FormData();
    formData.append("projectId", projectBId);
    formData.append("title", "Renovasi Taman Kota B (Update Admin B)");
    formData.append("slug", "renovasi-taman-kota-b");
    formData.append("description", "Deskripsi sah diperbarui oleh admin B.");
    formData.append("category", "Lingkungan");
    formData.append("location_name", "Bandung Wetan");
    formData.append("budget_total", "800000000");
    formData.append("start_date", "2026-02-01");
    formData.append("target_end_date", "2026-08-31");

    const result = await updateProject(formData, adminB.client);
    expect(result.success).toBe(true);
  });
});
