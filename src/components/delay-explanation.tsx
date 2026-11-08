import { formatIsoDate } from "@/lib/dates";

export type DelayReportView = {
  readonly id: string;
  readonly reasonDetail: string;
  readonly recoveryPlan: string;
  readonly revisedTargetDate: string;
  readonly createdAt: string;
  readonly reasons: readonly string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  return Math.round(
    (Date.parse(`${toIsoDate}T00:00:00Z`) -
      Date.parse(`${fromIsoDate}T00:00:00Z`)) /
      DAY_MS
  );
}

function ReportBody({ report }: { readonly report: DelayReportView }) {
  return (
    <div className="flex flex-col gap-3 text-sm text-slate-800">
      {report.reasons.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Jenis alasan">
          {report.reasons.map((reason) => (
            <li
              key={reason}
              className="rounded border border-amber-200 bg-white px-2 py-0.5 text-xs font-semibold text-amber-900"
            >
              {reason}
            </li>
          ))}
        </ul>
      )}
      <div>
        <h4 className="text-xs font-semibold text-slate-600">
          Alasan keterlambatan
        </h4>
        <p className="mt-1 whitespace-pre-line leading-relaxed">
          {report.reasonDetail}
        </p>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-slate-600">
          Rencana mengejar keterlambatan
        </h4>
        <p className="mt-1 whitespace-pre-line leading-relaxed">
          {report.recoveryPlan}
        </p>
      </div>
      <p className="text-xs text-slate-600">
        Dilaporkan {formatIsoDate(report.createdAt)} · target selesai menjadi{" "}
        {formatIsoDate(report.revisedTargetDate)}
      </p>
    </div>
  );
}

/**
 * Penjelasan keterlambatan untuk warga: target awal vs terbaru, alasan, rencana, riwayat.
 * Tidak dirender bila proyek tepat waktu dan tidak pernah punya laporan.
 */
export function DelayExplanation({
  agencyName,
  originalTargetDate,
  isLate,
  needsNewReport,
  reports,
}: {
  readonly agencyName: string;
  readonly originalTargetDate: string;
  /** Proyek belum selesai dan sudah melewati target awal. */
  readonly isLate: boolean;
  /** Target efektif (awal atau revisi terakhir) sudah lewat tanpa laporan baru. */
  readonly needsNewReport: boolean;
  readonly reports: readonly DelayReportView[];
}) {
  if (!isLate && reports.length === 0) {
    return null;
  }

  const [latest, ...older] = reports;

  return (
    <section
      aria-labelledby="delay-explanation-title"
      className="rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-xs sm:p-6"
    >
      <h2
        id="delay-explanation-title"
        className="text-base font-bold text-amber-950"
      >
        {isLate ? "Kenapa proyek ini terlambat?" : "Riwayat keterlambatan"}
      </h2>

      <dl className="mt-4 grid grid-cols-1 gap-3 rounded-lg bg-white p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-600">Target awal</dt>
          <dd className="font-semibold text-slate-900 line-through decoration-slate-400">
            {formatIsoDate(originalTargetDate)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">Target terbaru</dt>
          <dd className="font-semibold text-slate-900">
            {latest === undefined ? (
              "Belum ditetapkan"
            ) : (
              <>
                {formatIsoDate(latest.revisedTargetDate)}{" "}
                <span className="text-xs font-normal text-amber-900">
                  (mundur{" "}
                  {daysBetween(originalTargetDate, latest.revisedTargetDate)}{" "}
                  hari)
                </span>
              </>
            )}
          </dd>
        </div>
      </dl>

      {needsNewReport && (
        <p className="mt-4 rounded-lg border border-amber-400 bg-white p-3 text-sm font-semibold text-amber-950">
          {latest === undefined
            ? `${agencyName} belum memberikan penjelasan keterlambatan.`
            : `Target terbaru juga sudah lewat dan ${agencyName} belum memperbarui penjelasannya.`}
        </p>
      )}

      {latest !== undefined && (
        <div className="mt-4">
          <p className="mb-3 text-xs font-semibold text-amber-950">
            Penjelasan terbaru dari {agencyName}
          </p>
          <ReportBody report={latest} />
        </div>
      )}

      {older.length > 0 && (
        <details className="mt-5 border-t border-amber-200 pt-4">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-amber-950">
            Penjelasan sebelumnya ({older.length})
          </summary>
          <ol className="mt-3 flex flex-col gap-5">
            {older.map((report) => (
              <li
                key={report.id}
                className="rounded-lg border border-amber-200 bg-white/60 p-4"
              >
                <ReportBody report={report} />
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
