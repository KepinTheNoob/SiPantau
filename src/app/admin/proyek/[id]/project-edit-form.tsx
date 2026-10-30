"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/db/types";
import {
  updateProject,
  archiveProject,
  type FieldError,
} from "@/server/actions/projects";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export function ProjectEditForm({ project }: { readonly project: ProjectRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<readonly FieldError[]>([]);

  const isArchived = project.archived_at !== null;

  const getFieldError = (field: string): string | undefined => {
    return fieldErrors.find((err) => err.field === field)?.message;
  };

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGlobalError(null);
    setSuccessMessage(null);
    setFieldErrors([]);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateProject(formData);

      if (!result.success) {
        setGlobalError(result.message ?? "Gagal memperbarui proyek.");

        if (result.fieldErrors !== undefined) {
          setFieldErrors(result.fieldErrors);
        }
      } else {
        setSuccessMessage("Perubahan proyek berhasil disimpan.");
        router.refresh();
      }
    });
  };

  const handleArchive = () => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin mengarsipkan proyek ini? Proyek yang diarsipkan tidak akan tampil di halaman publik."
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.append("projectId", project.id);

    startTransition(async () => {
      const result = await archiveProject(formData);

      if (!result.success) {
        setGlobalError(result.message ?? "Gagal mengarsipkan proyek.");
      } else {
        router.push("/admin/proyek");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {globalError !== null && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {globalError}
        </div>
      )}

      {successMessage !== null && (
        <div
          role="status"
          className="rounded border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {successMessage}
        </div>
      )}

      {isArchived && (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Proyek ini telah <strong>diarsipkan</strong> pada tanggal{" "}
          {new Date(project.archived_at ?? "").toLocaleDateString("id-ID")} dan
          tidak tampil kepada publik.
        </div>
      )}

      <form onSubmit={handleUpdate} className="flex flex-col gap-6">
        <input type="hidden" name="projectId" value={project.id} />

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-slate-700"
            >
              Nama / Judul Proyek *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={project.title}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            {getFieldError("title") && (
              <p className="mt-1 text-xs text-red-600">
                {getFieldError("title")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-slate-700"
            >
              Slug URL Proyek *
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              defaultValue={project.slug}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            {getFieldError("slug") && (
              <p className="mt-1 text-xs text-red-600">
                {getFieldError("slug")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-slate-700"
            >
              Kategori Proyek *
            </label>
            <input
              id="category"
              name="category"
              type="text"
              required
              defaultValue={project.category}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            {getFieldError("category") && (
              <p className="mt-1 text-xs text-red-600">
                {getFieldError("category")}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-700"
            >
              Deskripsi Proyek *
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              required
              defaultValue={project.description}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            {getFieldError("description") && (
              <p className="mt-1 text-xs text-red-600">
                {getFieldError("description")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="location_name"
              className="block text-sm font-medium text-slate-700"
            >
              Nama Lokasi / Wilayah *
            </label>
            <input
              id="location_name"
              name="location_name"
              type="text"
              required
              defaultValue={project.location_name}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            {getFieldError("location_name") && (
              <p className="mt-1 text-xs text-red-600">
                {getFieldError("location_name")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="budget_total"
              className="block text-sm font-medium text-slate-700"
            >
              Total Anggaran Proyek (Rupiah) *
            </label>
            <input
              id="budget_total"
              name="budget_total"
              type="number"
              min={0}
              required
              defaultValue={project.budget_total}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            {getFieldError("budget_total") && (
              <p className="mt-1 text-xs text-red-600">
                {getFieldError("budget_total")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="start_date"
              className="block text-sm font-medium text-slate-700"
            >
              Tanggal Mulai *
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              required
              defaultValue={project.start_date}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            {getFieldError("start_date") && (
              <p className="mt-1 text-xs text-red-600">
                {getFieldError("start_date")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="target_end_date"
              className="block text-sm font-medium text-slate-700"
            >
              Target Tanggal Selesai *
            </label>
            <input
              id="target_end_date"
              name="target_end_date"
              type="date"
              required
              defaultValue={project.target_end_date}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            {getFieldError("target_end_date") && (
              <p className="mt-1 text-xs text-red-600">
                {getFieldError("target_end_date")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="lat"
              className="block text-sm font-medium text-slate-700"
            >
              Latitude (Opsional)
            </label>
            <input
              id="lat"
              name="lat"
              type="number"
              step="any"
              defaultValue={project.lat ?? ""}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
          </div>

          <div>
            <label
              htmlFor="lng"
              className="block text-sm font-medium text-slate-700"
            >
              Longitude (Opsional)
            </label>
            <input
              id="lng"
              name="lng"
              type="number"
              step="any"
              defaultValue={project.lng ?? ""}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-5">
          <div>
            {!isArchived && (
              <button
                type="button"
                onClick={handleArchive}
                disabled={isPending}
                className="rounded border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Arsipkan Proyek
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
