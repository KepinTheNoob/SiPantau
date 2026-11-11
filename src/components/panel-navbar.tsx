"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/server/controllers/auth";
import { SipantauLogo } from "@/components/sipantau-logo";

type PanelNavbarProps = {
  readonly role: "admin" | "super_admin";
  readonly agencyName: string | null;
  readonly isProjectDetail?: boolean;
};

const ADMIN_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/proyek", label: "Daftar Proyek" },
  { href: "/admin/riwayat", label: "Riwayat Mutasi" },
] as const;

const SUPER_ADMIN_ITEMS = [
  { href: "/super-admin", label: "Dashboard" },
  { href: "/super-admin/proyek", label: "Daftar Proyek" },
  { href: "/super-admin/riwayat", label: "Riwayat Mutasi" },
] as const;

export function PanelNavbar({
  role,
  agencyName,
  isProjectDetail = false,
}: PanelNavbarProps) {
  const pathname = usePathname();
  const isSuperAdmin = role === "super_admin";
  const items = isSuperAdmin ? SUPER_ADMIN_ITEMS : ADMIN_ITEMS;

  return (
    <header className="sticky top-0 z-20 shadow-xs">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href={isSuperAdmin ? "/super-admin" : "/"}
              className="shrink-0 rounded transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <SipantauLogo size="sm" />
            </Link>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                {isSuperAdmin ? "Panel Super Admin" : "Panel Pengelola Proyek"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {isSuperAdmin
                  ? "Sistem Pengawasan Terpusat"
                  : (agencyName ?? "Tidak terafiliasi dengan instansi")}
              </p>
            </div>
          </div>

          <form action={logoutAction} className="shrink-0">
            <button
              type="submit"
              className="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              Keluar
            </button>
          </form>
        </div>
      </div>

      {/* Strip navigasi biru: warna sekunder panel; menu aktif ditandai garis hijau (aksen). */}
      <div className="bg-brand-blue">
        <nav
          aria-label="Navigasi panel"
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8"
        >
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" &&
                item.href !== "/super-admin" &&
                pathname.startsWith(`${item.href}/`)) ||
              (isProjectDetail && item.href.endsWith("/proyek"));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center border-b-[3px] px-3 text-sm font-semibold transition focus:outline-none focus-visible:bg-white/15 ${
                  isActive
                    ? "border-brand-green text-white"
                    : "border-transparent text-blue-50 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
