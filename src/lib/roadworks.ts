import type { Coordinates } from "@/lib/geo";
import {
  ROAD_EVENT_CATEGORY,
  type RoadCategory,
} from "@/lib/project-categories";

export type RoadworkStatus = "tepat_waktu" | "terlambat" | "selesai";

export type RoadworkProject = Coordinates & {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly locationName: string;
  readonly agencyName: string | null;
  readonly category: RoadCategory;
  readonly status: RoadworkStatus;
  readonly progressPercent: number;
  readonly targetEndDate: string;
  /** Selisih hari kalender (zona Asia/Jakarta) dari hari ini ke target selesai; negatif bila lewat. */
  readonly daysToDeadline: number;
};

/** 0 berarti tanpa batas radius. */
export const ROADWORK_RADIUS_OPTIONS_KM = [2, 5, 10, 25, 0] as const;

export const DEFAULT_ROADWORK_RADIUS_KM = 10;

export const ROADWORK_STATUS_DISPLAY: Readonly<
  Record<
    RoadworkStatus,
    {
      readonly label: string;
      readonly markerColor: string;
      readonly badgeClass: string;
    }
  >
> = {
  tepat_waktu: {
    label: "Tepat waktu",
    markerColor: "#0d6be3",
    badgeClass:
      "bg-brand-blue-light text-brand-blue border border-brand-blue/20",
  },
  terlambat: {
    label: "Terlambat",
    markerColor: "#b45309",
    badgeClass: "bg-amber-50 text-amber-800 border border-amber-200",
  },
  selesai: {
    label: "Selesai",
    markerColor: "#0abc8f",
    badgeClass:
      "bg-brand-green-light text-brand-green border border-brand-green/20",
  },
};

/** Menormalkan nilai `status_waktu` dari view `project_stats`. */
export function roadworkStatusFrom(statusWaktu: string | null): RoadworkStatus {
  if (statusWaktu === "selesai") {
    return "selesai";
  }

  if (statusWaktu === "terlambat") {
    return "terlambat";
  }

  return "tepat_waktu";
}

/** Teks sisa waktu menuju deadline, misalnya "61 hari lagi" atau "lewat 12 hari". */
export function deadlineCountdown(
  project: Pick<RoadworkProject, "category" | "status" | "daysToDeadline">
): string {
  const isEvent = project.category === ROAD_EVENT_CATEGORY;

  if (!isEvent && project.status === "selesai") {
    return "sudah selesai";
  }

  if (project.daysToDeadline === 0) {
    return isEvent ? "berakhir hari ini" : "deadline hari ini";
  }

  if (project.daysToDeadline > 0) {
    return `${project.daysToDeadline} hari lagi`;
  }

  return `lewat ${Math.abs(project.daysToDeadline)} hari`;
}
