import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL belum dikonfigurasi. Salin .env.example ke .env.local."
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi. Salin .env.example ke .env.local."
  );
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findOrCreateUser(
  email: string,
  password: string
): Promise<string> {
  const { data: listData } = await client.auth.admin.listUsers();
  const existing = listData?.users.find((u) => u.email === email);

  if (existing) {
    await client.auth.admin.updateUserById(existing.id, { password });

    return existing.id;
  }

  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Gagal membuat user ${email}: ${error?.message}`);
  }

  return data.user.id;
}

async function main() {
  console.log("🌱 Menyiapkan data awal (seeding)...");

  // 1. Instansi
  console.log("-> Membuat instansi...");

  const { data: agencyPupr, error: errPupr } = await client
    .from("agencies")
    .upsert(
      {
        name: "Dinas Pekerjaan Umum dan Penataan Ruang (PUPR)",
        slug: "dinas-pupr",
        region: "Provinsi Kalimantan Selatan",
        verified: true,
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (errPupr || !agencyPupr) {
    throw new Error(`Gagal membuat agency PUPR: ${errPupr?.message}`);
  }

  const { data: agencyPerumahan, error: errPerumahan } = await client
    .from("agencies")
    .upsert(
      {
        name: "Dinas Perumahan Rakyat dan Kawasan Permukiman",
        slug: "dinas-perumahan-rakyat",
        region: "Provinsi Kalimantan Selatan",
        verified: true,
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (errPerumahan || !agencyPerumahan) {
    throw new Error(`Gagal membuat agency Perumahan: ${errPerumahan?.message}`);
  }

  // 2. Akun & Profil
  console.log("-> Menyiapkan akun super admin & admin instansi...");

  const superAdminId = await findOrCreateUser(
    "superadmin@transparansi.go.id",
    "Password123!"
  );

  await client.from("profiles").upsert({
    id: superAdminId,
    role: "super_admin",
    agency_id: null,
  });

  const agencyAdminId = await findOrCreateUser(
    "admin.pupr@transparansi.go.id",
    "Password123!"
  );

  await client.from("profiles").upsert({
    id: agencyAdminId,
    role: "admin",
    agency_id: agencyPupr.id,
  });

  // 3. Proyek 1: Jembatan Sei Alalak
  console.log("-> Menyiapkan proyek demo...");

  const { data: proj1, error: errP1 } = await client
    .from("projects")
    .upsert(
      {
        agency_id: agencyPupr.id,
        slug: "pembangunan-jembatan-sei-alalak",
        title: "Pembangunan Jembatan Sei Alalak",
        description:
          "Proyek pembangunan jembatan bentang lengkung untuk mengurai kemacetan dan memperlancar konektivitas logistik antarwilayah.",
        category: "Infrastruktur",
        location_name: "Banjarmasin Utara, Kalimantan Selatan",
        lat: -3.2842,
        lng: 114.5881,
        budget_total: 15000000000,
        start_date: "2026-01-15",
        target_end_date: "2026-12-31",
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (errP1 || !proj1) {
    throw new Error(`Gagal membuat proyek 1: ${errP1?.message}`);
  }

  // Landmarks Proyek 1
  await client.from("landmarks").delete().eq("project_id", proj1.id);

  const { data: lm1 } = await client
    .from("landmarks")
    .insert([
      {
        project_id: proj1.id,
        name: "Pekerjaan Pondasi dan Tiang Pancang",
        weight: 30,
        position: 1,
        done: true,
        done_at: "2026-03-30T10:00:00Z",
      },
      {
        project_id: proj1.id,
        name: "Struktur Utama Bentang Tengah Pelengkung",
        weight: 40,
        position: 2,
        done: true,
        done_at: "2026-07-15T14:30:00Z",
      },
      {
        project_id: proj1.id,
        name: "Pengaspalan, Penerangan, dan Uji Beban",
        weight: 30,
        position: 3,
        done: false,
      },
    ])
    .select();

  // Pengeluaran Proyek 1
  await client.from("expenses").delete().eq("project_id", proj1.id);
  await client.from("expenses").insert([
    {
      project_id: proj1.id,
      landmark_id: lm1?.[0]?.id ?? null,
      amount: 4500000000,
      note: "Pengadaan tiang pancang baja mutu tinggi dan pengecoran spun pile",
      spent_at: "2026-02-15",
    },
    {
      project_id: proj1.id,
      landmark_id: lm1?.[1]?.id ?? null,
      amount: 5800000000,
      note: "Fabrikasi baja girder bentang utama dan perakitan struktur lengkung",
      spent_at: "2026-06-20",
    },
  ]);

  // Laporan Warga Proyek 1
  await client.from("citizen_reports").delete().eq("project_id", proj1.id);
  await client.from("citizen_reports").insert([
    {
      project_id: proj1.id,
      reporter_name: "Budi Santoso",
      reporter_contact: "budi@warga.id",
      content:
        "Progres lengkung jembatan sudah tersambung rapi. Rambu peringatan dan penerangan kerja terpasang dengan baik di malam hari.",
      status: "approved",
      moderated_at: "2026-07-20T08:00:00Z",
    },
    {
      project_id: proj1.id,
      reporter_name: "Ahmad Fauzi",
      reporter_contact: "fauzi@gmail.com",
      content:
        "Truk material sempat menimbulkan antrean di jam sibuk pagi hari. Mohon pengaturan jadwal bongkar muat di luar jam padat.",
      status: "pending",
    },
  ]);

  // 4. Proyek 2: Revitalisasi Saluran Drainase Utama Kota
  const { data: proj2, error: errP2 } = await client
    .from("projects")
    .upsert(
      {
        agency_id: agencyPupr.id,
        slug: "revitalisasi-saluran-drainase-utama-kota",
        title: "Revitalisasi Saluran Drainase Utama Kota",
        description:
          "Normalisasi dan perkuatan tanggul saluran pembuangan air utama guna menanggulangi genangan banjir musiman di kawasan permukiman padat.",
        category: "Lingkungan",
        location_name: "Banjarmasin Tengah",
        lat: -3.3194,
        lng: 114.5908,
        budget_total: 3200000000,
        start_date: "2026-02-01",
        target_end_date: "2026-08-31",
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (errP2 || !proj2) {
    throw new Error(`Gagal membuat proyek 2: ${errP2?.message}`);
  }

  // Landmarks Proyek 2
  await client.from("landmarks").delete().eq("project_id", proj2.id);

  const { data: lm2 } = await client
    .from("landmarks")
    .insert([
      {
        project_id: proj2.id,
        name: "Pengerukan Sedimen Lumpur Sepanjang 3,5 KM",
        weight: 40,
        position: 1,
        done: true,
        done_at: "2026-04-10T11:00:00Z",
      },
      {
        project_id: proj2.id,
        name: "Pemasangan Dinding Precast U-Ditch 120x120",
        weight: 60,
        position: 2,
        done: false,
      },
    ])
    .select();

  // Pengeluaran Proyek 2
  await client.from("expenses").delete().eq("project_id", proj2.id);
  await client.from("expenses").insert([
    {
      project_id: proj2.id,
      landmark_id: lm2?.[0]?.id ?? null,
      amount: 1200000000,
      note: "Sewa excavator amfibi dan angkutan pembuangan lumpur sedimen",
      spent_at: "2026-03-25",
    },
  ]);

  // 5. Proyek 3: Rusunawa ASN Tahap 2 (Perumahan Rakyat)
  const { data: proj3, error: errP3 } = await client
    .from("projects")
    .upsert(
      {
        agency_id: agencyPerumahan.id,
        slug: "pembangunan-rusunawa-tahap-2",
        title: "Pembangunan Rumah Susun Sewa (Rusunawa) Tahap 2",
        description:
          "Penyediaan hunian vertikal layak huni sebanyak 90 unit tipe 36 dilengkapi fasilitas ruang terbuka hijau dan sarana ramah difabel.",
        category: "Perumahan",
        location_name: "Banjarmasin Selatan",
        lat: -3.3421,
        lng: 114.6052,
        budget_total: 8500000000,
        start_date: "2026-03-01",
        target_end_date: "2026-12-15",
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (errP3 || !proj3) {
    throw new Error(`Gagal membuat proyek 3: ${errP3?.message}`);
  }

  await client.from("landmarks").delete().eq("project_id", proj3.id);
  await client.from("landmarks").insert([
    {
      project_id: proj3.id,
      name: "Struktur Pondasi Bore Pile & Kolom Lantai 1",
      weight: 35,
      position: 1,
      done: true,
      done_at: "2026-05-18T10:00:00Z",
    },
    {
      project_id: proj3.id,
      name: "Struktur Balok & Lantai 2 s.d 4",
      weight: 35,
      position: 2,
      done: false,
    },
    {
      project_id: proj3.id,
      name: "Arsitektural, Mekanikal, Elektrikal & Plumbing (MEP)",
      weight: 30,
      position: 3,
      done: false,
    },
  ]);

  console.log("✅ Seeding selesai dengan sukses!");
  console.log("--------------------------------------------------");
  console.log("Kredensial Demo:");
  console.log("1. Super Admin:");
  console.log("   Email   : superadmin@transparansi.go.id");
  console.log("   Password: Password123!");
  console.log("   URL     : http://localhost:3000/super-admin");
  console.log("");
  console.log("2. Admin Instansi (Dinas PUPR):");
  console.log("   Email   : admin.pupr@transparansi.go.id");
  console.log("   Password: Password123!");
  console.log("   URL     : http://localhost:3000/admin");
  console.log("--------------------------------------------------");
}

main().catch((err) => {
  console.error("Gagal menjalankan seeding:", err);
  process.exit(1);
});
