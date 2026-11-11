/** Tahun kalender (zona Asia/Jakarta) dari sebuah timestamp. */
export function jakartaYear(timestamp: string): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
    }).format(new Date(timestamp))
  );
}

/** Rentang timestamp [start, end) untuk filter kueri. */
export type TimestampRange = {
  readonly start: string;
  readonly end: string;
};

/** Batas awal dan akhir (eksklusif) satu tahun kalender WIB, untuk filter timestamp. */
export function jakartaYearRange(year: number): TimestampRange {
  return {
    start: `${year}-01-01T00:00:00+07:00`,
    end: `${year + 1}-01-01T00:00:00+07:00`,
  };
}

export type YearProjectRow = {
  readonly startDate: string;
  readonly targetEndDate: string;
  readonly budgetTotal: number;
  readonly isCompleted: boolean;
  readonly completedAt: string | null;
};

export type YearSummary = {
  readonly year: number;
  /** Proyek yang dikerjakan pada tahun ini (termasuk yang terlambat dari tahun sebelumnya). */
  readonly runningProjects: number;
  readonly completedThisYear: number;
  /** Jumlah pagu proyek yang berjalan tahun ini (pagu utuh, tidak dibagi per tahun). */
  readonly allocatedBudget: number;
  /** Realisasi belanja yang dicatat sepanjang tahun ini. */
  readonly spentThisYear: number;
};

/**
 * Proyek dihitung berjalan pada tahun `year` bila sudah dimulai sebelum tahun itu berakhir dan
 * belum selesai sebelum tahun itu dimulai: targetnya jatuh di tahun ini atau sesudahnya,
 * atau masih dikerjakan (terlambat), atau selesai di tahun ini.
 */
export function summarizeYear(
  year: number,
  projects: readonly YearProjectRow[],
  expenseAmounts: readonly number[]
): YearSummary {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  let runningProjects = 0;
  let completedThisYear = 0;
  let allocatedBudget = 0;

  for (const project of projects) {
    const completedYear =
      project.isCompleted && project.completedAt !== null
        ? jakartaYear(project.completedAt)
        : null;

    const isRunning =
      project.startDate <= yearEnd &&
      (project.targetEndDate >= yearStart ||
        !project.isCompleted ||
        completedYear === year);

    if (isRunning) {
      runningProjects += 1;
      allocatedBudget += project.budgetTotal;
    }

    if (completedYear === year) {
      completedThisYear += 1;
    }
  }

  return {
    year,
    runningProjects,
    completedThisYear,
    allocatedBudget,
    spentThisYear: expenseAmounts.reduce((total, amount) => total + amount, 0),
  };
}
