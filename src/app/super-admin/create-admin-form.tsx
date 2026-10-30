"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/db/types";
import { createAgencyAdminAccount } from "@/server/actions/super-admin";

type AgencyRow = Database["public"]["Tables"]["agencies"]["Row"];

export function CreateAdminForm({
  agencies,
}: {
  readonly agencies: readonly AgencyRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [resultMessage, setResultMessage] = useState<{
    readonly success: boolean;
    readonly message: string;
  } | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResultMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createAgencyAdminAccount(formData);

      setResultMessage({
        success: result.success,
        message: result.message ?? "Proses selesai.",
      });

      if (result.success) {
        event.currentTarget.reset();
        router.refresh();
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
    >
      <h3 className="text-sm font-bold text-slate-900">
        Buat Akun Administrator Instansi Baru
      </h3>

      {resultMessage !== null && (
        <div
          role="alert"
          className={`rounded border p-3 text-xs ${
            resultMessage.success
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {resultMessage.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="agency-select"
            className="block text-xs font-medium text-slate-700"
          >
            Pilih Instansi *
          </label>
          <select
            id="agency-select"
            name="agencyId"
            required
            className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
          >
            <option value="">-- Pilih Instansi --</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name} ({agency.region})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="admin-email"
            className="block text-xs font-medium text-slate-700"
          >
            Alamat Email Admin *
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            placeholder="admin@instansi.go.id"
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
          />
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="block text-xs font-medium text-slate-700"
          >
            Kata Sandi Awal *
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Minimal 8 karakter"
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Mendaftarkan..." : "+ Buat Akun Admin"}
        </button>
      </div>
    </form>
  );
}
