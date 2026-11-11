"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CitizenReportCard } from "@/components/citizen-report-card";
import { PaginatedList } from "@/components/paginated-list";
import { replyToCitizenReport } from "@/server/controllers/citizen-reports";
import {
  CITIZEN_REPORTS_PER_PAGE,
  REPLY_MAX_LENGTH,
  REPLY_MIN_LENGTH,
  hasAgencyReply,
  type CitizenReportView,
} from "@/lib/citizen-reports";

function ReplyForm({
  projectId,
  reportId,
  isFollowUp,
  onDone,
}: {
  readonly projectId: string;
  readonly reportId: string;
  readonly isFollowUp: boolean;
  readonly onDone: () => void;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [body, setBody] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmedLength = body.trim().length;
  const isTooShort = trimmedLength < REPLY_MIN_LENGTH;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("reportId", reportId);
    formData.append("body", body);

    startTransition(async () => {
      const result = await replyToCitizenReport(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? "Gagal menyimpan tanggapan.");

        return;
      }

      setBody("");
      onDone();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      <label
        htmlFor={fieldId}
        className="block text-sm font-semibold text-slate-800"
      >
        {isFollowUp ? "Tulis tindak lanjut" : "Tulis tanggapan instansi"}
      </label>
      <p className="mt-0.5 text-xs text-slate-600">
        Sebutkan apa yang sudah atau akan dilakukan, dan kapan. Tanggapan
        langsung tampil di halaman publik dan tidak bisa diubah.
      </p>
      <textarea
        id={fieldId}
        name="body"
        rows={4}
        required
        minLength={REPLY_MIN_LENGTH}
        maxLength={REPLY_MAX_LENGTH}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Contoh: Terima kasih atas laporannya. Tumpukan material sudah kami pindahkan ke area proyek pada 12 November. Mulai 15 November bongkar muat dilakukan di luar jam 06.00–09.00."
        className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base shadow-xs focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue sm:text-sm"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p
          className={`text-xs ${isTooShort ? "text-slate-500" : "text-emerald-700"}`}
        >
          {isTooShort
            ? `Minimal ${REPLY_MIN_LENGTH} karakter (${trimmedLength}/${REPLY_MIN_LENGTH})`
            : `${trimmedLength}/${REPLY_MAX_LENGTH} karakter`}
        </p>
        <button
          type="submit"
          disabled={isPending || isTooShort}
          className="min-h-11 cursor-pointer rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Menyimpan..." : "Kirim tanggapan"}
        </button>
      </div>
      {errorMessage !== null && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {errorMessage}
        </p>
      )}
    </form>
  );
}

function ReportWithReply({
  projectId,
  agencyName,
  report,
  canReply,
}: {
  readonly projectId: string;
  readonly agencyName: string;
  readonly report: CitizenReportView;
  readonly canReply: boolean;
}) {
  const answered = hasAgencyReply(report);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const footer = !canReply ? null : !answered ? (
    <ReplyForm
      projectId={projectId}
      reportId={report.id}
      isFollowUp={false}
      onDone={() => undefined}
    />
  ) : showFollowUp ? (
    <ReplyForm
      projectId={projectId}
      reportId={report.id}
      isFollowUp
      onDone={() => setShowFollowUp(false)}
    />
  ) : (
    <button
      type="button"
      onClick={() => setShowFollowUp(true)}
      className="mt-3 min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-blue"
    >
      + Tulis tindak lanjut
    </button>
  );

  return (
    <CitizenReportCard
      report={report}
      agencyName={agencyName}
      reporterLabel="Warga"
      footer={footer}
    />
  );
}

/** Laporan warga di halaman kelola proyek: yang belum ditanggapi tampil paling atas. */
export function CitizenReportManager({
  projectId,
  agencyName,
  reports,
  canReply,
}: {
  readonly projectId: string;
  readonly agencyName: string;
  readonly reports: readonly CitizenReportView[];
  readonly canReply: boolean;
}) {
  const unanswered = reports.filter((report) => !hasAgencyReply(report));
  const answered = reports.filter(hasAgencyReply);

  const groups = [
    {
      key: "unanswered",
      title: "Belum ditanggapi",
      reports: unanswered,
      emptyText: "Semua laporan warga sudah ditanggapi.",
    },
    {
      key: "answered",
      title: "Sudah ditanggapi",
      reports: answered,
      emptyText: "Belum ada laporan yang ditanggapi.",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Laporan Warga</h2>
        <p className="text-sm text-slate-600">
          Laporan warga langsung tampil di halaman publik. Tanggapi dengan
          tulisan supaya warga tahu apa yang dilakukan instansi.
        </p>
        {!canReply && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Instansi Anda belum terverifikasi, jadi belum bisa menanggapi
            laporan.
          </p>
        )}
      </div>

      {reports.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Belum ada laporan warga untuk proyek ini.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.key} aria-labelledby={`reports-${group.key}`}>
            <h3
              id={`reports-${group.key}`}
              className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"
            >
              {group.title}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {group.reports.length}
              </span>
            </h3>
            {group.reports.length === 0 ? (
              <p className="text-sm text-slate-500">{group.emptyText}</p>
            ) : (
              <PaginatedList
                label={`Laporan ${group.title.toLowerCase()}`}
                pageSize={CITIZEN_REPORTS_PER_PAGE}
                listClassName="space-y-4"
                items={group.reports.map((report) => (
                  <ReportWithReply
                    key={report.id}
                    projectId={projectId}
                    agencyName={agencyName}
                    report={report}
                    canReply={canReply}
                  />
                ))}
              />
            )}
          </section>
        ))
      )}
    </div>
  );
}
