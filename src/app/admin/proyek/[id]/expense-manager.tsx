"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/db/types";
import { addExpense, deleteExpense } from "@/server/actions/expenses";
import { formatRupiah } from "@/lib/rupiah";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { DialogModal } from "@/components/dialog-modal";
import { FileUploadButton } from "@/components/file-upload-button";

type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];

type LandmarkRow = Database["public"]["Tables"]["landmarks"]["Row"];

export function ExpenseManager({
  projectId,
  budgetTotal,
  expenses,
  landmarks,
}: {
  readonly projectId: string;
  readonly budgetTotal: number;
  readonly expenses: readonly ExpenseRow[];
  readonly landmarks: readonly LandmarkRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [amountInput, setAmountInput] = useState<string>("");
  const [overBudgetConfirmed, setOverBudgetConfirmed] = useState(false);

  const spentTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const enteredAmount = Number(amountInput) || 0;
  const projectedTotal = spentTotal + enteredAmount;
  const wouldExceedBudget = enteredAmount > 0 && projectedTotal > budgetTotal;

  const handleAddExpense = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (wouldExceedBudget && !overBudgetConfirmed) {
      setErrorMessage(
        "Pengeluaran ini akan melebihi total pagu anggaran. Berikan centang konfirmasi eksplisit sebelum melanjutkan."
      );

      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.append("projectId", projectId);

    startTransition(async () => {
      const result = await addExpense(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? "Gagal menambahkan pengeluaran.");
      } else {
        setShowAddForm(false);
        setAmountInput("");
        setOverBudgetConfirmed(false);
        router.refresh();
      }
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin menghapus catatan pengeluaran ini?"
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("expenseId", expenseId);

    startTransition(async () => {
      const result = await deleteExpense(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? "Gagal menghapus pengeluaran.");
      } else {
        router.refresh();
      }
    });
  };

  const storageBaseUrl = `${getSupabaseUrl()}/storage/v1/object/public/evidence`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Realisasi Anggaran Proyek
          </h2>
          <p className="text-sm text-slate-600">
            Terpakai:{" "}
            <span className="font-semibold text-slate-900">
              {formatRupiah(spentTotal)}
            </span>{" "}
            dari total pagu{" "}
            <span className="font-semibold text-slate-900">
              {formatRupiah(budgetTotal)}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="rounded-lg bg-brand-blue px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
          + Catat Pengeluaran Baru
        </button>
      </div>

      {spentTotal > budgetTotal && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-xs text-red-800">
          ⚠️ <strong>Peringatan Defisit:</strong> Total realisasi saat ini telah
          melebihi pagu anggaran awal sebesar{" "}
          {formatRupiah(spentTotal - budgetTotal)}.
        </div>
      )}

      {errorMessage !== null && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      )}

      <DialogModal
        open={showAddForm}
        title="Catat Realisasi Pengeluaran Baru"
        onClose={() => setShowAddForm(false)}
      >
        <form onSubmit={handleAddExpense} className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="expense-amount"
                className="block text-xs font-medium text-slate-700"
              >
                Nominal Pengeluaran (Rupiah) *
              </label>
              <input
                id="expense-amount"
                name="amount"
                type="number"
                min={1}
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="Contoh: 50000000"
                className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="expense-landmark"
                className="block text-xs font-medium text-slate-700"
              >
                Kaitkan ke Tahapan / Landmark (Opsional)
              </label>
              <select
                id="expense-landmark"
                name="landmarkId"
                className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
              >
                <option value="">-- Umum / Tanpa Landmark Spesifik --</option>
                {landmarks.map((lm) => (
                  <option key={lm.id} value={lm.id}>
                    {lm.name} ({lm.weight}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="expense-note"
                className="block text-xs font-medium text-slate-700"
              >
                Keterangan / Uraian Belanja *
              </label>
              <input
                id="expense-note"
                name="note"
                type="text"
                required
                placeholder="Contoh: Pembelian semen dan material konstruksi termin 1"
                className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="expense-spent-at"
                className="block text-xs font-medium text-slate-700"
              >
                Tanggal Pengeluaran
              </label>
              <input
                id="expense-spent-at"
                name="spent_at"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="expense-evidence"
                className="block text-xs font-medium text-slate-700"
              >
                Bukti Pembayaran / Kuitansi (Foto/PDF) *
              </label>
              <FileUploadButton
                id="expense-evidence"
                name="evidence"
                accept="image/*,application/pdf"
                required
                description="Foto atau PDF · bukti pembayaran"
              />
            </div>
          </div>

          {wouldExceedBudget && (
            <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">
                ⚠️ Peringatan: Total pengeluaran ({formatRupiah(projectedTotal)}
                ) akan melampaui pagu anggaran proyek (
                {formatRupiah(budgetTotal)}).
              </p>
              <label className="mt-2 flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={overBudgetConfirmed}
                  onChange={(e) => setOverBudgetConfirmed(e.target.checked)}
                  className="rounded border-amber-400 text-slate-900"
                />
                Saya memahami dan mengonfirmasi bahwa pengeluaran ini melampaui
                anggaran awal yang disetujui.
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand-blue px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover disabled:opacity-50"
            >
              {isPending ? "Menyimpan..." : "Simpan Pengeluaran"}
            </button>
          </div>
        </form>
      </DialogModal>

      {expenses.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Belum ada catatan realisasi anggaran yang diinput.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Tanggal
                </th>
                <th scope="col" className="px-4 py-3">
                  Nominal
                </th>
                <th scope="col" className="px-4 py-3">
                  Uraian Belanja
                </th>
                <th scope="col" className="px-4 py-3">
                  Tahapan Terkait
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Bukti / Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((exp) => {
                const linkedLm = landmarks.find(
                  (lm) => lm.id === exp.landmark_id
                );

                return (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {new Date(exp.spent_at).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatRupiah(exp.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {exp.note}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {linkedLm ? linkedLm.name : "-"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {exp.evidence_path && (
                          <a
                            href={`${storageBaseUrl}/${exp.evidence_path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
                          >
                            Bukti ↗
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDeleteExpense(exp.id)}
                          aria-label="Hapus catatan pengeluaran"
                          title="Hapus catatan pengeluaran"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="h-4 w-4"
                          >
                            <path
                              d="M3.5 5.5h13m-11.5 0 .7 10.1a1.5 1.5 0 0 0 1.5 1.4h5.6a1.5 1.5 0 0 0 1.5-1.4l.7-10.1M7.5 5.5V4a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 12.5 4v1.5M8 8.5v5m4-5v5"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
