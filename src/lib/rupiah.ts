/**
 * Format angka atau bigint rupiah ke format standar mata uang Indonesia (Rp).
 * Contoh: 1500000000 -> "Rp 1.500.000.000"
 */
export function formatRupiah(amount: number | bigint): string {
  const value = Number(amount);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
