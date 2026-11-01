import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envLocalPath = path.resolve(process.cwd(), ".env.local");

  if (!fs.existsSync(envLocalPath)) {
    return;
  }

  const contents = fs.readFileSync(envLocalPath, "utf-8");

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();

    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");

    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    if (key !== "" && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

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

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tanggal `YYYY-MM-DD` relatif terhadap hari seed dijalankan, supaya status demo tetap relevan. */
function isoDateFromToday(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

/** Tanggal hari Minggu berikutnya (untuk car free day). */
function nextSundayOffset(): number {
  const day = new Date().getUTCDay();

  return day === 0 ? 7 : 7 - day;
}

type SeedRoadLandmark = {
  readonly name: string;
  readonly weight: number;
  readonly done: boolean;
};

type SeedRoadExpense = {
  readonly amount: number;
  readonly note: string;
  readonly landmarkIndex: number;
  readonly spentOffsetDays: number;
};

type SeedRoadProject = {
  readonly agencyId: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly locationName: string;
  readonly lat: number;
  readonly lng: number;
  readonly budgetTotal: number;
  readonly startOffsetDays: number;
  readonly endOffsetDays: number;
  readonly landmarks: readonly SeedRoadLandmark[];
  readonly expenses: readonly SeedRoadExpense[];
};

async function seedRoadProject(project: SeedRoadProject): Promise<void> {
  const { data: row, error } = await client
    .from("projects")
    .upsert(
      {
        agency_id: project.agencyId,
        slug: project.slug,
        title: project.title,
        description: project.description,
        category: project.category,
        location_name: project.locationName,
        lat: project.lat,
        lng: project.lng,
        budget_total: project.budgetTotal,
        start_date: isoDateFromToday(project.startOffsetDays),
        target_end_date: isoDateFromToday(project.endOffsetDays),
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (error || !row) {
    throw new Error(`Gagal membuat proyek ${project.slug}: ${error?.message}`);
  }

  await client.from("landmarks").delete().eq("project_id", row.id);

  if (project.landmarks.length === 0) {
    return;
  }

  const { data: landmarks, error: landmarkError } = await client
    .from("landmarks")
    .insert(
      project.landmarks.map((landmark, index) => ({
        project_id: row.id,
        name: landmark.name,
        weight: landmark.weight,
        position: index + 1,
        done: landmark.done,
        done_at: landmark.done
          ? `${isoDateFromToday(project.startOffsetDays + (index + 1) * 14)}T09:00:00Z`
          : null,
      }))
    )
    .select();

  if (landmarkError) {
    throw new Error(
      `Gagal membuat tahapan ${project.slug}: ${landmarkError.message}`
    );
  }

  await client.from("expenses").delete().eq("project_id", row.id);

  if (project.expenses.length === 0) {
    return;
  }

  const { error: expenseError } = await client.from("expenses").insert(
    project.expenses.map((expense) => ({
      project_id: row.id,
      landmark_id: landmarks?.[expense.landmarkIndex]?.id ?? null,
      amount: expense.amount,
      note: expense.note,
      spent_at: isoDateFromToday(expense.spentOffsetDays),
    }))
  );

  if (expenseError) {
    throw new Error(
      `Gagal membuat pengeluaran ${project.slug}: ${expenseError.message}`
    );
  }
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
        region: "Provinsi DKI Jakarta",
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
        region: "Provinsi DKI Jakarta",
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
    "superadmin@sipantau.co.id",
    "Password123!"
  );

  await client.from("profiles").upsert({
    id: superAdminId,
    role: "super_admin",
    agency_id: null,
  });

  const agencyAdminId = await findOrCreateUser(
    "admin.pupr@sipantau.co.id",
    "Password123!"
  );

  await client.from("profiles").upsert({
    id: agencyAdminId,
    role: "admin",
    agency_id: agencyPupr.id,
  });

  // 3. Proyek 1: Jembatan Kali Ciliwung
  console.log("-> Menyiapkan proyek demo...");

  // Data demo lama berlokasi di Banjarmasin; hapus supaya database lokal ikut pindah ke Jakarta.
  await client
    .from("projects")
    .delete()
    .eq("slug", "pembangunan-jembatan-sei-alalak");

  const { data: proj1, error: errP1 } = await client
    .from("projects")
    .upsert(
      {
        agency_id: agencyPupr.id,
        slug: "pembangunan-jembatan-ciliwung-kampung-melayu",
        title: "Pembangunan Jembatan Penghubung Kali Ciliwung Kampung Melayu",
        description:
          "Proyek pembangunan jembatan bentang lengkung di atas Kali Ciliwung untuk mengurai kemacetan Kampung Melayu - Jatinegara dan membuka akses kendaraan antarkelurahan. (Data demo untuk pengembangan.)",
        category: "Pembangunan Jalan & Jembatan",
        location_name: "Kampung Melayu, Jakarta Timur",
        lat: -6.2235,
        lng: 106.8655,
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
        location_name: "Tanah Abang, Jakarta Pusat",
        lat: -6.2088,
        lng: 106.8136,
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
        location_name: "Cakung, Jakarta Timur",
        lat: -6.188,
        lng: 106.942,
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

  // 6. Data demo PantauJalan (DKI Jakarta), mencakup semua kategori jalan
  console.log("-> Menyiapkan data demo PantauJalan (DKI Jakarta)...");

  const { data: agencyBinaMarga, error: errBinaMarga } = await client
    .from("agencies")
    .upsert(
      {
        name: "Dinas Bina Marga Provinsi DKI Jakarta",
        slug: "dinas-bina-marga-dki",
        region: "Provinsi DKI Jakarta",
        verified: true,
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (errBinaMarga || !agencyBinaMarga) {
    throw new Error(
      `Gagal membuat agency Bina Marga: ${errBinaMarga?.message}`
    );
  }

  const { data: agencyDishub, error: errDishub } = await client
    .from("agencies")
    .upsert(
      {
        name: "Dinas Perhubungan Provinsi DKI Jakarta",
        slug: "dinas-perhubungan-dki",
        region: "Provinsi DKI Jakarta",
        verified: true,
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (errDishub || !agencyDishub) {
    throw new Error(`Gagal membuat agency Dishub: ${errDishub?.message}`);
  }

  const DEMO_NOTE = " (Data demo untuk pengembangan.)";

  const roadProjects: readonly SeedRoadProject[] = [
    {
      agencyId: agencyBinaMarga.id,
      slug: "demo-pengaspalan-ulang-gatot-subroto",
      title: "Pengaspalan Ulang Jl. Gatot Subroto Ruas Semanggi - Kuningan",
      description:
        "Pengupasan dan pelapisan ulang aspal dua lajur kiri arah Cawang. Pekerjaan malam hari pukul 22.00 - 05.00, satu lajur ditutup bergantian." +
        DEMO_NOTE,
      category: "Perbaikan Jalan",
      locationName: "Jl. Gatot Subroto, Jakarta Selatan",
      lat: -6.2297,
      lng: 106.8208,
      budgetTotal: 2400000000,
      startOffsetDays: -60,
      endOffsetDays: 45,
      landmarks: [
        {
          name: "Pengupasan lapisan aspal lama (milling)",
          weight: 35,
          done: true,
        },
        {
          name: "Pelapisan aspal AC-WC lajur 1 dan 2",
          weight: 45,
          done: false,
        },
        { name: "Marka jalan dan pembukaan lajur", weight: 20, done: false },
      ],
      expenses: [
        {
          amount: 750000000,
          note: "Sewa mesin milling dan pengangkutan material bongkaran",
          landmarkIndex: 0,
          spentOffsetDays: -40,
        },
      ],
    },
    {
      agencyId: agencyBinaMarga.id,
      slug: "demo-perbaikan-trotoar-pasar-minggu",
      title: "Perbaikan Trotoar dan Saluran Tepi Jl. Raya Pasar Minggu",
      description:
        "Pembongkaran trotoar rusak dan saluran tepi jalan di sisi barat. Bahu jalan dipakai untuk material sehingga lajur kiri menyempit." +
        DEMO_NOTE,
      category: "Perbaikan Jalan",
      locationName: "Jl. Raya Pasar Minggu, Jakarta Selatan",
      lat: -6.27,
      lng: 106.84,
      budgetTotal: 1800000000,
      startOffsetDays: -150,
      endOffsetDays: -14,
      landmarks: [
        {
          name: "Pembongkaran trotoar dan saluran lama",
          weight: 30,
          done: true,
        },
        { name: "Pemasangan saluran U-ditch", weight: 40, done: true },
        { name: "Pemasangan paving dan ubin pemandu", weight: 30, done: false },
      ],
      expenses: [
        {
          amount: 1350000000,
          note: "Pengadaan U-ditch precast dan upah pemasangan",
          landmarkIndex: 1,
          spentOffsetDays: -70,
        },
      ],
    },
    {
      agencyId: agencyBinaMarga.id,
      slug: "demo-flyover-simpang-tanjung-barat",
      title: "Pembangunan Flyover Simpang Tanjung Barat",
      description:
        "Flyover dua lajur di atas perlintasan sebidang. Arus kendaraan dialihkan ke jalur samping selama pengecoran pilar." +
        DEMO_NOTE,
      category: "Pembangunan Jalan & Jembatan",
      locationName: "Tanjung Barat, Jakarta Selatan",
      lat: -6.3075,
      lng: 106.838,
      budgetTotal: 98000000000,
      startOffsetDays: -200,
      endOffsetDays: 240,
      landmarks: [
        { name: "Pondasi bore pile dan pile cap", weight: 25, done: true },
        { name: "Pilar dan pier head", weight: 25, done: true },
        { name: "Pemasangan girder dan pelat lantai", weight: 30, done: false },
        {
          name: "Pengaspalan, penerangan, dan uji beban",
          weight: 20,
          done: false,
        },
      ],
      expenses: [
        {
          amount: 41000000000,
          note: "Pekerjaan struktur bawah dan pilar",
          landmarkIndex: 1,
          spentOffsetDays: -60,
        },
      ],
    },
    {
      agencyId: agencyBinaMarga.id,
      slug: "demo-pelebaran-jalan-ciledug-raya",
      title: "Pelebaran Jl. Ciledug Raya Ruas Kebayoran Lama",
      description:
        "Penambahan satu lajur di kedua arah beserta trotoar baru. Seluruh lajur sudah dibuka untuk umum." +
        DEMO_NOTE,
      category: "Pembangunan Jalan & Jembatan",
      locationName: "Jl. Ciledug Raya, Jakarta Selatan",
      lat: -6.239,
      lng: 106.757,
      budgetTotal: 12500000000,
      startOffsetDays: -300,
      endOffsetDays: -30,
      landmarks: [
        {
          name: "Pembebasan lahan dan pemindahan utilitas",
          weight: 30,
          done: true,
        },
        { name: "Konstruksi lajur tambahan", weight: 50, done: true },
        { name: "Trotoar, marka, dan serah terima", weight: 20, done: true },
      ],
      expenses: [
        {
          amount: 11800000000,
          note: "Konstruksi lajur tambahan dan trotoar",
          landmarkIndex: 1,
          spentOffsetDays: -90,
        },
      ],
    },
    {
      agencyId: agencyBinaMarga.id,
      slug: "demo-galian-kabel-bawah-tanah-kramat-raya",
      title: "Galian Jaringan Kabel Listrik Bawah Tanah Jl. Kramat Raya",
      description:
        "Galian sistem buka-tutup per 50 meter di lajur lambat arah Senen untuk penanaman kabel tegangan menengah." +
        DEMO_NOTE,
      category: "Kabel Listrik Bawah Tanah",
      locationName: "Jl. Kramat Raya, Jakarta Pusat",
      lat: -6.187,
      lng: 106.844,
      budgetTotal: 3600000000,
      startOffsetDays: -20,
      endOffsetDays: 30,
      landmarks: [
        {
          name: "Galian dan penanaman kabel segmen 1-4",
          weight: 60,
          done: false,
        },
        {
          name: "Penutupan galian dan pengaspalan kembali",
          weight: 40,
          done: false,
        },
      ],
      expenses: [],
    },
    {
      agencyId: agencyDishub.id,
      slug: "demo-car-free-day-sudirman-thamrin",
      title: "Car Free Day Sudirman - Thamrin",
      description:
        "Jl. Jenderal Sudirman dan Jl. M.H. Thamrin ditutup untuk kendaraan bermotor pukul 06.00 - 09.00. Gunakan jalur alternatif lewat Jl. Kebon Sirih atau Jl. Rasuna Said." +
        DEMO_NOTE,
      category: "Acara & Penutupan Jalan",
      locationName: "Bundaran HI, Jakarta Pusat",
      lat: -6.195,
      lng: 106.823,
      budgetTotal: 0,
      startOffsetDays: nextSundayOffset(),
      endOffsetDays: nextSundayOffset(),
      landmarks: [],
      expenses: [],
    },
    {
      agencyId: agencyDishub.id,
      slug: "demo-penutupan-medan-merdeka-barat",
      title: "Penutupan Jl. Medan Merdeka Barat untuk Penyampaian Aspirasi",
      description:
        "Arus dari Jl. M.H. Thamrin menuju Harmoni dialihkan sejak pukul 10.00 sampai kegiatan selesai. Hindari kawasan Patung Kuda." +
        DEMO_NOTE,
      category: "Acara & Penutupan Jalan",
      locationName: "Jl. Medan Merdeka Barat, Jakarta Pusat",
      lat: -6.1772,
      lng: 106.8226,
      budgetTotal: 0,
      startOffsetDays: 2,
      endOffsetDays: 2,
      landmarks: [],
      expenses: [],
    },
  ];

  for (const roadProject of roadProjects) {
    await seedRoadProject(roadProject);
  }

  console.log("✅ Seeding selesai dengan sukses!");
  console.log("--------------------------------------------------");
  console.log("Kredensial Demo:");
  console.log("1. Super Admin:");
  console.log("   Email   : superadmin@sipantau.co.id");
  console.log("   Password: Password123!");
  console.log("   URL     : http://localhost:3000/super-admin");
  console.log("");
  console.log("2. Admin Instansi (Dinas PUPR):");
  console.log("   Email   : admin.pupr@sipantau.co.id");
  console.log("   Password: Password123!");
  console.log("   URL     : http://localhost:3000/admin");
  console.log("");
  console.log("PantauJalan (7 proyek demo DKI Jakarta):");
  console.log("   URL     : http://localhost:3000/pantau-jalan");
  console.log("--------------------------------------------------");
}

main().catch((err) => {
  console.error("Gagal menjalankan seeding:", err);
  process.exit(1);
});
