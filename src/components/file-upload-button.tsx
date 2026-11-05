"use client";

import { useRef, useState } from "react";

export function FileUploadButton({
  id,
  name,
  accept,
  required = false,
  description,
}: {
  readonly id: string;
  readonly name: string;
  readonly accept: string;
  readonly required?: boolean;
  readonly description: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [fileName, setFileName] = useState("");
  const [showRequiredError, setShowRequiredError] = useState(false);

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          setFileName(event.currentTarget.files?.[0]?.name ?? "");
          setShowRequiredError(false);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setShowRequiredError(true);
          buttonRef.current?.focus();
        }}
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
      <button
        ref={buttonRef}
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-describedby={`${id}-description`}
        aria-invalid={showRequiredError}
        className="inline-flex min-h-11 max-w-full items-center gap-3 rounded-xl border border-brand-blue/20 bg-gradient-to-r from-brand-blue-light to-brand-green-light px-4 py-2.5 text-left text-sm font-semibold text-slate-800 shadow-xs transition hover:border-brand-blue/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-blue shadow-xs">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="h-5 w-5"
          >
            <path
              d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M4 12.5v3A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5v-3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
            />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block truncate">{fileName || "Pilih berkas"}</span>
          <span
            id={`${id}-description`}
            className="block truncate text-xs font-normal text-slate-500"
          >
            {fileName ? "Berkas siap diunggah" : description}
          </span>
        </span>
      </button>
      {showRequiredError && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          Silakan pilih berkas terlebih dahulu.
        </p>
      )}
    </div>
  );
}
