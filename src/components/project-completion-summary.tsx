export type RegionProjectSummary = {
  readonly region: string;
  readonly completed: number;
  readonly total: number;
};

export function ProjectCompletionSummary({
  completed,
  total,
  regions,
}: {
  readonly completed: number;
  readonly total: number;
  readonly regions?: readonly RegionProjectSummary[];
}) {
  const completionPercent =
    total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Ringkasan Proyek</h2>
          <p className="mt-1 text-sm text-slate-500">
            Capaian proyek aktif berdasarkan penyelesaian seluruh tahapan.
          </p>
        </div>
        <span className="rounded-full bg-brand-blue-light px-3 py-1 text-xs font-bold text-brand-blue">
          {completionPercent}% selesai
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Proyek Selesai
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-green">
            {completed}
            <span className="ml-1 text-sm font-medium text-slate-500">
              dari {total}
            </span>
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Belum Selesai
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            {Math.max(0, total - completed)}
            <span className="ml-1 text-sm font-medium text-slate-500">
              dari {total}
            </span>
          </p>
        </div>
      </div>

      <div
        className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Persentase proyek selesai"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={completionPercent}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-green transition-all"
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      {regions !== undefined && (
        <div className="mt-7 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-bold text-slate-900">
            Proyek Selesai per Wilayah
          </h3>
          {regions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Belum ada data wilayah.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {regions.map((item) => {
                const percent =
                  item.total === 0
                    ? 0
                    : Math.round((item.completed / item.total) * 100);

                return (
                  <div key={item.region}>
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-800">
                        {item.region}
                      </span>
                      <span className="text-xs text-slate-500">
                        <strong className="text-slate-700">
                          {item.completed}
                        </strong>{" "}
                        selesai dari {item.total} proyek · {percent}%
                      </span>
                    </div>
                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-label={`Penyelesaian proyek wilayah ${item.region}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                    >
                      <div
                        className="h-full rounded-full bg-brand-green transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
