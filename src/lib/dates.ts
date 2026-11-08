/** Format tanggal `YYYY-MM-DD` menjadi "31 Des 2026" (zona UTC agar sama di server & browser). */
export function formatIsoDate(isoDate: string): string {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString(
    "id-ID",
    { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }
  );
}

/** Tanggal `YYYY-MM-DD` sehari setelah `isoDate`. */
export function nextIsoDate(isoDate: string): string {
  const next = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);

  next.setUTCDate(next.getUTCDate() + 1);

  return next.toISOString().slice(0, 10);
}
