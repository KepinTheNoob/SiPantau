"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { archiveProject } from "@/server/controllers/projects";

/** Tombol "Kelola" dan "Arsipkan" di baris tabel daftar proyek panel admin/super admin. */
export function ProjectRowActions({
  projectId,
  projectTitle,
  manageHref,
  isArchived,
}: {
  readonly projectId: string;
  readonly projectTitle: string;
  readonly manageHref: string;
  readonly isArchived: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleArchive() {
    if (
      !window.confirm(
        `Arsipkan "${projectTitle}"? Proyek yang diarsipkan tidak tampil lagi di halaman publik.`
      )
    ) {
      return;
    }

    setErrorMessage(null);

    const formData = new FormData();
    formData.append("projectId", projectId);

    startTransition(async () => {
      const result = await archiveProject(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? "Gagal mengarsipkan proyek.");

        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        <Link
          href={manageHref}
          aria-label={`Kelola ${projectTitle}`}
          className="inline-flex min-h-9 items-center rounded-lg bg-brand-blue px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
        >
          Kelola
        </Link>
        <button
          type="button"
          onClick={handleArchive}
          disabled={isPending || isArchived}
          aria-label={`Arsipkan ${projectTitle}`}
          className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:hover:text-slate-500"
        >
          {isArchived
            ? "Diarsipkan"
            : isPending
              ? "Mengarsipkan..."
              : "Arsipkan"}
        </button>
      </div>
      {errorMessage !== null && (
        <p role="alert" className="text-xs text-red-700">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
