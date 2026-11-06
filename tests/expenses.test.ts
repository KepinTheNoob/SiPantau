import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getServiceClient,
  createTestUserClient,
  cleanupTestData,
  type TestUserContext,
} from "./support/supabase";
import {
  addExpense,
  updateExpense,
  deleteExpense,
} from "@/server/controllers/expenses";
import { AgencyAccessDeniedError } from "@/server/auth/errors";

describe("Fase 5: Budget and Realization (Expenses) Authorization", () => {
  let agencyAId: string;
  let agencyBId: string;

  let adminA: TestUserContext;
  let adminB: TestUserContext;

  let projectAId: string;
  let projectBId: string;

  let landmarkAId: string;
  let expenseBId: string;

  const serviceClient = getServiceClient();

  beforeAll(async () => {
    await cleanupTestData();

    // 1. Seed Agencies
    const { data: agA } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Bina Marga Jateng",
        slug: "dinas-bina-marga-jateng",
        region: "Jawa Tengah",
        verified: true,
      })
      .select()
      .single();

    agencyAId = agA?.id ?? "";

    const { data: agB } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Pendidikan Jabar",
        slug: "dinas-pendidikan-jabar",
        region: "Jawa Barat",
        verified: true,
      })
      .select()
      .single();

    agencyBId = agB?.id ?? "";

    // 2. Seed Admin Users
    adminA = await createTestUserClient(
      "admin.jateng@gov.id",
      "admin",
      agencyAId
    );

    adminB = await createTestUserClient(
      "admin.jabar@gov.id",
      "admin",
      agencyBId
    );

    // 3. Seed Projects
    const { data: projA } = await serviceClient
      .from("projects")
      .insert({
        agency_id: agencyAId,
        slug: "pelebaran-jalan-pantura",
        title: "Pelebaran Jalan Pantura",
        description: "Pelebaran jalan arteri nasional",
        category: "Infrastruktur",
        location_name: "Kendal - Batang",
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
        slug: "pembangunan-lab-komputer",
        title: "Pembangunan Lab Komputer",
        description: "Laboratorium komputer siswa SMK",
        category: "Pendidikan",
        location_name: "Bandung",
        budget_total: 400000000,
        start_date: "2026-02-01",
        target_end_date: "2026-10-31",
      })
      .select()
      .single();

    projectBId = projB?.id ?? "";

    // 4. Seed Landmark for project A
    const { data: lmA } = await serviceClient
      .from("landmarks")
      .insert({
        project_id: projectAId,
        name: "Pengaspalan Lapisan Bawah",
        position: 0,
        weight: 50,
      })
      .select()
      .single();

    landmarkAId = lmA?.id ?? "";

    // 5. Seed Expense on Project B
    const { data: expB } = await serviceClient
      .from("expenses")
      .insert({
        project_id: projectBId,
        amount: 50000000,
        note: "Pengadaan server dan PC awal",
      })
      .select()
      .single();

    expenseBId = expB?.id ?? "";
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("admin A can add expense linked to landmark on own project with evidence", async () => {
    const fakeEvidenceFile = new File(
      ["fake-kuitansi-content"],
      "kuitansi.jpg",
      {
        type: "image/jpeg",
      }
    );

    const formData = new FormData();
    formData.append("projectId", projectAId);
    formData.append("landmarkId", landmarkAId);
    formData.append("amount", "250000000");
    formData.append("note", "Pembelian material aspal dan sewa alat berat");
    formData.append("spent_at", "2026-03-15");
    formData.append("evidence", fakeEvidenceFile);

    const result = await addExpense(formData, adminA.client);

    expect(result.success).toBe(true);
    expect(result.expenseId).toBeDefined();

    // Verify in database
    const { data: exp } = await adminA.client
      .from("expenses")
      .select("*")
      .eq("id", result.expenseId ?? "")
      .single();

    expect(exp?.project_id).toBe(projectAId);
    expect(exp?.landmark_id).toBe(landmarkAId);
    expect(Number(exp?.amount)).toBe(250000000);
    expect(exp?.evidence_path).toContain(agencyAId);
  });

  it("admin A CANNOT add expense to project B (tertolak requireAgencyAccess)", async () => {
    const fakeEvidenceFile = new File(["fake-kuitansi"], "kuitansi.jpg", {
      type: "image/jpeg",
    });

    const formData = new FormData();
    formData.append("projectId", projectBId);
    formData.append("amount", "10000000");
    formData.append("note", "Pengeluaran liar pada proyek B");
    formData.append("evidence", fakeEvidenceFile);

    await expect(addExpense(formData, adminA.client)).rejects.toThrow(
      AgencyAccessDeniedError
    );
  });

  it("admin A CANNOT update or delete expense belonging to project B", async () => {
    const formUpdate = new FormData();
    formUpdate.append("projectId", projectBId);
    formUpdate.append("expenseId", expenseBId);
    formUpdate.append("amount", "999999");
    formUpdate.append("note", "Perubahan liar");

    await expect(updateExpense(formUpdate, adminA.client)).rejects.toThrow(
      AgencyAccessDeniedError
    );

    const formDelete = new FormData();
    formDelete.append("projectId", projectBId);
    formDelete.append("expenseId", expenseBId);

    await expect(deleteExpense(formDelete, adminA.client)).rejects.toThrow(
      AgencyAccessDeniedError
    );
  });

  it("admin B can delete own expense on project B", async () => {
    const formDelete = new FormData();
    formDelete.append("projectId", projectBId);
    formDelete.append("expenseId", expenseBId);

    const result = await deleteExpense(formDelete, adminB.client);
    expect(result.success).toBe(true);
  });

  it("allows total spent to exceed total budget without crashing database constraint", async () => {
    // Project budget is 1.000.000.000, adding 1.200.000.000 expense
    const fakeEvidenceFile = new File(["kuitansi-besar"], "nota.pdf", {
      type: "application/pdf",
    });

    const formData = new FormData();
    formData.append("projectId", projectAId);
    formData.append("amount", "1200000000");
    formData.append("note", "Biaya eskalasi tak terduga yang melampaui pagu");
    formData.append("evidence", fakeEvidenceFile);

    const result = await addExpense(formData, adminA.client);
    expect(result.success).toBe(true);

    // Verify spent total in project_stats reflects actual over-budget amount
    const { data: stats } = await serviceClient
      .from("project_stats")
      .select("spent_total, budget_total")
      .eq("project_id", projectAId)
      .single();

    // 250.000.000 + 1.200.000.000 = 1.450.000.000
    expect(Number(stats?.spent_total)).toBe(1450000000);
    expect(Number(stats?.budget_total)).toBe(1000000000);
  });
});
