import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ROAD_CATEGORIES,
  ROAD_EVENT_CATEGORY,
  isRoadCategory,
} from "@/lib/project-categories";
import { roadworkStatusFrom, type RoadworkProject } from "@/lib/roadworks";

export type RoadworkLoadResult = {
  readonly projects: readonly RoadworkProject[];
  readonly loadFailed: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date()
  );
}

/** Selisih hari kalender antara dua tanggal `YYYY-MM-DD`. */
function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  return Math.round(
    (Date.parse(`${toIsoDate}T00:00:00Z`) -
      Date.parse(`${fromIsoDate}T00:00:00Z`)) /
      DAY_MS
  );
}

/**
 * Proyek PantauSekitar yang punya titik koordinat.
 * Acara penutupan jalan yang sudah lewat tanggalnya tidak ditampilkan karena jalannya sudah dibuka.
 */
export async function getRoadworkProjects(): Promise<RoadworkLoadResult> {
  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from("projects")
    .select(
      "id, slug, title, category, location_name, lat, lng, target_end_date, agencies (name)"
    )
    .in("category", [...ROAD_CATEGORIES])
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (error !== null) {
    return { projects: [], loadFailed: true };
  }

  if (rows.length === 0) {
    return { projects: [], loadFailed: false };
  }

  const { data: stats, error: statsError } = await supabase
    .from("project_stats")
    .select("project_id, progress_percent, status_waktu")
    .in(
      "project_id",
      rows.map((row) => row.id)
    );

  if (statsError !== null) {
    return { projects: [], loadFailed: true };
  }

  const statsByProject = new Map(stats.map((stat) => [stat.project_id, stat]));
  const today = todayInJakarta();
  const projects: RoadworkProject[] = [];

  for (const row of rows) {
    if (row.lat === null || row.lng === null || !isRoadCategory(row.category)) {
      continue;
    }

    const daysToDeadline = daysBetween(today, row.target_end_date);

    if (row.category === ROAD_EVENT_CATEGORY && daysToDeadline < 0) {
      continue;
    }

    const stat = statsByProject.get(row.id);

    projects.push({
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      locationName: row.location_name,
      agencyName: row.agencies?.name ?? null,
      lat: row.lat,
      lng: row.lng,
      status: roadworkStatusFrom(stat?.status_waktu ?? null),
      progressPercent: Math.round(stat?.progress_percent ?? 0),
      targetEndDate: row.target_end_date,
      daysToDeadline,
    });
  }

  return { projects, loadFailed: false };
}
