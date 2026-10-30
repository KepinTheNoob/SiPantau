import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getServiceClient,
  getAnonClient,
  createTestUserClient,
  cleanupTestData,
  type TestUserContext,
} from "./support/supabase";
import {
  submitCitizenReport,
  moderateCitizenReport,
} from "@/server/actions/citizen-reports";
import { AgencyAccessDeniedError } from "@/server/auth/errors";

describe("Fase 7: Citizen Reports RLS and Moderation Authorization", () => {
  let agencyAId: string;
  let agencyBId: string;

  let adminA: TestUserContext;
  let adminB: TestUserContext;

  let projectAId: string;
  let projectBId: string;

  let reportAId: string;
  let reportBId: string;

  const serviceClient = getServiceClient();
  const anonClient = getAnonClient();

  beforeAll(async () => {
    await cleanupTestData();

    // 1. Seed Verified Agencies
    const { data: agA } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Bina Marga Sumut",
        slug: "dinas-bina-marga-sumut",
        region: "Sumatera Utara",
        verified: true,
      })
      .select()
      .single();

    agencyAId = agA?.id ?? "";

    const { data: agB } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Kesehatan Sumbar",
        slug: "dinas-kesehatan-sumbar",
        region: "Sumatera Barat",
        verified: true,
      })
      .select()
      .single();

    agencyBId = agB?.id ?? "";

    // 2. Seed Admin Users
    adminA = await createTestUserClient(
      "admin.sumut@gov.id",
      "admin",
      agencyAId
    );

    adminB = await createTestUserClient(
      "admin.sumbar@gov.id",
      "admin",
      agencyBId
    );

    // 3. Seed Projects
    const { data: projA } = await serviceClient
      .from("projects")
      .insert({
        agency_id: agencyAId,
        slug: "perbaikan-jalan-lintas-medan",
        title: "Perbaikan Jalan Lintas Medan",
        description: "Pengaspalan dan perbaikan drainase jalan raya",
        category: "Infrastruktur",
        location_name: "Medan Sunggal",
        budget_total: 1000000000,
        start_date: "2026-01-01",
        target_end_date: "2026-12-31",
      })
      .select()
      .single();

    projectAId = projA?.id ?? "";

    const { data: projB } = await serviceClient
      .from("projects")
      .insert({
        agency_id: agencyBId,
        slug: "puskesmas-rawat-inap-padang",
        title: "Puskesmas Rawat Inap Padang",
        description: "Pembangunan gedung puskesmas baru",
        category: "Kesehatan",
        location_name: "Padang Timur",
        budget_total: 800000000,
        start_date: "2026-02-01",
        target_end_date: "2026-11-30",
      })
      .select()
      .single();

    projectBId = projB?.id ?? "";

    // 4. Seed Reports
    const { data: repA } = await serviceClient
      .from("citizen_reports")
      .insert({
        project_id: projectAId,
        content: "Ada tumpukan material yang menghalangi jalan masuk warga.",
        status: "pending",
      })
      .select()
      .single();

    reportAId = repA?.id ?? "";

    const { data: repB } = await serviceClient
      .from("citizen_reports")
      .insert({
        project_id: projectBId,
        content: "Laporan warga untuk proyek B",
        status: "pending",
      })
      .select()
      .single();

    reportBId = repB?.id ?? "";
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("anon can submit citizen report on active verified project via Server Action", async () => {
    const formData = new FormData();
    formData.append("projectId", projectAId);
    formData.append(
      "content",
      "Pekerjaan drainase sudah mulai dikerjakan hari ini oleh pekerja."
    );

    const result = await submitCitizenReport(formData, anonClient);
    expect(result.success).toBe(true);
    expect(result.reportId).toBeDefined();

    // Verify in database it has status pending
    const { data: createdReport } = await serviceClient
      .from("citizen_reports")
      .select("status")
      .eq("id", result.reportId ?? "")
      .single();

    expect(createdReport?.status).toBe("pending");
  });

  it("anon CANNOT see pending citizen reports (RLS hides non-approved reports)", async () => {
    const { data: reports } = await anonClient
      .from("citizen_reports")
      .select("*")
      .eq("id", reportAId);

    expect(reports?.length).toBe(0);
  });

  it("admin A can see citizen reports on own project A, but cannot see reports on project B", async () => {
    // Admin A can see report on project A
    const { data: ownReports } = await adminA.client
      .from("citizen_reports")
      .select("*")
      .eq("id", reportAId);

    expect(ownReports?.length).toBe(1);

    // Admin A cannot see pending report on project B
    const { data: otherReports } = await adminA.client
      .from("citizen_reports")
      .select("*")
      .eq("id", reportBId);

    expect(otherReports?.length).toBe(0);
  });

  it("admin A can moderate (approve) report on own project A", async () => {
    const formData = new FormData();
    formData.append("projectId", projectAId);
    formData.append("reportId", reportAId);
    formData.append("status", "approved");

    const result = await moderateCitizenReport(formData, adminA.client);
    expect(result.success).toBe(true);

    // Now anon CAN see the approved report
    const { data: approvedForAnon } = await anonClient
      .from("citizen_reports")
      .select("*")
      .eq("id", reportAId);

    expect(approvedForAnon?.length).toBe(1);
  });

  it("admin A CANNOT moderate report on project B (tertolak requireAgencyAccess)", async () => {
    const formData = new FormData();
    formData.append("projectId", projectBId);
    formData.append("reportId", reportBId);
    formData.append("status", "approved");

    await expect(
      moderateCitizenReport(formData, adminA.client)
    ).rejects.toThrow(AgencyAccessDeniedError);
  });

  it("admin B can moderate report on own project B", async () => {
    const formData = new FormData();
    formData.append("projectId", projectBId);
    formData.append("reportId", reportBId);
    formData.append("status", "rejected");

    const result = await moderateCitizenReport(formData, adminB.client);
    expect(result.success).toBe(true);
  });
});
