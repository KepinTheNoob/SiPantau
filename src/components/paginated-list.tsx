"use client";

import { useState, type ReactNode } from "react";

/**
 * Daftar dengan pagination di sisi klien. Item sudah dirender oleh pemanggil;
 * komponen ini hanya memilih potongan yang tampil dan menyediakan tombol halaman.
 */
export function PaginatedList({
  items,
  pageSize,
  label,
  listAs = "div",
  listClassName,
  navClassName = "mt-4",
}: {
  readonly items: readonly ReactNode[];
  readonly pageSize: number;
  /** Nama daftar untuk pembaca layar, misalnya "Laporan warga". */
  readonly label: string;
  readonly listAs?: "div" | "ul";
  readonly listClassName: string;
  /** Jarak/padding baris tombol halaman, menyesuaikan wadah daftar. */
  readonly navClassName?: string;
}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // Jumlah item bisa berkurang setelah refresh (misalnya laporan sudah dibalas).
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * pageSize;
  const visibleItems = items.slice(firstIndex, firstIndex + pageSize);
  const ListTag = listAs;

  const buttonClass =
    "inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-700";

  return (
    <div>
      <ListTag aria-label={label} className={listClassName}>
        {visibleItems}
      </ListTag>

      {totalPages > 1 && (
        <nav
          aria-label={`Halaman ${label.toLowerCase()}`}
          className={`flex items-center justify-between gap-3 ${navClassName}`}
        >
          <button
            type="button"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={buttonClass}
          >
            ← Sebelumnya
          </button>
          <p className="text-xs text-slate-600" aria-live="polite">
            Halaman {currentPage} dari {totalPages}
          </p>
          <button
            type="button"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={buttonClass}
          >
            Berikutnya →
          </button>
        </nav>
      )}
    </div>
  );
}
