"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/server/actions/auth";
import { SipantauLogo } from "@/components/sipantau-logo";

type PanelNavbarProps = {
  readonly role: "admin" | "super_admin";
  readonly agencyName: string | null;
};

const ADMIN_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/proyek", label: "Daftar Proyek" },
  { href: "/admin/riwayat", label: "Riwayat Mutasi" },
] as const;

const SUPER_ADMIN_ITEMS = [
  { href: "/super-admin/proyek", label: "Daftar Proyek" },
  { href: "/super-admin/riwayat", label: "Riwayat Mutasi" },
  { href: "/super-admin", label: "Dashboard" },
] as const;

export function PanelNavbar({ role, agencyName }: PanelNavbarProps) {
  const pathname = usePathname();
  const isSuperAdmin = role === "super_admin";
  const items = isSuperAdmin ? SUPER_ADMIN_ITEMS : ADMIN_ITEMS;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link
            href={isSuperAdmin ? "/super-admin" : "/"}
            className="transition hover:opacity-90"
          >
            <SipantauLogo size="sm" />
          </Link>
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              {isSuperAdmin ? "Panel Super Admin" : "Panel Pengelola Proyek"}
            </h1>
            <p className="text-xs text-slate-500">
              {isSuperAdmin
                ? "Sistem Pengawasan Terpusat"
                : `Instansi: ${agencyName ?? "Tidak terafiliasi dengan instansi"}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
          <nav aria-label="Navigasi panel" className="flex flex-wrap gap-1">
            {items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" &&
                  item.href !== "/super-admin" &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded px-2 py-1.5 text-xs font-semibold transition sm:px-2.5 ${
                    isActive
                      ? isSuperAdmin
                        ? "text-red-700"
                        : "text-brand-blue"
                      : "text-slate-700 hover:text-brand-blue"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Keluar
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
