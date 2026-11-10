/** Penanda poin yang sering diketik admin: "-", "*", "•", "–", atau penomoran "1." / "1)". */
const BULLET_PREFIX = /^(?:[-*•–]|\d+[.)])\s+/;

/**
 * Memecah teks tujuan/dampak menjadi poin: satu baris satu poin.
 * Penanda poin di awal baris dibuang dan baris kosong dilewati.
 */
export function splitNarrativePoints(
  text: string | null | undefined
): readonly string[] {
  return (text ?? "").split(/\r?\n/).flatMap((line) => {
    const point = line.trim().replace(BULLET_PREFIX, "").trim();

    return point === "" ? [] : [point];
  });
}
