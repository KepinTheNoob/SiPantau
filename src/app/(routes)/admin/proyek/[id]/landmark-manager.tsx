"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/db/types";
import {
  addLandmark,
  deleteLandmark,
  toggleLandmarkDone,
  updateLandmark,
} from "@/server/controllers/landmarks";
import { DialogModal } from "@/components/dialog-modal";
import { FileUploadButton } from "@/components/file-upload-button";
import { LandmarkPhotos } from "./landmark-photos";

type LandmarkRow = Database["public"]["Tables"]["landmarks"]["Row"];

type LandmarkImageRow = Database["public"]["Tables"]["landmark_images"]["Row"];

export function LandmarkManager({
  projectId,
  landmarks,
  landmarkPhotos,
}: {
  readonly projectId: string;
  readonly landmarks: readonly LandmarkRow[];
  readonly landmarkPhotos: readonly LandmarkImageRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [editingLandmark, setEditingLandmark] = useState<LandmarkRow | null>(
    null
  );

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

  const handleUpdateLandmark = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (editingLandmark === null) return;

    const formData = new FormData(event.currentTarget);
    formData.append("projectId", projectId);
    formData.append("landmarkId", editingLandmark.id);
    formData.append("position", String(editingLandmark.position));

    startTransition(async () => {
      const result = await updateLandmark(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? "Gagal memperbarui tahapan.");

        return;
      }

      setEditingLandmark(null);
      router.refresh();
    });
  };

  const handleDeleteLandmark = (landmark: LandmarkRow) => {
    if (
      !window.confirm(
        `Hapus tahapan "${landmark.name}"? Catatan pengeluaran yang terkait akan tetap tersimpan, tetapi tidak lagi terhubung ke tahapan ini.`
      )
    ) {
      return;
    }

    setErrorMessage(null);

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("landmarkId", landmark.id);

    startTransition(async () => {
      const result = await deleteLandmark(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? "Gagal menghapus tahapan.");

        return;
      }

      if (
        result.message !== undefined &&
        result.message !== "Tahapan berhasil dihapus."
      ) {
        setErrorMessage(result.message);
      }

      router.refresh();
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
          onClick={() => setShowAddForm(true)}
          className="rounded-lg bg-brand-blue px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
          + Tambah Tahapan
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

      <DialogModal
        open={showAddForm}
        title="Tambah Tahapan Baru"
        onClose={() => setShowAddForm(false)}
      >
        <form onSubmit={handleAddLandmark} className="flex flex-col gap-5">
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
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
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
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </div>

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
              {isPending ? "Menyimpan..." : "Simpan Tahapan"}
            </button>
          </div>
        </form>
      </DialogModal>

      {landmarks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Belum ada tahapan yang ditambahkan ke proyek ini.
        </div>
      ) : (
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-xs">
          {landmarks.map((lm, index) => {
            const isDone = lm.done_at !== null || lm.done;

            return (
              <div key={lm.id}>
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isDone
                          ? "bg-brand-green text-white shadow-xs"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isDone ? "✓" : index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">
                          {lm.name}
                        </h4>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          Bobot {lm.weight}%
                        </span>
                        {isDone && (
                          <span className="rounded bg-brand-green-light px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-brand-green/30">
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
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setEditingLandmark(lm)}
                      aria-label={`Edit tahapan ${lm.name}`}
                      title="Edit tahapan"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand-blue/20 bg-brand-blue-light text-brand-blue transition hover:border-brand-blue/40 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:opacity-50"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-4 w-4"
                      >
                        <path
                          d="m12.8 4.2 3 3M3.5 16.5l3.2-.7L16 6.5a1.8 1.8 0 0 0-2.5-2.5l-9.3 9.3-.7 3.2Z"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDeleteLandmark(lm)}
                      aria-label={`Hapus tahapan ${lm.name}`}
                      title="Hapus tahapan"
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

                    {isDone ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggleDone(lm.id, true)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Batalkan Selesai
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCompletingLandmarkId(lm.id)}
                        className="rounded-lg bg-brand-blue px-3 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
                      >
                        Tandai Selesai
                      </button>
                    )}
                  </div>
                </div>
                <LandmarkPhotos
                  projectId={projectId}
                  landmarkId={lm.id}
                  landmarkName={lm.name}
                  photos={landmarkPhotos.filter(
                    (photo) => photo.landmark_id === lm.id
                  )}
                />
              </div>
            );
          })}
        </div>
      )}

      <DialogModal
        open={editingLandmark !== null}
        title="Edit Tahapan Proyek"
        onClose={() => setEditingLandmark(null)}
      >
        {editingLandmark !== null && (
          <form
            key={editingLandmark.id}
            onSubmit={handleUpdateLandmark}
            className="flex flex-col gap-5"
          >
            <div>
              <label
                htmlFor="edit-landmark-name"
                className="block text-xs font-medium text-slate-700"
              >
                Nama Tahapan *
              </label>
              <input
                id="edit-landmark-name"
                name="name"
                type="text"
                required
                minLength={3}
                maxLength={150}
                defaultValue={editingLandmark.name}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>

            <div>
              <label
                htmlFor="edit-landmark-weight"
                className="block text-xs font-medium text-slate-700"
              >
                Bobot (%) *
              </label>
              <input
                id="edit-landmark-weight"
                name="weight"
                type="number"
                min={1}
                max={100}
                required
                defaultValue={editingLandmark.weight}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingLandmark(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-brand-blue px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover disabled:opacity-50"
              >
                {isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        )}
      </DialogModal>

      <DialogModal
        open={completingLandmarkId !== null}
        title="Unggah Bukti Penyelesaian"
        onClose={() => setCompletingLandmarkId(null)}
      >
        {completingLandmarkId !== null && (
          <form
            onSubmit={(event) => {
              event.preventDefault();

              const fileEntry = new FormData(event.currentTarget).get(
                "evidenceFile"
              );

              const file = fileEntry instanceof File ? fileEntry : undefined;
              handleToggleDone(completingLandmarkId, false, file);
            }}
            className="flex flex-col gap-5"
          >
            <p className="text-sm text-slate-600">
              Pilih foto atau dokumen bukti untuk menyelesaikan tahapan{" "}
              <strong className="text-slate-900">
                {
                  landmarks.find(
                    (landmark) => landmark.id === completingLandmarkId
                  )?.name
                }
              </strong>
              .
            </p>
            <FileUploadButton
              id="landmark-evidence"
              name="evidenceFile"
              accept="image/*,application/pdf"
              required
              description="Foto atau PDF · pilih berkas bukti"
            />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setCompletingLandmarkId(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-brand-blue px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover disabled:opacity-50"
              >
                {isPending ? "Mengunggah..." : "Unggah & Selesaikan"}
              </button>
            </div>
          </form>
        )}
      </DialogModal>
    </div>
  );
}
