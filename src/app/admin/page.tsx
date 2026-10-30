import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth";
import { logoutAction } from "@/server/actions/auth";
import { SipantauLogo } from "@/components/sipantau-logo";

export const metadata: Metadata = {
  title: "Panel Admin Instansi - SIPANTAU",
  description: "Kelola proyek transparansi instansi pemerintah di SIPANTAU",
};

export default async function AdminDashboardPage() {
  const { user, profile, agency } = await requireAdmin();

  const agencyName = agency?.name ?? "Tidak terafiliasi dengan instansi";
  const isVerified = agency?.verified === true;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:opacity-90 transition">
              <SipantauLogo size="sm" />
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Panel Pengelola Proyek
              </h1>
              <p className="text-xs text-slate-500">
                Instansi:{" "}
                <span className="font-semibold text-slate-700">
                  {agencyName}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/proyek"
              className="text-xs font-semibold text-slate-700 hover:text-brand-blue transition"
            >
              Daftar Proyek
            </Link>
            <Link
              href="/admin/riwayat"
              className="text-xs font-semibold text-slate-700 hover:text-brand-blue transition"
            >
              Riwayat Mutasi
            </Link>
            {profile.role === "super_admin" && (
              <Link
                href="/super-admin"
                className="text-xs font-semibold text-red-700 hover:text-red-900"
              >
                Panel Super Admin
              </Link>
            )}
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-xs font-semibold uppercase text-slate-500">
              Profil Instansi
            </h2>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {agencyName}
            </p>
            <div className="mt-3">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isVerified
                    ? "bg-brand-green-light text-brand-green border border-brand-green/20"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isVerified ? "✓ Terverifikasi" : "Menunggu Verifikasi"}
              </span>
            </div>
            {!isVerified && (
              <p className="mt-2 text-xs text-amber-700">
                Instansi Anda belum diverifikasi oleh Super Admin. Anda belum
                dapat membuat proyek baru hingga verifikasi disetujui.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-xs font-semibold uppercase text-slate-500">
              Informasi Akun
            </h2>
            <p className="mt-2 text-sm text-slate-900 font-medium">
              {user.email}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Peran:{" "}
              <span className="font-semibold uppercase text-brand-blue">
                {profile.role}
              </span>
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-xs font-semibold uppercase text-slate-500">
              Cakupan Wilayah
            </h2>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {agency?.region ?? "-"}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
