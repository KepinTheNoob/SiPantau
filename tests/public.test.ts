import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getServiceClient,
  getAnonClient,
  cleanupTestData,
} from "./support/supabase";
import { formatRupiah } from "@/lib/rupiah";
import { BUDGET_OVERRUN_THRESHOLD_PERCENT } from "@/lib/constants";

describe("Fase 4: Public Data Visibility and Calculations", () => {
  let verifiedAgencyId: string;
  let unverifiedAgencyId: string;

  let activeVerifiedProjectId: string;
  let archivedProjectId: string;
  let unverifiedAgencyProjectId: string;

  const serviceClient = getServiceClient();
  const anonClient = getAnonClient();

  beforeAll(async () => {
    await cleanupTestData();

    // 1. Seed Agencies
    const { data: verAgency } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Perumahan Rakyat",
        slug: "dinas-perumahan-rakyat",
        region: "Semarang",
        verified: true,
      })
      .select()
      .single();

    verifiedAgencyId = verAgency?.id ?? "";

    const { data: unverAgency } = await serviceClient
      .from("agencies")
      .insert({
        name: "Instansi Fiktif",
        slug: "instansi-fiktif",
        region: "Antah Berantah",
        verified: false,
      })
      .select()
      .single();

    unverifiedAgencyId = unverAgency?.id ?? "";

    // 2. Seed Projects
    // a) Active verified project
    const { data: actProj } = await serviceClient
      .from("projects")
      .insert({
        agency_id: verifiedAgencyId,
        slug: "rusunawa-semarang-timur",
        title: "Pembangunan Rusunawa Semarang Timur",
        description: "Hunian vertikal terjangkau untuk masyarakat",
        category: "Perumahan",
        location_name: "Semarang Timur",
        budget_total: 1000000000,
        start_date: "2026-01-01",
        target_end_date: "2026-12-31",
      })
      .select()
      .single();

    activeVerifiedProjectId = actProj?.id ?? "";

    // b) Archived project on verified agency
    const { data: archProj } = await serviceClient
      .from("projects")
      .insert({
        agency_id: verifiedAgencyId,
        slug: "proyek-lama-diarsipkan",
        title: "Proyek Lama Diarsipkan",
        description: "Proyek yang sudah diarsipkan",
        category: "Perumahan",
        location_name: "Semarang",
        budget_total: 200000000,
        start_date: "2025-01-01",
        target_end_date: "2025-06-30",
        archived_at: "2025-07-01T00:00:00Z",
      })
      .select()
      .single();

    archivedProjectId = archProj?.id ?? "";

    // c) Active project on unverified agency
    const { data: unverProj } = await serviceClient
      .from("projects")
      .insert({
        agency_id: unverifiedAgencyId,
        slug: "proyek-instansi-belum-terverifikasi",
        title: "Proyek Belum Terverifikasi",
        description: "Tidak boleh bocor ke publik",
        category: "Lainnya",
        location_name: "Wilayah X",
        budget_total: 500000000,
        start_date: "2026-01-01",
        target_end_date: "2026-12-31",
      })
      .select()
      .single();

    unverifiedAgencyProjectId = unverProj?.id ?? "";

    // 3. Seed Landmarks for active verified project
    await serviceClient.from("landmarks").insert([
      {
        project_id: activeVerifiedProjectId,
        name: "Landmark 1",
        position: 0,
        weight: 40,
        done: true,
        done_at: "2026-03-01T00:00:00Z",
      },
      {
        project_id: activeVerifiedProjectId,
        name: "Landmark 2",
        position: 1,
        weight: 60,
        done: false,
      },
    ]);

    // 4. Seed Expenses for active verified project
    await serviceClient.from("expenses").insert([
      {
        project_id: activeVerifiedProjectId,
        amount: 300000000,
        note: "Pengeluaran termin pertama",
      },
    ]);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("anon sees active verified projects in project_stats with correct calculations", async () => {
    const { data: stats, error } = await anonClient
      .from("project_stats")
      .select("*")
      .eq("project_id", activeVerifiedProjectId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(stats).not.toBeNull();
    expect(stats?.title).toBe("Pembangunan Rusunawa Semarang Timur");
    expect(stats?.progress_percent).toBe(40);
    expect(Number(stats?.spent_total)).toBe(300000000);
    expect(Number(stats?.budget_total)).toBe(1000000000);
  });

  it("anon CANNOT see archived projects in project_stats", async () => {
    const { data: stats } = await anonClient
      .from("project_stats")
      .select("*")
      .eq("project_id", archivedProjectId)
      .maybeSingle();

    expect(stats).toBeNull();
  });

  it("anon CANNOT see projects from unverified agencies in project_stats", async () => {
    const { data: stats } = await anonClient
      .from("project_stats")
      .select("*")
      .eq("project_id", unverifiedAgencyProjectId)
      .maybeSingle();

    expect(stats).toBeNull();
  });

  it("formatRupiah formats values into valid IDR representation", () => {
    expect(formatRupiah(1500000000)).toMatch(/Rp\s*1\.500\.000\.000/);
    expect(formatRupiah(0)).toMatch(/Rp\s*0/);
    expect(formatRupiah(BigInt(50000))).toMatch(/Rp\s*50\.000/);
  });

  it("budget overrun threshold constant is set to 20 percent", () => {
    expect(BUDGET_OVERRUN_THRESHOLD_PERCENT).toBe(20);
  });
});
