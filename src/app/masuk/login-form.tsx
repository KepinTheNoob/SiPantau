"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/server/actions/auth";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMfa, setShowMfa] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? "Terjadi kesalahan.");

        if (result.requireMfa === true) {
          setShowMfa(true);
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {errorMessage !== null && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700"
        >
          Alamat Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@instansi.go.id"
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700"
        >
          Kata Sandi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
        />
      </div>

      {showMfa && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3">
          <label
            htmlFor="totpCode"
            className="block text-sm font-medium text-amber-900"
          >
            Kode Autentikasi 2FA (TOTP)
          </label>
          <input
            id="totpCode"
            name="totpCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoComplete="one-time-code"
            placeholder="Contoh: 123456"
            className="mt-1 block w-full rounded border border-amber-300 px-3 py-2 text-sm shadow-sm focus:border-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-800"
          />
          <p className="mt-1 text-xs text-amber-700">
            Buka aplikasi Google Authenticator atau aplikasi sejenis untuk
            melihat kode 6 digit.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-full rounded bg-slate-900 py-2.5 text-center text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Memproses..."
          : showMfa
            ? "Verifikasi & Masuk"
            : "Masuk ke Panel"}
      </button>
    </form>
  );
}
