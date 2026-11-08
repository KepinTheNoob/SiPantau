"use client";

import { useId, useState, useTransition } from "react";
import {
  submitDelayReport,
  type FieldError,
} from "@/server/controllers/delay-reports";
import { formatIsoDate, nextIsoDate } from "@/lib/dates";

export type DelayReasonOption = {
  readonly id: number;
  readonly label: string;
};

const FIELD_CLASS =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue sm:text-sm";

/** Form laporan keterlambatan: jenis alasan, uraian, rencana percepatan, target baru. */
export function DelayReportForm({
  projectId,
  effectiveTargetDate,
  categories,
  onSubmitted,
  onCancel,
  cancelLabel,
}: {
  readonly projectId: string;
  /** Target yang berlaku sekarang; target baru harus setelahnya. */
  readonly effectiveTargetDate: string;
  readonly categories: readonly DelayReasonOption[];
  readonly onSubmitted: () => void;
  readonly onCancel: () => void;
  readonly cancelLabel: string;
}) {
  const formId = useId();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<readonly FieldError[]>([]);

  const fieldError = (field: string) =>
    fieldErrors.find((error) => error.field === field)?.message;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors([]);

    const formData = new FormData(event.currentTarget);

    formData.set("projectId", projectId);

    startTransition(async () => {
      const result = await submitDelayReport(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? "Laporan gagal disimpan.");
        setFieldErrors(result.fieldErrors ?? []);

        return;
      }

      onSubmitted();
    });
  }

  const reasonsError = fieldError("reasonCategoryIds");
  const detailError = fieldError("reasonDetail");
  const planError = fieldError("recoveryPlan");
  const dateError = fieldError("revisedTargetDate");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {errorMessage !== null && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {errorMessage}
        </p>
      )}

      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">
          Jenis alasan keterlambatan *
        </legend>
        <p className="text-xs text-slate-600">Boleh pilih lebih dari satu.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 has-[:checked]:border-brand-blue has-[:checked]:bg-brand-blue-light"
            >
              <input
                type="checkbox"
                name="reasonCategoryIds"
                value={category.id}
                className="h-4 w-4 cursor-pointer accent-brand-blue"
              />
              {category.label}
            </label>
          ))}
        </div>
        {reasonsError !== undefined && (
          <p className="mt-1 text-xs text-red-700">{reasonsError}</p>
        )}
      </fieldset>

      <div>
        <label
          htmlFor={`${formId}-detail`}
          className="block text-sm font-semibold text-slate-800"
        >
          Uraian alasan *
        </label>
        <textarea
          id={`${formId}-detail`}
          name="reasonDetail"
          rows={4}
          required
          minLength={20}
          maxLength={2000}
          placeholder="Contoh: Pengiriman girder baja tertunda 6 minggu karena antrean produksi pabrik."
          className={FIELD_CLASS}
        />
        {detailError !== undefined && (
          <p className="mt-1 text-xs text-red-700">{detailError}</p>
        )}
      </div>

      <div>
        <label
          htmlFor={`${formId}-plan`}
          className="block text-sm font-semibold text-slate-800"
        >
          Rencana mengejar keterlambatan *
        </label>
        <textarea
          id={`${formId}-plan`}
          name="recoveryPlan"
          rows={4}
          required
          minLength={20}
          maxLength={2000}
          placeholder="Contoh: Menambah satu regu kerja malam dan memindahkan pengecoran ke akhir pekan."
          className={FIELD_CLASS}
        />
        {planError !== undefined && (
          <p className="mt-1 text-xs text-red-700">{planError}</p>
        )}
      </div>

      <div>
        <label
          htmlFor={`${formId}-date`}
          className="block text-sm font-semibold text-slate-800"
        >
          Target selesai terbaru *
        </label>
        <input
          id={`${formId}-date`}
          name="revisedTargetDate"
          type="date"
          required
          min={nextIsoDate(effectiveTargetDate)}
          className={`${FIELD_CLASS} min-h-11 sm:max-w-xs`}
        />
        <p className="mt-1 text-xs text-slate-600">
          Target yang berlaku sekarang: {formatIsoDate(effectiveTargetDate)}.
          Laporan tidak bisa diubah setelah dikirim; revisi berikutnya dibuat
          sebagai laporan baru.
        </p>
        {dateError !== undefined && (
          <p className="mt-1 text-xs text-red-700">{dateError}</p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
          {cancelLabel}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 cursor-pointer rounded-lg bg-brand-blue px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover active:bg-brand-blue-hover/90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Mengirim..." : "Kirim laporan keterlambatan"}
        </button>
      </div>
    </form>
  );
}
