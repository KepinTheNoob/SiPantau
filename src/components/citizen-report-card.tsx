import type { ReactNode } from "react";
import Link from "next/link";
import { formatTimestampDate } from "@/lib/dates";
import { evidencePublicUrl } from "@/lib/storage-url";
import { hasAgencyReply, type CitizenReportView } from "@/lib/citizen-reports";

/** Penanda status tanggapan: "Menunggu tanggapan" atau "Sudah ditanggapi". */
export function ReplyStatusBadge({ answered }: { readonly answered: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        answered
          ? "bg-brand-green-light text-emerald-800"
          : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          answered ? "bg-brand-green" : "bg-amber-500"
        }`}
      />
      {answered ? "Sudah ditanggapi" : "Menunggu tanggapan"}
    </span>
  );
}

/**
 * Satu laporan warga beserta tanggapan tertulis instansi.
 * `context` tampil di atas isi laporan (misalnya nama proyek di halaman PantauLaporan);
 * `footer` tampil paling bawah (misalnya form tanggapan di panel admin).
 * Bila `link` diisi, seluruh kartu bisa diklik menuju `link.href`.
 */
export function CitizenReportCard({
  report,
  agencyName,
  reporterLabel,
  context,
  footer,
  link,
}: {
  readonly report: CitizenReportView;
  readonly agencyName: string;
  readonly reporterLabel: string;
  readonly context?: ReactNode;
  readonly footer?: ReactNode;
  readonly link?: { readonly href: string; readonly label: string };
}) {
  const answered = hasAgencyReply(report);

  return (
    <article
      className={`relative rounded-xl border border-slate-200 bg-white p-5 shadow-xs ${
        link === undefined
          ? ""
          : "transition hover:border-brand-blue/40 hover:shadow-md focus-within:ring-2 focus-within:ring-brand-blue"
      }`}
    >
      {link !== undefined && (
        // Tautan menutupi seluruh kartu; tautan lain di dalam kartu diberi z-10 agar tetap bisa diklik.
        <Link
          href={link.href}
          aria-label={link.label}
          className="absolute inset-0 z-0 rounded-xl focus:outline-none"
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{reporterLabel}</span>
          {" · "}
          <time dateTime={report.createdAt}>
            {formatTimestampDate(report.createdAt)}
          </time>
        </p>
        <ReplyStatusBadge answered={answered} />
      </div>

      {context}

      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-800">
        {report.content}
      </p>

      {report.photoPath !== null && (
        <a
          href={evidencePublicUrl(report.photoPath)}
          target="_blank"
          rel="noreferrer"
          className="relative z-10 mt-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
        >
          Lihat foto lapangan ↗
        </a>
      )}

      {answered && (
        <ol className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {report.replies.map((reply, index) => (
            <li
              key={reply.id}
              className="rounded-lg border-l-4 border-brand-blue bg-brand-blue-light px-4 py-3"
            >
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-brand-blue">
                  {index === 0
                    ? `Tanggapan ${agencyName}`
                    : `Tindak lanjut ${agencyName}`}
                </span>
                {" · "}
                <time dateTime={reply.createdAt}>
                  {formatTimestampDate(reply.createdAt)}
                </time>
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-800">
                {reply.body}
              </p>
            </li>
          ))}
        </ol>
      )}

      {footer}
    </article>
  );
}
