"use client";

import { useState, type ReactNode } from "react";

/** Menampilkan `initialCount` item pertama; sisanya dibuka dengan tombol. */
export function ShowMoreList({
  items,
  initialCount,
}: {
  readonly items: readonly ReactNode[];
  readonly initialCount: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const hiddenCount = items.length - initialCount;
  const visibleItems = expanded ? items : items.slice(0, initialCount);

  return (
    <div className="space-y-4">
      {visibleItems}
      {hiddenCount > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="min-h-11 w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
          {expanded
            ? "Tampilkan lebih sedikit"
            : `Tampilkan ${hiddenCount} laporan lainnya`}
        </button>
      )}
    </div>
  );
}
