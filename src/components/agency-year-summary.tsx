import { formatRupiah } from "@/lib/rupiah";
import type { YearSummary } from "@/lib/year-summary";

/** Ringkasan tahun berjalan untuk dasbor admin instansi. */
export function AgencyYearSummary({
  summary,
}: {
  readonly summary: YearSummary;
}) {
  const spentPercent =
    summary.allocatedBudget > 0
      ? Math.round((summary.spentThisYear / summary.allocatedBudget) * 100)
      : 0;

  return (
    <section
      aria-labelledby="year-summary-title"
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <h2 id="year-summary-title" className="text-lg font-bold text-slate-900">
        Ringkasan Tahun {summary.year}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Dihitung dari {summary.runningProjects} proyek aktif yang berjalan pada
        tahun {summary.year}.
      </p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Proyek Selesai Tahun Ini
          </dt>
          <dd className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {summary.completedThisYear}
            </span>
            <span className="text-sm text-slate-500">
              dari {summary.runningProjects} proyek
            </span>
          </dd>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Alokasi Anggaran
          </dt>
          <dd className="mt-1 break-words font-mono text-xl font-bold text-slate-900">
            {formatRupiah(summary.allocatedBudget)}
          </dd>
          <dd className="mt-1 text-xs text-slate-500">
            Total pagu proyek yang berjalan tahun ini
          </dd>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Anggaran Terpakai Tahun Ini
          </dt>
          <dd className="mt-1 break-words font-mono text-xl font-bold text-slate-900">
            {formatRupiah(summary.spentThisYear)}
          </dd>
          <dd className="mt-2">
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-label="Anggaran terpakai dibanding alokasi"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(spentPercent, 100)}
            >
              <div
                className="h-full rounded-full bg-brand-blue"
                style={{ width: `${Math.min(spentPercent, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {spentPercent}% dari alokasi
            </p>
          </dd>
        </div>
      </dl>
    </section>
  );
}
