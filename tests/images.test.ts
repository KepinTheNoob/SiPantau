import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  getServiceClient,
  getAnonClient,
  createTestUserClient,
  cleanupTestData,
  type TestSupabaseClient,
  type TestUserContext,
} from "./support/supabase";

/** Akun warga: punya sesi login tetapi tidak punya profil pengelola. */
async function createCitizenClient(email: string): Promise<TestSupabaseClient> {
  const service = getServiceClient();
  const password = "password123!";

  const { error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError !== null) {
    throw new Error(`Gagal membuat akun warga: ${createError.message}`);
  }

  const { data: session, error: signInError } =
    await getAnonClient().auth.signInWithPassword({ email, password });

  if (signInError !== null || session.session === null) {
    throw new Error(`Gagal login akun warga: ${signInError?.message}`);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${session.session.access_token}` },
    },
  });
}

describe("Galeri proyek & foto bukti tahapan: RLS", () => {
  const serviceClient = getServiceClient();
  const anonClient = getAnonClient();

  let adminA: TestUserContext;
  let adminB: TestUserContext;
  let citizenClient: TestSupabaseClient;

  let projectAId: string;
  let landmarkAId: string;

  beforeAll(async () => {
    await cleanupTestData();

    const { data: agencyA } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Bina Marga Uji A",
        slug: "dinas-bina-marga-uji-a",
        region: "DKI Jakarta",
        verified: true,
      })
      .select()
      .single();

    const { data: agencyB } = await serviceClient
      .from("agencies")
      .insert({
        name: "Dinas Bina Marga Uji B",
        slug: "dinas-bina-marga-uji-b",
        region: "Jawa Barat",
        verified: true,
      })
      .select()
      .single();

    adminA = await createTestUserClient(
      "admin.foto.a@gov.id",
      "admin",
      agencyA?.id ?? ""
    );

    adminB = await createTestUserClient(
      "admin.foto.b@gov.id",
      "admin",
      agencyB?.id ?? ""
    );

    citizenClient = await createCitizenClient("warga.foto@warga.id");

    const { data: project } = await serviceClient
      .from("projects")
      .insert({
        agency_id: agencyA?.id ?? "",
        slug: "uji-galeri-foto",
        title: "Uji Galeri Foto",
        description: "Proyek untuk menguji RLS galeri dan foto bukti.",
        category: "Perbaikan Jalan",
        location_name: "Jakarta Pusat",
        budget_total: 100000000,
        start_date: "2026-01-01",
        target_end_date: "2026-12-31",
      })
      .select()
      .single();

    projectAId = project?.id ?? "";

    const { data: landmark } = await serviceClient
      .from("landmarks")
      .insert({
        project_id: projectAId,
        name: "Pengaspalan lajur kiri",
        weight: 100,
        position: 1,
      })
      .select()
      .single();

    landmarkAId = landmark?.id ?? "";
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("admin instansi pemilik proyek bisa menambah foto bukti tahapan", async () => {
    const { error } = await adminA.client.from("landmark_images").insert({
      landmark_id: landmarkAId,
      image_path: "uji/landmark-a-1.jpg",
    });

    expect(error).toBeNull();
  });

  it("admin instansi lain TIDAK bisa menambah foto bukti", async () => {
    const { error } = await adminB.client.from("landmark_images").insert({
      landmark_id: landmarkAId,
      image_path: "uji/landmark-a-b.jpg",
    });

    expect(error).not.toBeNull();
  });

  it("warga yang login TIDAK bisa menambah foto bukti", async () => {
    const { error } = await citizenClient.from("landmark_images").insert({
      landmark_id: landmarkAId,
      image_path: "uji/landmark-a-warga.jpg",
    });

    expect(error).not.toBeNull();
  });

  it("anon TIDAK bisa menambah foto bukti maupun foto galeri", async () => {
    const { error: landmarkError } = await anonClient
      .from("landmark_images")
      .insert({ landmark_id: landmarkAId, image_path: "uji/anon.jpg" });

    const { error: galleryError } = await anonClient
      .from("project_images")
      .insert({ project_id: projectAId, image_path: "uji/anon.jpg" });

    expect(landmarkError).not.toBeNull();
    expect(galleryError).not.toBeNull();
  });

  it("publik bisa melihat foto bukti proyek aktif", async () => {
    const { data } = await anonClient
      .from("landmark_images")
      .select("id")
      .eq("landmark_id", landmarkAId);

    expect(data?.length).toBe(1);
  });

  it("satu proyek hanya boleh punya satu foto sampul", async () => {
    const { error: firstError } = await adminA.client
      .from("project_images")
      .insert({
        project_id: projectAId,
        image_path: "uji/sampul-1.jpg",
        is_cover: true,
      });

    const { error: secondError } = await adminA.client
      .from("project_images")
      .insert({
        project_id: projectAId,
        image_path: "uji/sampul-2.jpg",
        is_cover: true,
      });

    expect(firstError).toBeNull();
    expect(secondError).not.toBeNull();
  });
});
