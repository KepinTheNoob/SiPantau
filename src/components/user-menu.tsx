"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { citizenSignOutAction } from "@/server/controllers/citizen-auth";

/** Tombol akun di navbar untuk pengguna yang sudah masuk: nama, tautan, dan keluar. */
export function UserMenu({
  email,
  panelHref,
}: {
  readonly email: string;
  /** Tautan panel admin; null untuk akun warga. */
  readonly panelHref: string | null;
}) {
  const router = useRouter();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();

  const displayName = email.split("@")[0] ?? email;
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSignOut() {
    startSignOut(async () => {
      await citizenSignOutAction();
      setOpen(false);
      router.refresh();
    });
  }

  const itemClass =
    "flex min-h-11 w-full cursor-pointer items-center rounded-md px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:outline-none";

  return (
    <div ref={containerRef} className="relative sm:order-last">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 max-w-48 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-xs font-semibold text-slate-800 shadow-xs transition hover:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue"
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white"
        >
          {initial}
        </span>
        <span className="truncate">{displayName}</span>
        <span className="sr-only">, menu akun</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`}
        >
          <path
            d="m6 8 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <p className="truncate px-3 py-2 text-xs text-slate-500">{email}</p>
          {panelHref !== null && (
            <Link
              href={panelHref}
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              Buka panel pengelola
            </Link>
          )}
          {panelHref === null && (
            <Link
              href="/laporan-saya"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              PantauLaporan
            </Link>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={`${itemClass} text-red-700 hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isSigningOut ? "Keluar..." : "Keluar"}
          </button>
        </div>
      )}
    </div>
  );
}
