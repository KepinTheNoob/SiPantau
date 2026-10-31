"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProject, type FieldError } from "@/server/actions/projects";
import { ProjectCategorySelect } from "@/components/project-category-select";

export function ProjectCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<readonly FieldError[]>([]);

  const getFieldError = (field: string): string | undefined => {
    return fieldErrors.find((err) => err.field === field)?.message;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGlobalError(null);
    setFieldErrors([]);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createProject(formData);

      if (!result.success) {
        setGlobalError(result.message ?? "Gagal menyimpan proyek.");

        if (result.fieldErrors !== undefined) {
          setFieldErrors(result.fieldErrors);
        }
      } else if (result.projectId !== undefined) {
        router.push(`/admin/proyek/${result.projectId}`);
      } else {
        router.push("/admin/proyek");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {globalError !== null && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {globalError}
        </div>
      )}

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
            placeholder="Contoh: Pembangunan Jembatan Penyeberangan Orang"
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
            placeholder="pembangunan-jembatan-penyeberangan"
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
          />
          <p className="mt-1 text-xs text-slate-500">
            Hanya huruf kecil, angka, dan tanda hubung (-).
          </p>
          {getFieldError("slug") && (
            <p className="mt-1 text-xs text-red-600">{getFieldError("slug")}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-slate-700"
          >
            Kategori Proyek *
          </label>
          <ProjectCategorySelect className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white" />
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
            placeholder="Jelaskan tujuan, ruang lingkup pekerjaan, dan manfaat proyek bagi masyarakat..."
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
            placeholder="Contoh: Jl. Sudirman KM 5, Jakarta Selatan"
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
            step={1}
            required
            placeholder="1500000000"
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
            Koordinat Latitude (Opsional)
          </label>
          <input
            id="lat"
            name="lat"
            type="number"
            step="any"
            placeholder="-6.2088"
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
          />
        </div>

        <div>
          <label
            htmlFor="lng"
            className="block text-sm font-medium text-slate-700"
          >
            Koordinat Longitude (Opsional)
          </label>
          <input
            id="lng"
            name="lng"
            type="number"
            step="any"
            placeholder="106.8456"
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Menyimpan..." : "Simpan & Lanjutkan"}
        </button>
      </div>
    </form>
  );
}
