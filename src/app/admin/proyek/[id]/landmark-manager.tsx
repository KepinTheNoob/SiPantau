"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/db/types";
import { addLandmark, toggleLandmarkDone } from "@/server/actions/landmarks";

type LandmarkRow = Database["public"]["Tables"]["landmarks"]["Row"];

export function LandmarkManager({
  projectId,
  landmarks,
}: {
  readonly projectId: string;
  readonly landmarks: readonly LandmarkRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [completingLandmarkId, setCompletingLandmarkId] = useState<
    string | null
  >(null);

  const totalWeight = landmarks.reduce((acc, curr) => acc + curr.weight, 0);

  const handleAddLandmark = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    formData.append("projectId", projectId);
    formData.append("position", String(landmarks.length));

    startTransition(async () => {
      const result = await addLandmark(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? "Gagal menambahkan tahapan.");
      } else {
        setShowAddForm(false);
        router.refresh();
      }
    });
  };

  const handleToggleDone = (
    landmarkId: string,
    currentlyDone: boolean,
    file?: File
  ) => {
    setErrorMessage(null);
    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("landmarkId", landmarkId);
    formData.append("done", currentlyDone ? "false" : "true");

    if (!currentlyDone) {
      if (file === undefined || file.size === 0) {
        setErrorMessage(
          "Wajib memilih berkas foto/dokumen bukti penyelesaian tahapan."
        );

        return;
      }

      formData.append("evidence", file);
    }

    startTransition(async () => {
      const result = await toggleLandmarkDone(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? "Gagal memperbarui status selesai.");
      } else {
        setCompletingLandmarkId(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Daftar Tahapan Proyek (Landmarks)
          </h2>
          <p className="text-sm text-slate-600">
            Total Bobot:{" "}
            <span
              className={`font-semibold ${
                totalWeight === 100
                  ? "text-emerald-700"
                  : "text-amber-700 font-bold"
              }`}
            >
              {totalWeight}% / 100%
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
        >
          {showAddForm ? "Tutup Form" : "+ Tambah Tahapan"}
        </button>
      </div>

      {totalWeight !== 100 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          Perhatian: Total bobot tahapan saat ini adalah {totalWeight}%.
          Disarankan agar jumlah seluruh bobot tahapan tepat 100% untuk
          perhitungan progres yang akurat.
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

      {showAddForm && (
        <form
          onSubmit={handleAddLandmark}
          className="rounded-lg border border-slate-300 bg-slate-50 p-4"
        >
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Tambah Tahapan Baru
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="landmark-name"
                className="block text-xs font-medium text-slate-700"
              >
                Nama Tahapan *
              </label>
              <input
                id="landmark-name"
                name="name"
                type="text"
                required
                placeholder="Contoh: Fondasi dan Pengecoran Awal"
                className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="landmark-weight"
                className="block text-xs font-medium text-slate-700"
              >
                Bobot (%) *
              </label>
              <input
                id="landmark-weight"
                name="weight"
                type="number"
                min={1}
                max={100}
                required
                placeholder="Contoh: 25"
                className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-slate-900 px-4 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isPending ? "Menyimpan..." : "Simpan Tahapan"}
            </button>
          </div>
        </form>
      )}

      {landmarks.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Belum ada tahapan yang ditambahkan ke proyek ini.
        </div>
      ) : (
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
          {landmarks.map((lm, index) => {
            const isDone = lm.done_at !== null || lm.done;
            const isCompletingThis = completingLandmarkId === lm.id;

            return (
              <div
                key={lm.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900">{lm.name}</h4>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        Bobot {lm.weight}%
                      </span>
                      {isDone && (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          Selesai
                        </span>
                      )}
                    </div>
                    {isDone && lm.done_at && (
                      <p className="mt-1 text-xs text-slate-400">
                        Selesai pada:{" "}
                        {new Date(lm.done_at).toLocaleDateString("id-ID")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {isDone ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleDone(lm.id, true)}
                      className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Batalkan Selesai
                    </button>
                  ) : isCompletingThis ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();

                        const data = new FormData(e.currentTarget);
                        const fileEntry = data.get("evidenceFile");

                        const file =
                          fileEntry instanceof File ? fileEntry : undefined;

                        handleToggleDone(lm.id, false, file);
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        name="evidenceFile"
                        type="file"
                        accept="image/*,application/pdf"
                        required
                        className="text-xs text-slate-600"
                      />
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                      >
                        Unggah & Selesai
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompletingLandmarkId(null)}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        Batal
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCompletingLandmarkId(lm.id)}
                      className="rounded bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                    >
                      Tandai Selesai
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
