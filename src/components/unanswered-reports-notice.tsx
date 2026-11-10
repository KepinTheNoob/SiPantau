import Link from "next/link";
import { formatTimestampDate } from "@/lib/dates";

export type UnansweredReportItem = {
  readonly reportId: string;
  readonly projectId: string;
  readonly projectTitle: string;
  readonly content: string;
  readonly createdAt: string;
};

const MAX_LISTED = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

function waitingLabel(createdAt: string, now: number): string {
  const days = Math.floor((now - Date.parse(createdAt)) / DAY_MS);

  return days < 1 ? "Masuk hari ini" : `Menunggu ${days} hari`;
}

function BellIcon({ className }: { readonly className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path
        d="M5 8.5a5 5 0 0 1 10 0c0 3.5 1.5 5 1.5 5h-13S5 12 5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.25 16a1.9 1.9 0 0 0 3.5 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Notifikasi dasbor admin: laporan warga yang belum ditanggapi (yang menunggu paling lama di atas). */
export function UnansweredReportsNotice({
  reports,
  now,
}: {
  readonly reports: readonly UnansweredReportItem[];
  /** Waktu acuan (ms) untuk menghitung lama menunggu. */
  readonly now: number;
}) {
  if (reports.length === 0) {
    return (
      <section
        aria-label="Laporan warga"
        className="flex items-center gap-3 rounded-xl border border-brand-green/25 bg-brand-green-light px-5 py-4"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700">
          <BellIcon className="h-5 w-5" />
        </span>
        <p className="text-sm text-emerald-900">
          Semua laporan warga sudah ditanggapi.
        </p>
      </section>
    );
  }

  const listed = reports.slice(0, MAX_LISTED);
  const remaining = reports.length - listed.length;

  return (
    <section
      aria-labelledby="unanswered-reports-title"
      className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-xs"
    >
      <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-5 py-4">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-amber-700 ring-1 ring-amber-200">
          <BellIcon className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {reports.length}
          </span>
        </span>
        <div>
          <h2
            id="unanswered-reports-title"
            className="text-sm font-bold text-slate-900"
          >
            {reports.length} laporan warga belum ditanggapi
          </h2>
          <p className="text-xs text-slate-600">
            Laporan sudah tampil di halaman publik. Warga menunggu tanggapan
            tertulis dari instansi Anda.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-slate-100">
        {listed.map((report) => (
          <li key={report.reportId}>
            <Link
              href={`/admin/proyek/${report.projectId}#laporan-warga`}
              className="flex flex-col gap-1 px-5 py-3.5 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-brand-blue">
                  {report.projectTitle}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-slate-800">
                  {report.content}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  <time dateTime={report.createdAt}>
                    {formatTimestampDate(report.createdAt)}
                  </time>
                  {" · "}
                  <span className="font-semibold text-amber-700">
                    {waitingLabel(report.createdAt, now)}
                  </span>
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-brand-blue">
                Tanggapi →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-600">
          Dan {remaining} laporan lain. Buka proyek terkait untuk melihat
          semuanya.
        </p>
      )}
    </section>
  );
}
