"use client";

import { useRef, useState } from "react";

const INPUT_CLASS =
  "mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800";

const MAX_LANDMARKS = 30;

/**
 * Daftar tahapan awal (wajib minimal satu) pada form proyek baru.
 * Nilainya dikirim sebagai `landmark_name` dan `landmark_weight` berulang.
 */
export function InitialLandmarksFields({
  getFieldError,
}: {
  readonly getFieldError: (field: string) => string | undefined;
}) {
  const nextRowId = useRef(1);
  const [rowIds, setRowIds] = useState<readonly number[]>([0]);

  const [weights, setWeights] = useState<ReadonlyMap<number, number>>(
    new Map()
  );

  const totalWeight = rowIds.reduce(
    (sum, rowId) => sum + (weights.get(rowId) ?? 0),
    0
  );

  function addRow() {
    const rowId = nextRowId.current;

    nextRowId.current += 1;
    setRowIds((current) => [...current, rowId]);
  }

  function removeRow(rowId: number) {
    setRowIds((current) => current.filter((id) => id !== rowId));
  }

  function updateWeight(rowId: number, rawValue: string) {
    const value = Number(rawValue);

    setWeights((current) => {
      const next = new Map(current);

      next.set(rowId, Number.isFinite(value) ? value : 0);

      return next;
    });
  }

  const listError = getFieldError("landmarks");

  return (
    <fieldset className="rounded-lg border border-slate-200 p-4 sm:p-5">
      <legend className="px-1 text-sm font-semibold text-slate-900">
        Tahapan Proyek *
      </legend>
      <p className="text-xs text-slate-600">
        Minimal satu tahapan. Progres fisik dihitung dari bobot tahapan yang
        sudah selesai dibagi total bobot. Tahapan masih bisa diubah setelah
        proyek dibuat.
      </p>

      {listError !== undefined && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {listError}
        </p>
      )}

      <ol className="mt-4 space-y-3">
        {rowIds.map((rowId, index) => {
          const nameError = getFieldError(`landmarks.${index}.name`);
          const weightError = getFieldError(`landmarks.${index}.weight`);

          return (
            <li
              key={rowId}
              className="grid gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-start"
            >
              <div>
                <label
                  htmlFor={`landmark-name-${rowId}`}
                  className="block text-xs font-medium text-slate-700"
                >
                  Tahapan {index + 1}
                </label>
                <input
                  id={`landmark-name-${rowId}`}
                  name="landmark_name"
                  type="text"
                  required
                  minLength={3}
                  maxLength={150}
                  placeholder={
                    index === 0
                      ? "Contoh: Pekerjaan pondasi dan tiang pancang"
                      : "Nama tahapan"
                  }
                  className={INPUT_CLASS}
                />
                {nameError !== undefined && (
                  <p className="mt-1 text-xs text-red-600">{nameError}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor={`landmark-weight-${rowId}`}
                  className="block text-xs font-medium text-slate-700"
                >
                  Bobot (1-100)
                </label>
                <input
                  id={`landmark-weight-${rowId}`}
                  name="landmark_weight"
                  type="number"
                  required
                  min={1}
                  max={100}
                  step={1}
                  placeholder="30"
                  onChange={(event) => updateWeight(rowId, event.target.value)}
                  className={INPUT_CLASS}
                />
                {weightError !== undefined && (
                  <p className="mt-1 text-xs text-red-600">{weightError}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeRow(rowId)}
                disabled={rowIds.length === 1}
                aria-label={`Hapus tahapan ${index + 1}`}
                className="min-h-11 cursor-pointer rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100 active:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-50 sm:mt-5"
              >
                Hapus
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={addRow}
          disabled={rowIds.length >= MAX_LANDMARKS}
          className="min-h-11 cursor-pointer rounded-lg border border-brand-blue/30 bg-white px-4 text-xs font-semibold text-brand-blue transition hover:bg-brand-blue-light active:bg-brand-blue/10 focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tambah tahapan
        </button>
        <p className="text-xs text-slate-600">
          Total bobot: <span className="font-semibold">{totalWeight}</span>
        </p>
      </div>
    </fieldset>
  );
}
