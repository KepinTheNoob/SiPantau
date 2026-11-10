import type { Coordinates } from "@/lib/geo";
import { ROAD_EVENT_CATEGORY } from "@/lib/project-categories";
import type { ProjectStatus } from "@/lib/project-status";

export type RoadworkProject = Coordinates & {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly locationName: string;
  readonly agencyName: string | null;
  readonly category: string;
  readonly status: ProjectStatus;
  readonly isCompleted: boolean;
  readonly progressPercent: number;
  /** Target selesai yang berlaku: target revisi terakhir bila ada, selain itu target awal. */
  readonly targetEndDate: string;
  readonly isTargetRevised: boolean;
  /** Selisih hari kalender (zona Asia/Jakarta) dari hari ini ke target selesai; negatif bila lewat. */
  readonly daysToDeadline: number;
};

/** Teks sisa waktu menuju deadline, misalnya "61 hari lagi" atau "lewat 12 hari". */
export function deadlineCountdown(
  project: Pick<RoadworkProject, "category" | "isCompleted" | "daysToDeadline">
): string {
  const isEvent = project.category === ROAD_EVENT_CATEGORY;

  if (!isEvent && project.isCompleted) {
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
