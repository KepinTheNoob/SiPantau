import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getServiceClient,
  getAnonClient,
  createTestUserClient,
  cleanupTestData,
  type TestUserContext,
} from "./support/supabase";

describe("Supabase Schema and RLS Security Policies", () => {
  let agencyAId: string;
  let agencyBId: string;
  let agencyCId: string;

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
        name: "Dinas Pekerjaan Umum",
        slug: "dinas-pu",
        region: "Jakarta",
        verified: true,
      })
      .select()
      .single();

    if (errA !== null || agencyA === null) {
      throw new Error(`Failed to seed agency A: ${errA?.message}`);
    }

    agencyAId = agencyA.id;

    const { data: agencyB, error: errB } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Kesehatan",
        slug: "dinas-kesehatan",
        region: "Bandung",
        verified: true,
      })
      .select()
      .single();

    if (errB !== null || agencyB === null) {
      throw new Error(`Failed to seed agency B: ${errB?.message}`);
    }

    agencyBId = agencyB.id;

    const { data: agencyC, error: errC } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Perhubungan",
        slug: "dinas-perhubungan",
        region: "Surabaya",
        verified: false, // unverified agency
      })
      .select()
      .single();

    if (errC !== null || agencyC === null) {
      throw new Error(`Failed to seed agency C: ${errC?.message}`);
    }

    agencyCId = agencyC.id;

    // 2. Create Authenticated User Clients
    adminA = await createTestUserClient(
      "admin.a@example.com",
      "admin",
      agencyAId
    );
    adminB = await createTestUserClient(
      "admin.b@example.com",
      "admin",
      agencyBId
    );
    adminC = await createTestUserClient(
      "admin.c@example.com",
      "admin",
      agencyCId
    );
    superAdmin = await createTestUserClient(
      "superadmin@example.com",
      "super_admin",
      null
    );
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("admin A can insert, update, and delete projects, landmarks, and expenses on own verified agency", async () => {
    // INSERT project
    const { data: newProject, error: projectInsertError } = await adminA.client
      .from("projects")
      .insert({
        agency_id: agencyAId,
        slug: "proyek-jembatan-a",
        title: "Pembangunan Jembatan A",
        description: "Jembatan penghubung",
        category: "Infrastruktur",
        location_name: "Jakarta Selatan",
        budget_total: 1000000000,
        start_date: "2026-01-01",
        target_end_date: "2026-12-31",
      })
      .select()
      .single();

    expect(projectInsertError).toBeNull();
    expect(newProject).not.toBeNull();
    const projectId = newProject?.id ?? "";

    // INSERT landmark
    const { data: newLandmark, error: landmarkInsertError } =
      await adminA.client
        .from("landmarks")
        .insert({
          project_id: projectId,
          name: "Pondasi Dasar",
          position: 1,
          weight: 10,
          done: false,
        })
        .select()
        .single();

    expect(landmarkInsertError).toBeNull();
    expect(newLandmark).not.toBeNull();
    const landmarkId = newLandmark?.id ?? "";

    // UPDATE landmark
    const { error: landmarkUpdateError } = await adminA.client
      .from("landmarks")
      .update({ done: true, done_at: new Date().toISOString() })
      .eq("id", landmarkId);

    expect(landmarkUpdateError).toBeNull();

    // INSERT expense
    const { data: newExpense, error: expenseInsertError } = await adminA.client
      .from("expenses")
      .insert({
        project_id: projectId,
        landmark_id: landmarkId,
        amount: 250000000,
        note: "Bahan semen dan beton",
      })
      .select()
      .single();

    expect(expenseInsertError).toBeNull();
    expect(newExpense).not.toBeNull();
    const expenseId = newExpense?.id ?? "";

    // UPDATE expense
    const { error: expenseUpdateError } = await adminA.client
      .from("expenses")
      .update({ note: "Bahan semen, pasir, dan beton" })
      .eq("id", expenseId);

    expect(expenseUpdateError).toBeNull();

    // DELETE expense
    const { error: expenseDeleteError } = await adminA.client
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    expect(expenseDeleteError).toBeNull();

    // DELETE landmark
    const { error: landmarkDeleteError } = await adminA.client
      .from("landmarks")
      .delete()
      .eq("id", landmarkId);

    expect(landmarkDeleteError).toBeNull();

    // UPDATE project
    const { error: projectUpdateError } = await adminA.client
      .from("projects")
      .update({ title: "Pembangunan Jembatan A Tahap 1" })
      .eq("id", projectId);

    expect(projectUpdateError).toBeNull();
  });

  it("admin A cannot insert, update, or delete project, landmark, or expense belonging to agency B", async () => {
    // 1. Seed Project B under Agency B using admin B
    const { data: projectB, error: seedError } = await adminB.client
      .from("projects")
      .insert({
        agency_id: agencyBId,
        slug: "rsud-b",
        title: "Pembangunan RSUD B",
        description: "Gedung RSUD",
        category: "Kesehatan",
        location_name: "Bandung Barat",
        budget_total: 500000000,
        start_date: "2026-02-01",
        target_end_date: "2026-11-30",
      })
      .select()
      .single();

    expect(seedError).toBeNull();
    const projectBId = projectB?.id ?? "";

    // Seed Landmark B & Expense B
    const { data: landmarkB } = await adminB.client
      .from("landmarks")
      .insert({
        project_id: projectBId,
        name: "Struktur Tiang",
        position: 1,
        weight: 5,
      })
      .select()
      .single();

    const landmarkBId = landmarkB?.id ?? "";

    const { data: expenseB } = await adminB.client
      .from("expenses")
      .insert({
        project_id: projectBId,
        landmark_id: landmarkBId,
        amount: 100000000,
        note: "Pengadaan tiang",
      })
      .select()
      .single();

    const expenseBId = expenseB?.id ?? "";

    // 2. Admin A tries to INSERT project under agency B -> rejected
    const { error: unauthorizedProjectInsert } = await adminA.client
      .from("projects")
      .insert({
        agency_id: agencyBId,
        slug: "infiltrasi-proyek",
        title: "Proyek Ilegal",
        category: "Infrastruktur",
        location_name: "Jakarta",
        budget_total: 1000000,
        start_date: "2026-01-01",
        target_end_date: "2026-12-31",
      });

    expect(unauthorizedProjectInsert).not.toBeNull();

    // 3. Admin A tries to UPDATE Project B -> rejected by RLS (0 rows updated)
    const { data: updateProjectResult } = await adminA.client
      .from("projects")
      .update({ title: "Judul Diretas" })
      .eq("id", projectBId)
      .select();

    expect(updateProjectResult).toHaveLength(0);

    // Verify Project B title is unchanged
    const { data: checkProject } = await serviceClient
      .from("projects")
      .select("title")
      .eq("id", projectBId)
      .single();

    expect(checkProject?.title).toBe("Pembangunan RSUD B");

    // 4. Admin A tries to DELETE Project B -> rejected by RLS (0 rows deleted)
    const { data: deleteProjectResult } = await adminA.client
      .from("projects")
      .delete()
      .eq("id", projectBId)
      .select();

    expect(deleteProjectResult).toHaveLength(0);

    // 5. Admin A tries to INSERT landmark on Project B -> rejected
    const { error: unauthorizedLandmarkInsert } = await adminA.client
      .from("landmarks")
      .insert({
        project_id: projectBId,
        name: "Landmark Ilegal",
        position: 2,
        weight: 5,
      });

    expect(unauthorizedLandmarkInsert).not.toBeNull();

    // 6. Admin A tries to UPDATE Landmark B -> rejected (0 rows updated)
    const { data: updateLandmarkResult } = await adminA.client
      .from("landmarks")
      .update({ name: "Landmark Diretas" })
      .eq("id", landmarkBId)
      .select();

    expect(updateLandmarkResult).toHaveLength(0);

    // 7. Admin A tries to DELETE Landmark B -> rejected (0 rows deleted)
    const { data: deleteLandmarkResult } = await adminA.client
      .from("landmarks")
      .delete()
      .eq("id", landmarkBId)
      .select();

    expect(deleteLandmarkResult).toHaveLength(0);

    // 8. Admin A tries to INSERT expense on Project B -> rejected
    const { error: unauthorizedExpenseInsert } = await adminA.client
      .from("expenses")
      .insert({
        project_id: projectBId,
        amount: 50000000,
        note: "Biaya Ilegal",
      });

    expect(unauthorizedExpenseInsert).not.toBeNull();

    // 9. Admin A tries to UPDATE Expense B -> rejected (0 rows updated)
    const { data: updateExpenseResult } = await adminA.client
      .from("expenses")
      .update({ note: "Catatan Diretas" })
      .eq("id", expenseBId)
      .select();

    expect(updateExpenseResult).toHaveLength(0);

    // 10. Admin A tries to DELETE Expense B -> rejected (0 rows deleted)
    const { data: deleteExpenseResult } = await adminA.client
      .from("expenses")
      .delete()
      .eq("id", expenseBId)
      .select();

    expect(deleteExpenseResult).toHaveLength(0);
  });

  it("admin from unverified agency cannot insert projects", async () => {
    const { error: unverifiedInsertError } = await adminC.client
      .from("projects")
      .insert({
        agency_id: agencyCId,
        slug: "terminal-c",
        title: "Pembangunan Terminal C",
        category: "Transportasi",
        location_name: "Surabaya Timur",
        budget_total: 750000000,
        start_date: "2026-03-01",
        target_end_date: "2026-10-31",
      });

    // RLS policy checks is_verified_agency_admin, which returns false for unverified agency
    expect(unverifiedInsertError).not.toBeNull();
  });

  it("anon cannot write anything to any table", async () => {
    // Anon tries to insert into agencies
    const { error: agencyInsertError } = await anonClient
      .from("agencies")
      .insert({
        name: "Instansi Palsu",
        slug: "instansi-palsu",
        region: "Online",
      });

    expect(agencyInsertError).not.toBeNull();

    // Anon tries to insert into projects
    const { error: projectInsertError } = await anonClient
      .from("projects")
      .insert({
        agency_id: agencyAId,
        slug: "proyek-anon",
        title: "Proyek Anon",
        category: "Umum",
        location_name: "Online",
        budget_total: 1000000,
        start_date: "2026-01-01",
        target_end_date: "2026-12-31",
      });

    expect(projectInsertError).not.toBeNull();

    // Anon tries to insert into landmarks
    const { error: landmarkInsertError } = await anonClient
      .from("landmarks")
      .insert({
        project_id: "00000000-0000-0000-0000-000000000000",
        name: "Landmark Anon",
        position: 1,
        weight: 1,
      });

    expect(landmarkInsertError).not.toBeNull();

    // Anon tries to insert into expenses
    const { error: expenseInsertError } = await anonClient
      .from("expenses")
      .insert({
        project_id: "00000000-0000-0000-0000-000000000000",
        amount: 10000,
      });

    expect(expenseInsertError).not.toBeNull();

    // Anon tries to insert into profiles
    const { error: profileInsertError } = await anonClient
      .from("profiles")
      .insert({
        id: "00000000-0000-0000-0000-000000000000",
        role: "admin",
      });

    expect(profileInsertError).not.toBeNull();
  });

  it("anon does not see archived projects or projects from unverified agencies", async () => {
    // 1. Project A1: verified agency, not archived -> visible to anon
    const { data: pubProject } = await serviceClient
      .from("projects")
      .insert({
        agency_id: agencyAId,
        slug: "proyek-publik-a1",
        title: "Proyek Publik A1",
        category: "Pendidikan",
        location_name: "Jakarta",
        budget_total: 200000000,
        start_date: "2026-01-01",
        target_end_date: "2026-12-31",
        archived_at: null,
      })
      .select()
      .single();

    const pubProjectId = pubProject?.id ?? "";

    // 2. Project A2: verified agency, archived -> NOT visible to anon
    const { data: archivedProject } = await serviceClient
      .from("projects")
      .insert({
        agency_id: agencyAId,
        slug: "proyek-arsip-a2",
        title: "Proyek Arsip A2",
        category: "Pendidikan",
        location_name: "Jakarta",
        budget_total: 300000000,
        start_date: "2025-01-01",
        target_end_date: "2025-12-31",
        archived_at: new Date().toISOString(),
      })
      .select()
      .single();

    const archivedProjectId = archivedProject?.id ?? "";

    // 3. Project C1: unverified agency C -> NOT visible to anon
    const { data: unverifiedProject } = await serviceClient
      .from("projects")
      .insert({
        agency_id: agencyCId,
        slug: "proyek-unverified-c1",
        title: "Proyek Unverified C1",
        category: "Transportasi",
        location_name: "Surabaya",
        budget_total: 400000000,
        start_date: "2026-01-01",
        target_end_date: "2026-12-31",
        archived_at: null,
      })
      .select()
      .single();

    const unverifiedProjectId = unverifiedProject?.id ?? "";

    // Query as anon
    const { data: anonProjects } = await anonClient
      .from("projects")
      .select("id");

    const anonProjectIds = (anonProjects ?? []).map((p) => p.id);

    expect(anonProjectIds).toContain(pubProjectId);
    expect(anonProjectIds).not.toContain(archivedProjectId);
    expect(anonProjectIds).not.toContain(unverifiedProjectId);
  });

  it("user cannot update their own role or agency_id", async () => {
    // Admin A attempts privilege escalation to super_admin
    const { data: roleEscalationResult } = await adminA.client
      .from("profiles")
      .update({ role: "super_admin" })
      .eq("id", adminA.userId)
      .select();

    expect(roleEscalationResult).toHaveLength(0);

    // Verify role remains 'admin' in database
    const { data: profileCheck } = await serviceClient
      .from("profiles")
      .select("role, agency_id")
      .eq("id", adminA.userId)
      .single();

    expect(profileCheck?.role).toBe("admin");
    expect(profileCheck?.agency_id).toBe(agencyAId);

    // Admin A attempts to switch agency_id to Agency B
    const { data: agencySwitchResult } = await adminA.client
      .from("profiles")
      .update({ agency_id: agencyBId })
      .eq("id", adminA.userId)
      .select();

    expect(agencySwitchResult).toHaveLength(0);
  });

  it("admin cannot change agencies.verified", async () => {
    // Admin A tries to verify unverified Agency C
    const { data: updateAgencyResult } = await adminA.client
      .from("agencies")
      .update({ verified: true })
      .eq("id", agencyCId)
      .select();

    expect(updateAgencyResult).toHaveLength(0);

    // Verify agency C remains unverified
    const { data: agencyCCheck } = await serviceClient
      .from("agencies")
      .select("verified")
      .eq("id", agencyCId)
      .single();

    expect(agencyCCheck?.verified).toBe(false);

    // Super Admin CAN change verified
    const { error: superAdminUpdateError } = await superAdmin.client
      .from("agencies")
      .update({ verified: true })
      .eq("id", agencyCId);

    expect(superAdminUpdateError).toBeNull();

    // Reset agency C back to unverified
    await serviceClient
      .from("agencies")
      .update({ verified: false })
      .eq("id", agencyCId);
  });

  it("audit_logs cannot be modified or deleted, and new entries are produced on mutation", async () => {
    // Admin A creates a project
    const { data: projectData } = await adminA.client
      .from("projects")
      .insert({
        agency_id: agencyAId,
        slug: "proyek-audit-test",
        title: "Proyek Uji Audit",
        category: "Sosial",
        location_name: "Jakarta",
        budget_total: 100000000,
        start_date: "2026-01-01",
        target_end_date: "2026-12-31",
      })
      .select()
      .single();

    const projectId = projectData?.id ?? "";

    // Query audit_logs as Admin A for this entity
    const { data: logs, error: logQueryError } = await adminA.client
      .from("audit_logs")
      .select("*")
      .eq("entity_id", projectId);

    expect(logQueryError).toBeNull();
    expect(logs).not.toBeNull();
    expect(logs?.length).toBeGreaterThan(0);

    const logEntry = logs?.[0];
    expect(logEntry?.action).toBe("INSERT");
    expect(logEntry?.entity).toBe("projects");
    expect(logEntry?.actor_id).toBe(adminA.userId);
    expect(logEntry?.agency_id).toBe(agencyAId);
    expect(logEntry?.after).not.toBeNull();

    const logId = logEntry?.id ?? "";

    // Admin A tries to UPDATE audit_logs -> rejected by RLS (no policy)
    const { data: updateLogResult } = await adminA.client
      .from("audit_logs")
      .update({ action: "DELETE" })
      .eq("id", logId)
      .select();

    expect(updateLogResult).toHaveLength(0);

    // Admin A tries to DELETE from audit_logs -> rejected by RLS (no policy)
    const { data: deleteLogResult } = await adminA.client
      .from("audit_logs")
      .delete()
      .eq("id", logId)
      .select();

    expect(deleteLogResult).toHaveLength(0);

    // Super Admin also cannot update/delete audit_logs via client (no policy exists)
    const { data: superAdminDeleteResult } = await superAdmin.client
      .from("audit_logs")
      .delete()
      .eq("id", logId)
      .select();

    expect(superAdminDeleteResult).toHaveLength(0);
  });

  it("project_stats calculates weighted progress correctly and does not leak unverified/archived project data to anon", async () => {
    // Create a project under Agency A
    const { data: project } = await adminA.client
      .from("projects")
      .insert({
        agency_id: agencyAId,
        slug: "proyek-stats-calc",
        title: "Perhitungan Progres Proyek",
        category: "Infrastruktur",
        location_name: "Jakarta",
        budget_total: 100000000,
        start_date: "2026-01-01",
        target_end_date: "2026-12-31",
      })
      .select()
      .single();

    const projId = project?.id ?? "";

    // Add landmarks:
    // Landmark 1: weight 3, done: true
    // Landmark 2: weight 1, done: false
    // Expected progress: (3 / 4) * 100 = 75.00%
    await adminA.client.from("landmarks").insert([
      {
        project_id: projId,
        name: "Tahap 1",
        position: 1,
        weight: 3,
        done: true,
      },
      {
        project_id: projId,
        name: "Tahap 2",
        position: 2,
        weight: 1,
        done: false,
      },
    ]);

    // Add expenses: 30,000,000 + 20,000,000 = 50,000,000
    await adminA.client.from("expenses").insert([
      { project_id: projId, amount: 30000000, note: "Biaya 1" },
      { project_id: projId, amount: 20000000, note: "Biaya 2" },
    ]);

    // Query stats as anon
    const { data: stats, error: statsError } = await anonClient
      .from("project_stats")
      .select("*")
      .eq("project_id", projId)
      .single();

    expect(statsError).toBeNull();
    expect(stats).not.toBeNull();
    expect(Number(stats?.progress_percent)).toBe(75);
    expect(Number(stats?.spent_total)).toBe(50000000);
    expect(stats?.status_waktu).toBe("pengerjaan");

    // Create an unverified project under Agency C
    const { data: secretProject } = await serviceClient
      .from("projects")
      .insert({
        agency_id: agencyCId,
        slug: "proyek-rahasia-c",
        title: "Proyek Rahasia",
        category: "Pertahanan",
        location_name: "Surabaya",
        budget_total: 999999999,
        start_date: "2026-01-01",
        target_end_date: "2026-12-31",
      })
      .select()
      .single();

    const secretProjId = secretProject?.id ?? "";

    // Query stats for secret project as anon -> returns 0 rows (no leak)
    const { data: leakedStats } = await anonClient
      .from("project_stats")
      .select("*")
      .eq("project_id", secretProjId);

    expect(leakedStats).toHaveLength(0);
  });

  it("storage upload to another agency path is rejected", async () => {
    const fileContent = new Blob(["dummy content"], { type: "image/png" });

    // Admin A uploads to own agency path: `${agencyAId}/bukti.png` -> succeeds
    const validPath = `${agencyAId}/bukti.png`;

    const { error: validUploadError } = await adminA.client.storage
      .from("evidence")
      .upload(validPath, fileContent, { upsert: true });

    expect(validUploadError).toBeNull();

    // Admin A tries to upload to Agency B path: `${agencyBId}/bukti-ilegal.png` -> rejected
    const invalidPath = `${agencyBId}/bukti-ilegal.png`;

    const { error: invalidUploadError } = await adminA.client.storage
      .from("evidence")
      .upload(invalidPath, fileContent, { upsert: true });

    expect(invalidUploadError).not.toBeNull();
  });
});
