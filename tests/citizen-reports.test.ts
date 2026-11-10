import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getServiceClient,
  getAnonClient,
  createTestUserClient,
  createCitizenTestClient,
  cleanupTestData,
  type TestUserContext,
} from "./support/supabase";
import {
  submitCitizenReport,
  replyToCitizenReport,
} from "@/server/controllers/citizen-reports";
import { listCitizenReportsByReporter } from "@/server/models/citizen-reports";
import { AgencyAccessDeniedError } from "@/server/auth/errors";

function reportForm(projectId: string, content: string): FormData {
  const formData = new FormData();
  formData.append("projectId", projectId);
  formData.append("content", content);

  return formData;
}

function replyForm(
  projectId: string,
  reportId: string,
  body: string
): FormData {
  const formData = new FormData();
  formData.append("projectId", projectId);
  formData.append("reportId", reportId);
  formData.append("body", body);

  return formData;
}

const VALID_REPLY =
  "Terima kasih. Material sudah kami pindahkan ke area proyek hari ini.";

describe("Laporan warga: langsung publik, dilacak per akun, ditanggapi tertulis", () => {
  let adminA: TestUserContext;
  let adminB: TestUserContext;
  let citizen: TestUserContext;
  let otherCitizen: TestUserContext;

  let projectAId: string;
  let projectBId: string;
  let reportAId: string;
  let reportBId: string;

  const serviceClient = getServiceClient();
  const anonClient = getAnonClient();

  beforeAll(async () => {
    await cleanupTestData();

    const { data: agencies } = await serviceClient
      .from("agencies")
      .insert([
        {
          name: "Dinas Bina Marga Sumut",
          slug: "dinas-bina-marga-sumut",
          region: "Sumatera Utara",
          verified: true,
        },
        {
          name: "Dinas Kesehatan Sumbar",
          slug: "dinas-kesehatan-sumbar",
          region: "Sumatera Barat",
          verified: true,
        },
      ])
      .select("id, slug");

    const agencyAId =
      agencies?.find((agency) => agency.slug === "dinas-bina-marga-sumut")
        ?.id ?? "";

    const agencyBId =
      agencies?.find((agency) => agency.slug === "dinas-kesehatan-sumbar")
        ?.id ?? "";

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
    citizen = await createCitizenTestClient("warga.lapor@warga.id");
    otherCitizen = await createCitizenTestClient("warga.lain@warga.id");

    const { data: projA } = await serviceClient
      .from("projects")
      .insert({
        agency_id: agencyAId,
        slug: "perbaikan-jalan-lintas-medan",
        title: "Perbaikan Jalan Lintas Medan",
        description: "Pengaspalan dan perbaikan drainase jalan raya",
        category: "Perbaikan Jalan",
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
        category: "Kesehatan & Rumah Sakit",
        location_name: "Padang Timur",
        budget_total: 800000000,
        start_date: "2026-02-01",
        target_end_date: "2026-11-30",
      })
      .select()
      .single();

    projectBId = projB?.id ?? "";

    const { data: repB } = await serviceClient
      .from("citizen_reports")
      .insert({
        project_id: projectBId,
        reporter_id: otherCitizen.userId,
        content: "Pagar proyek puskesmas roboh ke trotoar.",
      })
      .select()
      .single();

    reportBId = repB?.id ?? "";
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("anon tidak bisa mengirim laporan tanpa masuk", async () => {
    const result = await submitCitizenReport(
      reportForm(projectAId, "Ada tumpukan material menghalangi jalan masuk."),
      anonClient
    );

    expect(result.success).toBe(false);

    const { error } = await anonClient.from("citizen_reports").insert({
      project_id: projectAId,
      content: "Laporan langsung tanpa akun ke database.",
    });

    expect(error).not.toBeNull();
  });

  it("warga yang masuk mengirim laporan dan laporan langsung terlihat publik", async () => {
    const result = await submitCitizenReport(
      reportForm(projectAId, "Ada tumpukan material menghalangi jalan masuk."),
      citizen.client
    );

    expect(result.success).toBe(true);
    reportAId = result.reportId ?? "";

    const { data: publicReports } = await anonClient
      .from("citizen_reports")
      .select("id, reporter_id")
      .eq("id", reportAId);

    expect(publicReports?.length).toBe(1);
    expect(publicReports?.[0]?.reporter_id).toBe(citizen.userId);
  });

  it("warga tidak bisa mengirim laporan atas nama akun lain", async () => {
    const { error } = await citizen.client.from("citizen_reports").insert({
      project_id: projectAId,
      reporter_id: otherCitizen.userId,
      content: "Mencoba mengirim atas nama warga lain.",
    });

    expect(error).not.toBeNull();
  });

  it("Laporan Saya hanya berisi laporan milik akun itu", async () => {
    const { data } = await listCitizenReportsByReporter(
      citizen.client,
      citizen.userId
    );

    expect(data?.map((report) => report.id)).toEqual([reportAId]);
    expect(data?.[0]?.projects?.title).toBe("Perbaikan Jalan Lintas Medan");
    expect(data?.[0]?.citizen_report_replies).toEqual([]);
  });

  it("tanggapan terlalu singkat ditolak", async () => {
    const result = await replyToCitizenReport(
      replyForm(projectAId, reportAId, "Oke, diproses."),
      adminA.client
    );

    expect(result.success).toBe(false);
  });

  it("admin A menanggapi laporan proyeknya; tanggapan terlihat publik", async () => {
    const result = await replyToCitizenReport(
      replyForm(projectAId, reportAId, VALID_REPLY),
      adminA.client
    );

    expect(result.success).toBe(true);

    const { data: replies } = await anonClient
      .from("citizen_report_replies")
      .select("body, responder_id")
      .eq("report_id", reportAId);

    expect(replies?.length).toBe(1);
    expect(replies?.[0]?.responder_id).toBe(adminA.userId);

    const { data: mine } = await listCitizenReportsByReporter(
      citizen.client,
      citizen.userId
    );

    expect(mine?.[0]?.citizen_report_replies.length).toBe(1);
  });

  it("admin A tidak bisa menanggapi laporan proyek instansi lain", async () => {
    await expect(
      replyToCitizenReport(
        replyForm(projectBId, reportBId, VALID_REPLY),
        adminA.client
      )
    ).rejects.toThrow(AgencyAccessDeniedError);

    const result = await replyToCitizenReport(
      replyForm(projectAId, reportBId, VALID_REPLY),
      adminA.client
    );

    expect(result.success).toBe(false);
  });

  it("warga tidak bisa menulis tanggapan atas nama instansi", async () => {
    const { error } = await citizen.client
      .from("citizen_report_replies")
      .insert({
        report_id: reportAId,
        body: VALID_REPLY,
      });

    expect(error).not.toBeNull();
  });

  it("tanggapan tidak bisa diubah setelah dikirim", async () => {
    const { data } = await adminA.client
      .from("citizen_report_replies")
      .update({ body: "Isi tanggapan diganti setelah dikirim." })
      .eq("report_id", reportAId)
      .select();

    expect(data ?? []).toEqual([]);
  });

  it("admin B menanggapi laporan proyeknya sendiri", async () => {
    const result = await replyToCitizenReport(
      replyForm(projectBId, reportBId, VALID_REPLY),
      adminB.client
    );

    expect(result.success).toBe(true);
  });
});
