"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CitizenAuthDialog } from "@/components/citizen-auth-dialog";

/** Ajakan masuk untuk warga yang membuka PantauLaporan tanpa sesi. */
export function CitizenSignInPrompt() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
      <h2 className="text-base font-bold text-slate-900">
        Masuk untuk melihat laporan Anda
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
        Laporan yang Anda kirim dari halaman proyek tersimpan di akun Anda,
        lengkap dengan tanggapan instansi.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 min-h-11 cursor-pointer rounded-lg bg-brand-blue px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
      >
        Masuk atau daftar
      </button>
      <CitizenAuthDialog
        open={open}
        onClose={() => setOpen(false)}
        onSignedIn={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
