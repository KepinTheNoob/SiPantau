"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/db/types";
import { createAgencyAdminAccount } from "@/server/controllers/super-admin";

type AgencyRow = Database["public"]["Tables"]["agencies"]["Row"];

export function CreateAdminForm({
  agencies,
}: {
  readonly agencies: readonly AgencyRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const [resultMessage, setResultMessage] = useState<{
    readonly success: boolean;
    readonly message: string;
  } | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResultMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createAgencyAdminAccount(formData);

      setResultMessage({
        success: result.success,
        message: result.message ?? "Proses selesai.",
      });

      if (result.success) {
        form.reset();
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResultMessage(null);
          setIsOpen(true);
        }}
        className="rounded-lg bg-brand-blue px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover"
      >
        + Buat akun admin
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-admin-title"
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h3
                id="create-admin-title"
                className="text-base font-bold text-slate-900"
              >
                Buat Akun Admin Instansi
              </h3>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setIsOpen(false)}
                className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                    Instansi *
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
                    Alamat Email *
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-brand-blue px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover disabled:opacity-50"
                >
                  {isPending ? "Mendaftarkan..." : "Buat Akun Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
