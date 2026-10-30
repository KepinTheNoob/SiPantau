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
              <th scope="col" className="px-4 py-3">
                Wilayah
              </th>
              <th scope="col" className="px-4 py-3">
                Status Verifikasi
              </th>
              <th scope="col" className="px-4 py-3 text-right">
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
                <td className="px-4 py-3 text-slate-600">{agency.region}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                      agency.verified
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {agency.verified ? "Terverifikasi" : "Belum Diverifikasi"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggle(agency.id, agency.verified)}
                    className={`rounded px-3 py-1 font-medium transition ${
                      agency.verified
                        ? "border border-red-300 bg-white text-red-700 hover:bg-red-50"
                        : "bg-emerald-700 text-white hover:bg-emerald-600"
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
