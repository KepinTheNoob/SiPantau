"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DialogModal } from "@/components/dialog-modal";
import {
  DelayExplanation,
  type DelayReportView,
} from "@/components/delay-explanation";
import {
  DelayReportForm,
  type DelayReasonOption,
} from "@/components/delay-report-form";

/** Laporan keterlambatan di halaman kelola proyek: status, tombol buat laporan, riwayat. */
export function DelayReportManager({
  projectId,
  agencyName,
  originalTargetDate,
  effectiveTargetDate,
  isLate,
  needsNewReport,
  categories,
  reports,
}: {
  readonly projectId: string;
  readonly agencyName: string;
  readonly originalTargetDate: string;
  readonly effectiveTargetDate: string;
  readonly isLate: boolean;
  readonly needsNewReport: boolean;
  readonly categories: readonly DelayReasonOption[];
  readonly reports: readonly DelayReportView[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isLate && reports.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Laporan Keterlambatan
          </h2>
          <p className="text-sm text-slate-600">
            Penjelasan ini tampil di halaman publik proyek. Laporan tidak bisa
            diubah; buat laporan baru bila target berubah lagi.
          </p>
        </div>
        {isLate && (
          <button
            type="button"
            onClick={() => {
              setSuccessMessage(null);
              setShowForm(true);
            }}
            className="min-h-11 cursor-pointer rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover active:bg-brand-blue-hover/90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
          >
            {reports.length === 0
              ? "Isi laporan keterlambatan"
              : "Buat laporan baru"}
          </button>
        )}
      </div>

      {successMessage !== null && (
        <p
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {successMessage}
        </p>
      )}

      <DelayExplanation
        agencyName={agencyName}
        originalTargetDate={originalTargetDate}
        isLate={isLate}
        needsNewReport={needsNewReport}
        reports={reports}
      />

      <DialogModal
        open={showForm}
        title="Laporan keterlambatan proyek"
        onClose={() => setShowForm(false)}
      >
        <DelayReportForm
          projectId={projectId}
          effectiveTargetDate={effectiveTargetDate}
          categories={categories}
          onSubmitted={() => {
            setShowForm(false);
            setSuccessMessage(
              "Laporan keterlambatan tersimpan dan sudah tampil di halaman publik."
            );
            router.refresh();
          }}
          onCancel={() => setShowForm(false)}
          cancelLabel="Batal"
        />
      </DialogModal>
    </div>
  );
}
