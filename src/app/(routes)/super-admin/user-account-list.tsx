"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/db/types";
import type { UserAccountItem } from "@/server/admin-only/accounts";
import {
  deleteAgencyAdmin,
  updateAgencyAdmin,
} from "@/server/controllers/super-admin";

type RoleFilter = "all" | "admin" | "super_admin";

type AgencyRow = Database["public"]["Tables"]["agencies"]["Row"];

export function UserAccountList({
  accounts,
  agencies,
}: {
  readonly accounts: readonly UserAccountItem[];
  readonly agencies: readonly AgencyRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState("");
  const [editingAgencyId, setEditingAgencyId] = useState("");

  const [message, setMessage] = useState<{
    readonly success: boolean;
    readonly text: string;
  } | null>(null);

  const handleUpdate = (adminId: string) => {
    const formData = new FormData();
    formData.set("adminId", adminId);
    formData.set("email", editingEmail);
    formData.set("agencyId", editingAgencyId);
    setMessage(null);

    startTransition(async () => {
      const result = await updateAgencyAdmin(formData);
      setMessage({
        success: result.success,
        text: result.message ?? "Proses selesai.",
      });

      if (result.success) {
        setEditingAdminId(null);
        setEditingEmail("");
        setEditingAgencyId("");
        router.refresh();
      }
    });
  };

  const handleDelete = (adminId: string, email: string) => {
    if (
      !window.confirm(
        `Hapus akun admin ${email}? Akun ini tidak dapat digunakan untuk login lagi.`
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.set("adminId", adminId);
    setMessage(null);

    startTransition(async () => {
      const result = await deleteAgencyAdmin(formData);
      setMessage({
        success: result.success,
        text: result.message ?? "Proses selesai.",
      });

      if (result.success) {
        setEditingAdminId(null);
        router.refresh();
      }
    });
  };

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const results: UserAccountItem[] = [];

    for (const acc of accounts) {
      if (roleFilter !== "all" && acc.role !== roleFilter) {
        continue;
      }

      if (query !== "") {
        const emailLower = acc.email.toLowerCase();
        const agencyLower = (acc.agencyName ?? "").toLowerCase();
        const regionLower = (acc.agencyRegion ?? "").toLowerCase();
        const idLower = acc.id.toLowerCase();

        const matches =
          emailLower.includes(query) ||
          agencyLower.includes(query) ||
          regionLower.includes(query) ||
          idLower.includes(query);

        if (!matches) {
          continue;
        }
      }

      results.push(acc);
    }

    return results;
  }, [accounts, searchQuery, roleFilter]);

  let adminCount = 0;
  let superAdminCount = 0;

  for (const acc of accounts) {
    if (acc.role === "admin") {
      adminCount += 1;
    } else if (acc.role === "super_admin") {
      superAdminCount += 1;
    }
  }

  const formatDateTime = (isoDate: string) => {
    try {
      const date = new Date(isoDate);

      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      {message !== null && (
        <div
          role={message.success ? "status" : "alert"}
          className={`rounded border p-3 text-xs ${
            message.success
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Daftar Akun Admin
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
              Total: {accounts.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Daftar seluruh akun pengguna yang memiliki akses administratif ke
            sistem SIPANTAU
          </p>
        </div>

        {/* Filter per Peran */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              roleFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua ({accounts.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("admin")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              roleFilter === "admin"
                ? "bg-brand-blue text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Admin Instansi ({adminCount})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("super_admin")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              roleFilter === "super_admin"
                ? "bg-purple-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Super Admin ({superAdminCount})
          </button>
        </div>
      </div>

      {/* Input Pencarian */}
      <div className="relative">
        <label htmlFor="user-account-search" className="sr-only">
          Cari email atau instansi
        </label>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          id="user-account-search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Cari berdasarkan email, nama instansi, wilayah, atau ID..."
          className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-xs text-slate-900 placeholder-slate-400 focus:border-brand-blue focus:outline-hidden focus:ring-1 focus:ring-brand-blue"
        />
        {searchQuery !== "" && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 text-xs font-semibold"
            aria-label="Bersihkan pencarian"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabel Akun */}
      {filteredAccounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center bg-slate-50">
          <p className="text-xs font-medium text-slate-600">
            {searchQuery !== "" || roleFilter !== "all"
              ? "Tidak ada akun pengguna yang cocok dengan kriteria pencarian."
              : "Belum ada akun pengguna terdaftar."}
          </p>
          {(searchQuery !== "" || roleFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("all");
              }}
              className="mt-2 text-xs font-semibold text-brand-blue hover:underline"
            >
              Reset Filter Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">
                    Akun & Email
                  </th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">
                    Peran
                  </th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">
                    Instansi Terafiliasi
                  </th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">
                    Status Email
                  </th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">
                    Terdaftar Sejak
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 whitespace-nowrap text-right"
                  >
                    Tindakan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredAccounts.map((acc) => {
                  const initial = (acc.email[0] ?? "U").toUpperCase();
                  const isEditing = editingAdminId === acc.id;

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700 text-xs border border-slate-200">
                            {initial}
                          </div>
                          <div>
                            {isEditing ? (
                              <label className="block">
                                <span className="sr-only">Email admin</span>
                                <input
                                  type="email"
                                  required
                                  value={editingEmail}
                                  onChange={(event) =>
                                    setEditingEmail(event.currentTarget.value)
                                  }
                                  className="w-full rounded border border-slate-300 px-2 py-1 font-medium text-slate-900"
                                />
                              </label>
                            ) : (
                              <div className="font-semibold text-slate-900">
                                {acc.email}
                              </div>
                            )}
                            <div className="font-mono text-[10px] text-slate-400">
                              ID: {acc.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {acc.role === "super_admin" ? (
                          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200">
                            Super Admin
                          </span>
                        ) : acc.role === "admin" ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-brand-blue border border-blue-200">
                            Admin Instansi
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
                            Pengguna
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {acc.role === "admin" && isEditing ? (
                          <label className="block">
                            <span className="sr-only">Instansi admin</span>
                            <select
                              required
                              value={editingAgencyId}
                              onChange={(event) =>
                                setEditingAgencyId(event.currentTarget.value)
                              }
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1"
                            >
                              <option value="" disabled>
                                Pilih instansi
                              </option>
                              {agencies.map((agency) => (
                                <option key={agency.id} value={agency.id}>
                                  {agency.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : acc.agencyName !== null ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {acc.agencyName}
                            </div>
                            {acc.agencyRegion !== null && (
                              <div className="text-[11px] text-slate-500">
                                Wilayah: {acc.agencyRegion}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            Pusat (Semua Instansi)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {acc.isEmailConfirmed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-brand-green border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                            Terverifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Belum Dikonfirmasi
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {formatDateTime(acc.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {acc.role === "admin" &&
                          (isEditing ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleUpdate(acc.id)}
                                className="rounded bg-brand-blue px-2.5 py-1 font-semibold text-white hover:bg-brand-blue-hover disabled:opacity-50"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  setEditingAdminId(null);
                                  setEditingEmail("");
                                  setEditingAgencyId("");
                                }}
                                className="rounded border border-slate-300 px-2.5 py-1 text-slate-700 hover:bg-slate-100"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  setMessage(null);
                                  setEditingAdminId(acc.id);
                                  setEditingEmail(acc.email);
                                  setEditingAgencyId(acc.agencyId ?? "");
                                }}
                                className="rounded border border-slate-300 px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDelete(acc.id, acc.email)}
                                className="rounded border border-red-300 px-2.5 py-1 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                Hapus
                              </button>
                            </div>
                          ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
