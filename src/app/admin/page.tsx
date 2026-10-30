import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth";
import { logoutAction } from "@/server/actions/auth";

export const metadata: Metadata = {
  title: "Panel Admin Instansi",
  description: "Kelola proyek transparansi instansi pemerintah",
};

export default async function AdminDashboardPage() {
  const { user, profile, agency } = await requireAdmin();

  const agencyName = agency?.name ?? "Tidak terafiliasi dengan instansi";
  const isVerified = agency?.verified === true;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Panel Pengelola Proyek
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Instansi: <span className="font-semibold">{agencyName}</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/proyek"
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Daftar Proyek
            </Link>
            <Link
              href="/admin/riwayat"
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Riwayat Mutasi
            </Link>
            {profile.role === "super_admin" && (
              <Link
                href="/super-admin"
                className="text-sm font-medium text-red-700 hover:text-red-900 font-semibold"
              >
                Panel Super Admin
              </Link>
            )}
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500">
              Profil Instansi
            </h2>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {agencyName}
            </p>
            <div className="mt-3">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isVerified
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isVerified ? "Terverifikasi" : "Menunggu Verifikasi"}
              </span>
            </div>
            {!isVerified && (
              <p className="mt-2 text-xs text-amber-700">
                Instansi Anda belum diverifikasi oleh Super Admin. Anda belum
                dapat membuat proyek baru hingga verifikasi disetujui.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500">
              Informasi Akun
            </h2>
            <p className="mt-2 text-sm text-slate-900 font-medium">
              {user.email}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Peran:{" "}
              <span className="font-semibold uppercase">{profile.role}</span>
            </p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500">
              Cakupan Wilayah
            </h2>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {agency?.region ?? "-"}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
