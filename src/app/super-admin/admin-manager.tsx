"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/db/types";
import {
  deleteAgencyAdmin,
  updateAgencyAdmin,
} from "@/server/actions/super-admin";
import type { AgencyAdminAccount } from "@/server/admin-only/accounts";

type AgencyRow = Database["public"]["Tables"]["agencies"]["Row"];

export function AdminManager({
  admins,
  agencies,
}: {
  readonly admins: readonly AgencyAdminAccount[];
  readonly agencies: readonly AgencyRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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

  const handleDelete = (adminId: string, email: string | null) => {
    if (
      !window.confirm(
        `Hapus akun admin ${email ?? "ini"}? Akun ini tidak dapat digunakan untuk login lagi.`
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
        if (editingAdminId === adminId) {
          setEditingAdminId(null);
        }

        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
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

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 font-semibold text-slate-700">
            <tr>
              <th scope="col" className="px-4 py-3">
                Email Admin
              </th>
              <th scope="col" className="px-4 py-3">
                Instansi
              </th>
              <th scope="col" className="px-4 py-3">
                Tanggal Dibuat
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Tindakan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Belum ada admin instansi terdaftar.
                </td>
              </tr>
            ) : (
              admins.map((admin) => {
                const agency = agencies.find(
                  (item) => item.id === admin.agency_id
                );

                const isEditing = editingAdminId === admin.id;

                return (
                  <tr key={admin.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {isEditing ? (
                        <>
                          <label
                            className="sr-only"
                            htmlFor={`email-${admin.id}`}
                          >
                            Email admin
                          </label>
                          <input
                            id={`email-${admin.id}`}
                            type="email"
                            required
                            value={editingEmail}
                            onChange={(event) =>
                              setEditingEmail(event.currentTarget.value)
                            }
                            className="w-full rounded border border-slate-300 px-2 py-1"
                          />
                        </>
                      ) : (
                        (admin.email ?? "Email tidak tersedia")
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {isEditing ? (
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
                          {agencies.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        (agency?.name ?? "Instansi tidak tersedia")
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <time dateTime={admin.created_at}>
                        {new Date(admin.created_at).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            timeZone: "Asia/Jakarta",
                          }
                        )}
                      </time>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleUpdate(admin.id)}
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
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => {
                                setMessage(null);
                                setEditingEmail(admin.email ?? "");
                                setEditingAgencyId(admin.agency_id ?? "");
                                setEditingAdminId(admin.id);
                              }}
                              className="rounded border border-slate-300 px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                handleDelete(admin.id, admin.email)
                              }
                              className="rounded border border-red-300 px-2.5 py-1 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
