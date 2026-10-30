export type ProgressLandmark = {
  readonly weight: number;
  readonly done_at: string | null;
};

/**
 * Menghitung persentase progres berbobot dari sekumpulan landmark.
 * Progres = (Total bobot selesai / Total bobot keseluruhan) * 100 (dibulatkan ke bilangan bulat).
 */
export function hitungProgres(landmarks: readonly ProgressLandmark[]): number {
  if (landmarks.length === 0) {
    return 0;
  }

  let totalWeight = 0;
  let completedWeight = 0;

  for (const landmark of landmarks) {
    totalWeight += landmark.weight;

    if (landmark.done_at !== null) {
      completedWeight += landmark.weight;
    }
  }

  if (totalWeight <= 0) {
    return 0;
  }

  const rawPercent = (completedWeight / totalWeight) * 100;
  const rounded = Math.round(rawPercent);

  return Math.min(100, Math.max(0, rounded));
}
