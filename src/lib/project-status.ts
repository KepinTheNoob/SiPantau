/**
 * Status proyek dari kolom `status_waktu` di view `project_stats`.
 *   pengerjaan  : belum selesai dan belum melewati target
 *   tepat_waktu : semua tahapan selesai pada/sebelum target
 *   terlambat   : melewati target tanpa selesai, atau selesai setelah target
 */
export type ProjectStatus = "pengerjaan" | "tepat_waktu" | "terlambat";

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "pengerjaan",
  "tepat_waktu",
  "terlambat",
];

export const PROJECT_STATUS_DISPLAY: Readonly<
  Record<
    ProjectStatus,
    {
      readonly label: string;
      /** Penjelasan singkat untuk keterangan/legenda. */
      readonly description: string;
      readonly markerColor: string;
      readonly badgeClass: string;
    }
  >
> = {
  pengerjaan: {
    label: "Pengerjaan",
    description: "Sedang dikerjakan, belum melewati target",
    markerColor: "#0d6be3",
    badgeClass:
      "bg-brand-blue-light text-brand-blue border border-brand-blue/20",
  },
  tepat_waktu: {
    label: "Tepat Waktu",
    description: "Selesai sebelum atau pada target",
    markerColor: "#0abc8f",
    badgeClass:
      "bg-brand-green-light text-brand-green border border-brand-green/20",
  },
  terlambat: {
    label: "Terlambat",
    description: "Melewati target selesai",
    markerColor: "#dc2626",
    badgeClass: "bg-red-50 text-red-700 border border-red-200",
  },
};

/** Menormalkan `status_waktu` dari database; nilai tak dikenal dianggap masih dikerjakan. */
export function parseProjectStatus(value: string | null): ProjectStatus {
  return PROJECT_STATUSES.find((status) => status === value) ?? "pengerjaan";
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Keterangan selesai untuk proyek yang sudah rampung, misalnya "Selesai 12 hari setelah target". */
export function completionNote(
  completedAt: string,
  targetEndDate: string
): string {
  const completedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date(completedAt));

  const lateDays = Math.round(
    (Date.parse(`${completedDate}T00:00:00Z`) -
      Date.parse(`${targetEndDate}T00:00:00Z`)) /
      DAY_MS
  );

  return lateDays > 0
    ? `Selesai ${lateDays} hari setelah target`
    : "Selesai sesuai target";
}
