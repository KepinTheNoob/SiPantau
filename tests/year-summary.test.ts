import { describe, it, expect } from "vitest";
import { jakartaYear, summarizeYear } from "@/lib/year-summary";

const base = {
  startDate: "2026-02-01",
  targetEndDate: "2026-11-30",
  budgetTotal: 100,
  isCompleted: false,
  completedAt: null,
};

describe("summarizeYear", () => {
  it("menghitung proyek berjalan, selesai tahun ini, pagu, dan belanja", () => {
    const summary = summarizeYear(
      2026,
      [
        base,
        // Selesai tahun ini.
        { ...base, isCompleted: true, completedAt: "2026-06-01T03:00:00Z" },
        // Terlambat dari 2025, masih dikerjakan: tetap berjalan tahun ini.
        { ...base, startDate: "2025-01-01", targetEndDate: "2025-12-31" },
        // Selesai tahun lalu: tidak dihitung.
        {
          ...base,
          startDate: "2025-01-01",
          targetEndDate: "2025-12-31",
          isCompleted: true,
          completedAt: "2025-12-20T03:00:00Z",
        },
        // Baru mulai tahun depan: tidak dihitung.
        { ...base, startDate: "2027-01-05", targetEndDate: "2027-12-31" },
      ],
      [10, 15]
    );

    expect(summary).toEqual({
      year: 2026,
      runningProjects: 3,
      completedThisYear: 1,
      allocatedBudget: 300,
      spentThisYear: 25,
    });
  });

  it("tahun selesai mengikuti zona WIB", () => {
    // 31 Des 2025 18:00 UTC = 1 Jan 2026 01:00 WIB.
    expect(jakartaYear("2025-12-31T18:00:00Z")).toBe(2026);
  });
});
