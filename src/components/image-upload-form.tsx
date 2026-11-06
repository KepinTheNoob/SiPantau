"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  IMAGE_ACCEPT,
  IMAGE_MAX_FILES_PER_UPLOAD,
} from "@/lib/validation/images";

export type HiddenField = {
  readonly name: string;
  readonly value: string;
};

export type ImageUploadResult = {
  readonly success: boolean;
  readonly message?: string;
};

/** Form unggah beberapa foto sekaligus dengan pratinjau, dipakai galeri proyek dan bukti tahapan. */
export function ImageUploadForm({
  hiddenFields,
  onUpload,
  submitLabel,
  captionPlaceholder,
}: {
  readonly hiddenFields: readonly HiddenField[];
  readonly onUpload: (formData: FormData) => Promise<ImageUploadResult>;
  readonly submitLabel: string;
  readonly captionPlaceholder: string;
}) {
  const router = useRouter();
  const fieldId = useId();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [previews, setPreviews] = useState<readonly string[]>([]);
  const [message, setMessage] = useState<ImageUploadResult | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      for (const url of previews) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previews]);

  function handleFilesChange(files: FileList | null) {
    setMessage(null);
    setPreviews(
      Array.from(files ?? [])
        .slice(0, IMAGE_MAX_FILES_PER_UPLOAD)
        .map((file) => URL.createObjectURL(file))
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    for (const field of hiddenFields) {
      formData.set(field.name, field.value);
    }

    startTransition(async () => {
      const result = await onUpload(formData);

      setMessage(result);

      if (result.success) {
        formRef.current?.reset();
        setPreviews([]);
        router.refresh();
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${fieldId}-images`}
            className="block text-xs font-semibold text-slate-700"
          >
            Foto (JPG, PNG, WebP, maks 5 MB, sampai {IMAGE_MAX_FILES_PER_UPLOAD}{" "}
            foto)
          </label>
          <input
            id={`${fieldId}-images`}
            name="images"
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            required
            onChange={(event) => handleFilesChange(event.currentTarget.files)}
            className="mt-1 block w-full cursor-pointer text-xs text-slate-700 file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-lg file:border file:border-brand-blue/30 file:bg-white file:px-3 file:text-xs file:font-semibold file:text-brand-blue hover:file:bg-brand-blue-light"
          />
        </div>
        <div>
          <label
            htmlFor={`${fieldId}-caption`}
            className="block text-xs font-semibold text-slate-700"
          >
            Keterangan (opsional)
          </label>
          <input
            id={`${fieldId}-caption`}
            name="caption"
            type="text"
            maxLength={200}
            placeholder={captionPlaceholder}
            className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>
      </div>

      {previews.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Pratinjau foto">
          {previews.map((url, index) => (
            <li key={url}>
              <img
                src={url}
                alt={`Pratinjau foto ${index + 1}`}
                width={80}
                height={80}
                className="h-20 w-20 rounded-md border border-slate-200 object-cover"
              />
            </li>
          ))}
        </ul>
      )}

      {message !== null && (
        <p
          role={message.success ? "status" : "alert"}
          className={`text-xs ${message.success ? "text-emerald-800" : "text-red-700"}`}
        >
          {message.message}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 cursor-pointer rounded-lg bg-brand-blue px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover active:bg-brand-blue-hover/90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Mengunggah..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
