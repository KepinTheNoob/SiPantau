"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/db/types";
import { toggleAgencyVerification } from "@/server/actions/super-admin";

type AgencyRow = Database["public"]["Tables"]["agencies"]["Row"];

export function AgencyManager({
  agencies,
}: {
  readonly agencies: readonly AgencyRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleToggle = (agencyId: string, currentVerified: boolean) => {
    setMessage(null);
    const formData = new FormData();
    formData.append("agencyId", agencyId);
    formData.append("verified", currentVerified ? "false" : "true");

    startTransition(async () => {
      const result = await toggleAgencyVerification(formData);
      setMessage(result.message ?? "Status berhasil diperbarui.");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {message !== null && (
        <div
          role="status"
          className="rounded border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800"
        >
          {message}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 font-semibold text-slate-700">
            <tr>
              <th scope="col" className="px-4 py-3">
                Nama Instansi
              </th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">
                Wilayah
              </th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">
                Status Verifikasi
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right whitespace-nowrap"
              >
                Tindakan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agencies.map((agency) => (
              <tr key={agency.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {agency.name}
                  <span className="block text-slate-400 font-mono text-[11px]">
                    {agency.slug}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {agency.region}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      agency.verified
                        ? "bg-brand-green-light text-brand-green border border-brand-green/20"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {agency.verified ? "✓ Terverifikasi" : "Belum Diverifikasi"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggle(agency.id, agency.verified)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      agency.verified
                        ? "border border-red-300 bg-white text-red-700 hover:bg-red-50"
                        : "bg-brand-green text-white hover:bg-brand-green-hover shadow-xs"
                    }`}
                  >
                    {agency.verified
                      ? "Cabut Verifikasi"
                      : "Setujui Verifikasi"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
