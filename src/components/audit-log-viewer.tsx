"use client";

import { useState } from "react";
import Link from "next/link";
import type { Database } from "@/db/types";

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

function getPageHref(
  page: number,
  agencyId: string | undefined,
  action: string | undefined,
  basePath: string
) {
  const params = new URLSearchParams();

  if (agencyId) {
    params.set("agencyId", agencyId);
  }

  if (action) {
    params.set("action", action);
  }

  params.set("page", String(page));

  return `${basePath}?${params.toString()}`;
}

export function AuditLogViewer({
  logs,
  currentPage,
  totalPages,
  agencyId,
  action,
  basePath = "/super-admin",
}: {
  readonly logs: readonly AuditLogRow[];
  readonly currentPage?: number;
  readonly totalPages?: number;
  readonly agencyId?: string;
  readonly action?: string;
  readonly basePath?: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 bg-white">
        Tidak ada catatan audit log yang cocok dengan filter.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 font-semibold text-slate-700">
            <tr>
              <th scope="col" className="px-4 py-3">
                Waktu
              </th>
              <th scope="col" className="px-4 py-3">
                Aksi
              </th>
              <th scope="col" className="px-4 py-3">
                Entitas
              </th>
              <th scope="col" className="px-4 py-3">
                ID Entitas
              </th>
              <th scope="col" className="px-4 py-3">
                ID Aktor
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Detail Snapshot
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id;

              const actionColor =
                log.action === "INSERT"
                  ? "bg-emerald-100 text-emerald-800"
                  : log.action === "UPDATE"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-red-100 text-red-800";

              return (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 font-bold uppercase ${actionColor}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 capitalize">
                    {log.entity}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500">
                    {log.entity_id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500">
                    {log.actor_id ? `${log.actor_id.slice(0, 8)}...` : "System"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((prev) =>
                          prev === log.id ? null : log.id
                        )
                      }
                      className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-100 font-medium"
                    >
                      {isExpanded ? "Tutup" : "Lihat Snapshot"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {currentPage !== undefined &&
        totalPages !== undefined &&
        totalPages > 1 && (
          <nav
            aria-label="Pagination audit log"
            className="flex items-center justify-between border-t border-slate-200 px-4 py-3"
          >
            <span className="text-xs text-slate-600">
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex gap-2">
              {currentPage > 1 ? (
                <Link
                  href={getPageHref(
                    currentPage - 1,
                    agencyId,
                    action,
                    basePath
                  )}
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Sebelumnya
                </Link>
              ) : (
                <span className="rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-400">
                  Sebelumnya
                </span>
              )}
              {currentPage < totalPages ? (
                <Link
                  href={getPageHref(
                    currentPage + 1,
                    agencyId,
                    action,
                    basePath
                  )}
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Berikutnya
                </Link>
              ) : (
                <span className="rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-400">
                  Berikutnya
                </span>
              )}
            </div>
          </nav>
        )}

      {expandedId !== null && (
        <div className="border-t border-slate-200 bg-slate-900 p-4 text-xs text-slate-100 font-mono">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-amber-400 font-bold block mb-1">
                // Snapshot SEBELUM Perubahan (BEFORE):
              </span>
              <pre className="overflow-x-auto bg-slate-950 p-3 rounded text-slate-300">
                {JSON.stringify(
                  logs.find((l) => l.id === expandedId)?.before,
                  null,
                  2
                ) ?? "null (Entitas baru / INSERT)"}
              </pre>
            </div>
            <div>
              <span className="text-emerald-400 font-bold block mb-1">
                // Snapshot SETELAH Perubahan (AFTER):
              </span>
              <pre className="overflow-x-auto bg-slate-950 p-3 rounded text-slate-300">
                {JSON.stringify(
                  logs.find((l) => l.id === expandedId)?.after,
                  null,
                  2
                ) ?? "null (Entitas dihapus / DELETE)"}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
