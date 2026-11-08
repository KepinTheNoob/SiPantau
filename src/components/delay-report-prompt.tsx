"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DialogModal } from "@/components/dialog-modal";
import {
  DelayReportForm,
  type DelayReasonOption,
} from "@/components/delay-report-form";
import { formatIsoDate } from "@/lib/dates";

export type PendingDelayProject = {
  readonly projectId: string;
  readonly title: string;
  readonly originalTargetDate: string;
  readonly effectiveTargetDate: string;
  readonly hasPreviousReport: boolean;
};

const DISMISS_KEY = "sipantau:delay-prompt-dismissed";

function dismissSignature(projects: readonly PendingDelayProject[]): string {
  return projects
    .map((project) => `${project.projectId}:${project.effectiveTargetDate}`)
    .sort()
    .join("|");
}

function readDismissed(): string | null {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

function writeDismissed(signature: string) {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, signature);
  } catch {
    // Penyimpanan sesi tidak tersedia: popup akan muncul lagi di halaman berikutnya.
  }
}

/**
 * Popup di panel admin instansi: proyek yang melewati target dan belum dijelaskan.
 * "Nanti saja" menyembunyikan popup selama sesi browser untuk daftar proyek yang sama.
 */
export function DelayReportPrompt({
  projects,
  categories,
}: {
  readonly projects: readonly PendingDelayProject[];
  readonly categories: readonly DelayReasonOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<readonly string[]>([]);

  const remaining = projects.filter(
    (project) => !submittedIds.includes(project.projectId)
  );

  const activeProject =
    remaining.find((project) => project.projectId === activeProjectId) ?? null;

  useEffect(() => {
    if (projects.length > 0 && readDismissed() !== dismissSignature(projects)) {
      setOpen(true);
    }
  }, [projects]);

  function dismiss() {
    writeDismissed(dismissSignature(projects));
    setOpen(false);
  }

  function handleSubmitted(projectId: string) {
    setSubmittedIds((current) => [...current, projectId]);
    setActiveProjectId(null);
    router.refresh();

    if (remaining.length <= 1) {
      setOpen(false);
    }
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <DialogModal
      open={open}
      title={
        activeProject === null
          ? "Proyek melewati target selesai"
          : `Laporan keterlambatan: ${activeProject.title}`
      }
      onClose={dismiss}
    >
      {activeProject === null ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-700">
            Warga melihat status &quot;Terlambat&quot; pada proyek berikut tanpa
            penjelasan. Isi alasan, rencana percepatan, dan target selesai
            terbaru agar tampil di halaman publik proyek.
          </p>

          <ul className="flex flex-col gap-2">
            {remaining.map((project) => (
              <li
                key={project.projectId}
                className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {project.title}
                  </p>
                  <p className="text-xs text-amber-900">
                    {project.hasPreviousReport
                      ? `Target revisi ${formatIsoDate(project.effectiveTargetDate)} juga sudah lewat`
                      : `Target ${formatIsoDate(project.originalTargetDate)} sudah lewat`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveProjectId(project.projectId)}
                  className="min-h-11 shrink-0 cursor-pointer rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white transition hover:bg-brand-blue-hover active:bg-brand-blue-hover/90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
                >
                  Isi laporan
                </button>
              </li>
            ))}
          </ul>

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={dismiss}
              className="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              Nanti saja
            </button>
          </div>
        </div>
      ) : (
        <DelayReportForm
          key={activeProject.projectId}
          projectId={activeProject.projectId}
          effectiveTargetDate={activeProject.effectiveTargetDate}
          categories={categories}
          onSubmitted={() => handleSubmitted(activeProject.projectId)}
          onCancel={() => setActiveProjectId(null)}
          cancelLabel="Kembali ke daftar"
        />
      )}
    </DialogModal>
  );
}
