/**
 * Kategori PantauJalanan: proyek atau kegiatan yang memakai badan jalan.
 * Hanya kategori ini yang tampil di peta "Proyek Jalan di Sekitar Anda".
 */
export const ROAD_CATEGORIES = [
  "Perbaikan Jalan",
  "Pembangunan Jalan & Jembatan",
  "Kabel Listrik Bawah Tanah",
  "Acara & Penutupan Jalan",
] as const;

export type RoadCategory = (typeof ROAD_CATEGORIES)[number];

/** Kategori untuk kegiatan sementara (demo, CFD, acara resmi), bukan pekerjaan fisik. */
export const ROAD_EVENT_CATEGORY: RoadCategory = "Acara & Penutupan Jalan";

export const ROAD_CATEGORY_HINTS: Readonly<Record<RoadCategory, string>> = {
  "Perbaikan Jalan": "Pengaspalan ulang, tambal lubang, perbaikan trotoar",
  "Pembangunan Jalan & Jembatan": "Jalan baru, pelebaran, flyover, jembatan",
  "Kabel Listrik Bawah Tanah": "Galian jaringan kabel di bawah jalan",
  "Acara & Penutupan Jalan":
    "Demo, car free day, acara resmi yang menutup jalan",
};

export const OTHER_PROJECT_CATEGORIES = [
  "Pendidikan & Sekolah",
  "Kesehatan & Rumah Sakit",
  "Lingkungan Hidup & Air",
  "Teknologi & Digitalisasi",
  "Lainnya",
] as const;

export function isRoadCategory(category: string): category is RoadCategory {
  return ROAD_CATEGORIES.some((roadCategory) => roadCategory === category);
}

export function isKnownProjectCategory(category: string): boolean {
  return (
    isRoadCategory(category) ||
    OTHER_PROJECT_CATEGORIES.some((other) => other === category)
  );
}
