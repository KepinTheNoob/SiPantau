"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  citizenSignInAction,
  citizenSignUpAction,
} from "@/server/controllers/citizen-auth";

type AuthMode = "masuk" | "daftar";

const INPUT_CLASS =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue";

/** Modal masuk/daftar warga, muncul sebelum warga bisa membuat laporan. */
export function CitizenAuthDialog({
  open,
  onClose,
  onSignedIn,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSignedIn: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [mode, setMode] = useState<AuthMode>("masuk");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrorMessage(null);
    setInfoMessage(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result =
        mode === "masuk"
          ? await citizenSignInAction(formData)
          : await citizenSignUpAction(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? "Terjadi kesalahan. Coba lagi.");

        return;
      }

      if (result.needsEmailConfirmation === true) {
        setMode("masuk");
        setInfoMessage(result.message ?? "Cek email Anda untuk konfirmasi.");

        return;
      }

      onSignedIn();
    });
  }

  const isSignIn = mode === "masuk";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="citizen-auth-title"
      onClose={onClose}
      onClick={(event) => {
        // Klik di area gelap di luar kotak modal menutup modal.
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/50"
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="citizen-auth-title" className="text-lg font-bold">
              {isSignIn ? "Masuk untuk membuat laporan" : "Daftar akun warga"}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Laporan dikirim atas nama &quot;Warga&quot;. Email Anda tidak
              ditampilkan di halaman publik.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-xl leading-none text-slate-600 transition hover:bg-slate-100 active:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
          {(["masuk", "daftar"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => switchMode(option)}
              className={`min-h-11 cursor-pointer rounded-md transition focus:outline-none focus:ring-2 focus:ring-brand-blue ${
                mode === option
                  ? "bg-white text-brand-blue shadow-xs"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              {option === "masuk" ? "Masuk" : "Daftar"}
            </button>
          ))}
        </div>

        {errorMessage !== null && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900"
          >
            {errorMessage}
          </p>
        )}

        {infoMessage !== null && (
          <p
            role="status"
            className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900"
          >
            {infoMessage}
          </p>
        )}

        <form
          key={mode}
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-4"
        >
          <div>
            <label
              htmlFor="citizen-email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="citizen-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label
              htmlFor="citizen-password"
              className="block text-sm font-medium text-slate-700"
            >
              Kata sandi
            </label>
            <input
              id="citizen-password"
              name="password"
              type="password"
              required
              minLength={isSignIn ? undefined : 8}
              autoComplete={isSignIn ? "current-password" : "new-password"}
              className={INPUT_CLASS}
            />
            {!isSignIn && (
              <p className="mt-1 text-xs text-slate-600">Minimal 8 karakter.</p>
            )}
          </div>

          {!isSignIn && (
            <div>
              <label
                htmlFor="citizen-password-confirm"
                className="block text-sm font-medium text-slate-700"
              >
                Ulangi kata sandi
              </label>
              <input
                id="citizen-password-confirm"
                name="passwordConfirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={INPUT_CLASS}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="min-h-11 w-full cursor-pointer rounded-lg bg-brand-blue text-sm font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover active:bg-brand-blue-hover/90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? "Memproses..."
              : isSignIn
                ? "Masuk dan buat laporan"
                : "Daftar dan buat laporan"}
          </button>
        </form>
      </div>
    </dialog>
  );
}
