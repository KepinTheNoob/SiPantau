import { describe, it, expect } from "vitest";
import { hitungProgres, type ProgressLandmark } from "@/lib/progress";

describe("hitungProgres (Perhitungan Progres Berbobot)", () => {
  it("mengembalikan 0 jika daftar landmark kosong", () => {
    const landmarks: readonly ProgressLandmark[] = [];
    expect(hitungProgres(landmarks)).toBe(0);
  });

  it("menghitung progres dengan benar saat bobot landmark bervariasi", () => {
    const landmarks: readonly ProgressLandmark[] = [
      { weight: 10, done_at: "2026-03-01T00:00:00Z" },
      { weight: 30, done_at: null },
      { weight: 60, done_at: null },
    ];

    // Selesai 10 dari total 100 -> 10%
    expect(hitungProgres(landmarks)).toBe(10);

    const landmarks2: readonly ProgressLandmark[] = [
      { weight: 10, done_at: "2026-03-01T00:00:00Z" },
      { weight: 30, done_at: "2026-04-01T00:00:00Z" },
      { weight: 60, done_at: null },
    ];

    // Selesai 40 dari total 100 -> 40%
    expect(hitungProgres(landmarks2)).toBe(40);
  });

  it("mengembalikan 100 jika semua landmark selesai", () => {
    const landmarks: readonly ProgressLandmark[] = [
      { weight: 25, done_at: "2026-02-01T00:00:00Z" },
      { weight: 75, done_at: "2026-05-15T00:00:00Z" },
    ];

    expect(hitungProgres(landmarks)).toBe(100);
  });

  it("mengembalikan 0 jika belum ada satu pun landmark yang selesai", () => {
    const landmarks: readonly ProgressLandmark[] = [
      { weight: 50, done_at: null },
      { weight: 50, done_at: null },
    ];

    expect(hitungProgres(landmarks)).toBe(0);
  });
});
