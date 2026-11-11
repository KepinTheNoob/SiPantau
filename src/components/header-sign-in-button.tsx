"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CitizenAuthDialog } from "@/components/citizen-auth-dialog";

/** Tombol "Masuk" di navbar publik: membuka popup masuk/daftar warga. */
export function HeaderSignInButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 cursor-pointer rounded-lg bg-brand-blue px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 sm:order-last"
      >
        Masuk
      </button>
      <CitizenAuthDialog
        open={open}
        purpose="general"
        onClose={() => setOpen(false)}
        onSignedIn={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
