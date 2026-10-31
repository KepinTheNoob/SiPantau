import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/server/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logoutAction } from "@/server/actions/auth";
import { AgencyManager } from "./agency-manager";
import { CreateAdminForm } from "./create-admin-form";
import { UserAccountList } from "./user-account-list";
import { AuditLogViewer } from "@/components/audit-log-viewer";
import { SipantauLogo } from "@/components/sipantau-logo";
import { listUserAccounts } from "@/server/admin-only/accounts";

export const metadata: Metadata = {
  title: "Panel Super Admin - SIPANTAU",
  description:
    "Manajemen instansi, akun administrator, dan pengawasan audit log terpusat di SIPANTAU",
};

export default async function SuperAdminDashboardPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly agencyId?: string;
    readonly action?: string;
  }>;
}) {
  const { agencyId, action } = await searchParams;
  await requireSuperAdmin();

  const supabase = await createSupabaseServerClient();

  // 1. Fetch Agencies
  const { data: agenciesData } = await supabase
    .from("agencies")
    .select("*")
    .order("name", { ascending: true });

  const agencies = agenciesData ?? [];

  // 2. Fetch Audit Logs with filter
  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }

  if (action) {
    query = query.eq("action", action);
  }

  const { data: logsData } = await query;
  const logs = logsData ?? [];

  // 3. Fetch Registered User Accounts
  const userAccounts = await listUserAccounts();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:opacity-90 transition">
              <SipantauLogo size="sm" />
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800 uppercase tracking-wider">
                Akses Super Admin
              </span>
              <h1 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Pusat Kontrol & Pengawasan
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-brand-blue hover:underline"
            >
              Lihat Beranda Publik ↗
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-10">
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-900">
            Daftar & Verifikasi Instansi Pemerintah
          </h2>
          <AgencyManager agencies={agencies} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-900">
            Pendaftaran Admin Instansi
          </h2>
          <CreateAdminForm agencies={agencies} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-900">
            Daftar Akun & Email Administrator
          </h2>
          <UserAccountList accounts={userAccounts} />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Audit Log Sistem Terpusat
              </h2>
              <p className="text-xs text-slate-500">
                Log mutasi data otomatis tanpa izin edit/hapus
              </p>
            </div>

            {/* Filter form */}
            <form method="GET" className="flex items-center gap-2">
              <select
                name="agencyId"
                defaultValue={agencyId ?? ""}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
              >
                <option value="">Semua Instansi</option>
                {agencies.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name}
                  </option>
                ))}
              </select>

              <select
                name="action"
                defaultValue={action ?? ""}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
              >
                <option value="">Semua Aksi</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>

              <button
                type="submit"
                className="rounded-lg bg-brand-blue px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-brand-blue-hover transition"
              >
                Filter
              </button>
            </form>
          </div>

          <AuditLogViewer logs={logs} />
        </section>
      </main>
    </div>
  );
}
