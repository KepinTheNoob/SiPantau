"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitCitizenReport } from "@/server/controllers/citizen-reports";
import { citizenSignOutAction } from "@/server/controllers/citizen-auth";
import { CitizenAuthDialog } from "@/components/citizen-auth-dialog";
import Link from "next/link";
import { CitizenReportCard } from "@/components/citizen-report-card";
import type { CitizenReportView } from "@/lib/citizen-reports";

export function CitizenReportSection({
  projectId,
  agencyName,
  reports,
  allowSubmission,
  signedInEmail,
}: {
  readonly projectId: string;
  readonly agencyName: string;
  readonly reports: readonly CitizenReportView[];
  readonly allowSubmission: boolean;
  /** Email akun yang sedang login, null bila belum login. */
  readonly signedInEmail: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();

  function handleReportButton() {
    if (signedInEmail === null && !showForm) {
      setShowAuthDialog(true);

      return;
    }

    setShowForm((prev) => !prev);
  }

  function handleSignedIn() {
    setShowAuthDialog(false);
    setShowForm(true);
    router.refresh();
  }

  function handleSignOut() {
    startSignOut(async () => {
      await citizenSignOutAction();
      setShowForm(false);
      router.refresh();
    });
  }

  const [resultMessage, setResultMessage] = useState<{
    readonly success: boolean;
    readonly message: string;
  } | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResultMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append("projectId", projectId);

    startTransition(async () => {
      const result = await submitCitizenReport(formData);

      setResultMessage({
        success: result.success,
        message: result.message ?? "Laporan berhasil dikirim.",
      });

      if (result.success) {
        form.reset();
        setShowForm(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Laporan & Pengawasan Warga
          </h2>
          <p className="text-xs text-slate-500">
            Laporan warga langsung tampil di sini dan ditanggapi secara tertulis
            oleh instansi.
          </p>
        </div>

        {allowSubmission && (
          <button
            type="button"
            onClick={handleReportButton}
            className="min-h-11 cursor-pointer rounded-lg bg-brand-blue px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover active:bg-brand-blue-hover/90 focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            {showForm ? "Tutup Form Laporan" : "📣 Buat Laporan Warga"}
          </button>
        )}
      </div>

      <CitizenAuthDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onSignedIn={handleSignedIn}
      />

      {allowSubmission && signedInEmail !== null && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
          <span>
            Masuk sebagai{" "}
            <span className="font-semibold text-slate-800">
              {signedInEmail}
            </span>
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="cursor-pointer rounded font-semibold text-brand-blue hover:underline focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "Keluar..." : "Keluar"}
          </button>
          <span aria-hidden="true">·</span>
          <Link
            href="/laporan-saya"
            className="rounded font-semibold text-brand-blue hover:underline focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            PantauLaporan
          </Link>
        </p>
      )}

      {resultMessage !== null && (
        <div
          role="alert"
          className={`rounded-lg border p-4 text-xs ${
            resultMessage.success
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          {resultMessage.message}
          {resultMessage.success && (
            <>
              {" "}
              <Link
                href="/laporan-saya"
                className="font-semibold underline hover:no-underline"
              >
                Buka PantauLaporan
              </Link>
            </>
          )}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col gap-4 shadow-xs"
        >
          <h3 className="text-sm font-bold text-slate-900">
            Kirim Laporan / Pengaduan Lapangan
          </h3>
          <p className="text-xs text-slate-600">
            Tuliskan laporan pengamatan Anda terkait perkembangan fisik atau
            kendala proyek di lapangan.
          </p>

          <div>
            <label
              htmlFor="report-content"
              className="block text-xs font-semibold text-slate-700"
            >
              Isi Laporan / Tanggapan *
            </label>
            <textarea
              id="report-content"
              name="content"
              rows={4}
              required
              minLength={10}
              maxLength={2000}
              placeholder="Contoh: Pekerjaan pengecoran jembatan sempat terhenti selama 2 minggu karena kendala material..."
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
          </div>

          <div>
            <label
              htmlFor="report-photo"
              className="block text-xs font-semibold text-slate-700"
            >
              Foto Bukti Lapangan (Opsional)
            </label>
            <input
              id="report-photo"
              name="photo"
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-xs text-slate-600"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Maksimal 5 MB (format JPG, PNG, atau WebP).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand-blue px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover disabled:opacity-50"
            >
              {isPending ? "Mengirim Laporan..." : "Kirimkan Laporan"}
            </button>
          </div>
        </form>
      )}

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
          Belum ada laporan warga untuk proyek ini.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <CitizenReportCard
              key={report.id}
              report={report}
              agencyName={agencyName}
              reporterLabel="Warga"
            />
          ))}
        </div>
      )}
    </div>
  );
}
