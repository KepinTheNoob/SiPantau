import { describe, it, expect } from "vitest";
import { splitNarrativePoints } from "@/lib/narrative-points";

describe("splitNarrativePoints", () => {
  it("memecah teks per baris dan membuang penanda poin", () => {
    expect(
      splitNarrativePoints(
        "* mengurangi kemacetan\n- Meningkatkan aksesibilitas\n• Trotoar baru\n2) Lampu jalan"
      )
    ).toEqual([
      "mengurangi kemacetan",
      "Meningkatkan aksesibilitas",
      "Trotoar baru",
      "Lampu jalan",
    ]);
  });

  it("melewati baris kosong dan menerima CRLF", () => {
    expect(splitNarrativePoints("  satu  \r\n\r\n\n dua ")).toEqual([
      "satu",
      "dua",
    ]);
  });

  it("teks satu paragraf menjadi satu poin", () => {
    expect(splitNarrativePoints("Jalan lebih rata.")).toEqual([
      "Jalan lebih rata.",
    ]);
  });

  it("teks kosong atau null tidak menghasilkan poin", () => {
    expect(splitNarrativePoints("")).toEqual([]);
    expect(splitNarrativePoints(null)).toEqual([]);
    expect(splitNarrativePoints(undefined)).toEqual([]);
  });

  it("angka di awal kalimat tanpa penanda tetap utuh", () => {
    expect(splitNarrativePoints("90 keluarga mendapat hunian")).toEqual([
      "90 keluarga mendapat hunian",
    ]);
  });
});
