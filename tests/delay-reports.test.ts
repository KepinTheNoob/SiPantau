import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getServiceClient,
  getAnonClient,
  createTestUserClient,
  cleanupTestData,
  type TestUserContext,
} from "./support/supabase";
import { submitDelayReport } from "@/server/controllers/delay-reports";
import { AgencyAccessDeniedError } from "@/server/auth/errors";
import { nextIsoDate } from "@/lib/dates";
import { todayInJakarta } from "@/lib/validation/delay-reports";

function daysFromToday(offset: number): string {
  const date = new Date(`${todayInJakarta()}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + offset);

  return date.toISOString().slice(0, 10);
}

function delayForm(projectId: string, revisedTargetDate: string): FormData {
  const formData = new FormData();

  formData.append("projectId", projectId);
  formData.append("reasonCategoryIds", "3");
  formData.append("reasonCategoryIds", "5");
  formData.append(
    "reasonDetail",
    "Pengiriman girder baja tertunda enam minggu karena antrean produksi."
  );
  formData.append(
    "recoveryPlan",
    "Menambah regu kerja malam dan mempercepat pengecoran pelat lantai."
  );
  formData.append("revisedTargetDate", revisedTargetDate);

  return formData;
}

describe("Laporan keterlambatan proyek", () => {
  const serviceClient = getServiceClient();
  const anonClient = getAnonClient();

  let adminA: TestUserContext;
  let adminB: TestUserContext;
  let lateProjectId: string;
  const originalTarget = daysFromToday(-10);

  beforeAll(async () => {
    await cleanupTestData();

    const { data: agencyA } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Uji Terlambat A",
        slug: "dinas-uji-terlambat-a",
        region: "DKI Jakarta",
        verified: true,
      })
      .select()
      .single();

    const { data: agencyB } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Uji Terlambat B",
        slug: "dinas-uji-terlambat-b",
        region: "Banten",
        verified: true,
      })
      .select()
      .single();

    adminA = await createTestUserClient(
      "admin.telat.a@gov.id",
      "admin",
      agencyA?.id ?? ""
    );

    adminB = await createTestUserClient(
      "admin.telat.b@gov.id",
      "admin",
      agencyB?.id ?? ""
    );

    const { data: project } = await serviceClient
      .from("projects")
      .insert({
        agency_id: agencyA?.id ?? "",
        slug: "uji-proyek-terlambat",
        title: "Uji Proyek Terlambat",
        description: "Proyek yang sudah melewati target untuk pengujian.",
        category: "Pembangunan Jalan & Jembatan",
        location_name: "Jakarta Timur",
        budget_total: 500000000,
        start_date: daysFromToday(-200),
        target_end_date: originalTarget,
      })
      .select()
      .single();

    lateProjectId = project?.id ?? "";

    await serviceClient.from("landmarks").insert({
      project_id: lateProjectId,
      name: "Struktur utama",
      weight: 100,
      position: 1,
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("view menandai proyek lewat target tanpa laporan sebagai butuh laporan", async () => {
    const { data } = await adminA.client
      .from("project_delay_overview")
      .select("needs_delay_report, effective_target_date")
      .eq("project_id", lateProjectId)
      .single();

    expect(data?.needs_delay_report).toBe(true);
    expect(data?.effective_target_date).toBe(originalTarget);
  });

  it("admin instansi pemilik bisa mengirim laporan, dan target efektif ikut berubah", async () => {
    const revised = daysFromToday(30);

    const result = await submitDelayReport(
      delayForm(lateProjectId, revised),
      adminA.client
    );

    expect(result.success).toBe(true);

    const { data: overview } = await adminA.client
      .from("project_delay_overview")
      .select("needs_delay_report, effective_target_date")
      .eq("project_id", lateProjectId)
      .single();

    expect(overview?.effective_target_date).toBe(revised);
    expect(overview?.needs_delay_report).toBe(false);

    const { data: reasons } = await adminA.client
      .from("delay_report_reasons")
      .select("reason_category_id");

    expect(reasons?.map((reason) => reason.reason_category_id).sort()).toEqual([
      3, 5,
    ]);
  });

  it("target baru harus setelah target yang berlaku", async () => {
    const result = await submitDelayReport(
      delayForm(lateProjectId, nextIsoDate(todayInJakarta())),
      adminA.client
    );

    expect(result.success).toBe(false);
  });

  it("admin instansi lain ditolak", async () => {
    await expect(
      submitDelayReport(
        delayForm(lateProjectId, daysFromToday(60)),
        adminB.client
      )
    ).rejects.toThrow(AgencyAccessDeniedError);
  });

  it("anon tidak bisa menulis laporan, tetapi bisa membacanya", async () => {
    const { error: insertError } = await anonClient
      .from("project_delay_reports")
      .insert({
        project_id: lateProjectId,
        reason_detail: "Percobaan menulis laporan oleh pengguna anonim.",
        recovery_plan: "Percobaan menulis rencana oleh pengguna anonim.",
        revised_target_date: daysFromToday(90),
      });

    expect(insertError).not.toBeNull();

    const { data: publicReports } = await anonClient
      .from("project_delay_reports")
      .select("id")
      .eq("project_id", lateProjectId);

    expect(publicReports?.length).toBe(1);
  });

  it("laporan tidak bisa diubah atau dihapus setelah dikirim", async () => {
    const { data: updated } = await adminA.client
      .from("project_delay_reports")
      .update({ reason_detail: "Diubah diam-diam setelah dipublikasikan." })
      .eq("project_id", lateProjectId)
      .select("id");

    const { data: deleted } = await adminA.client
      .from("project_delay_reports")
      .delete()
      .eq("project_id", lateProjectId)
      .select("id");

    expect(updated?.length ?? 0).toBe(0);
    expect(deleted?.length ?? 0).toBe(0);
  });
});
