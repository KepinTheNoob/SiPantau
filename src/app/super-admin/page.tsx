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
    readonly page?: string;
  }>;
}) {
  const { agencyId, action, page: rawPage } = await searchParams;
  await requireSuperAdmin();

  const currentPage = Math.max(1, Number(rawPage) || 1);
  const LOGS_PER_PAGE = 20;
  const offset = (currentPage - 1) * LOGS_PER_PAGE;

  const supabase = await createSupabaseServerClient();

  // 1. Fetch Agencies
  const { data: agenciesData } = await supabase
    .from("agencies")
    .select("*")
    .order("name", { ascending: true });

  const agencies = agenciesData ?? [];

  // 2. Fetch Audit Logs with filter and pagination
  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }

  if (action) {
    query = query.eq("action", action);
  }

  query = query.range(offset, offset + LOGS_PER_PAGE - 1);

  const { data: logsData, count: totalLogsCount } = await query;
  const logs = logsData ?? [];
  const totalCount = totalLogsCount ?? 0;
  const totalPages = Math.ceil(totalCount / LOGS_PER_PAGE);

  // 3. Fetch Registered User Accounts
  const userAccounts = await listUserAccounts();

  const buildPageUrl = (pageNumber: number): string => {
    const params = new URLSearchParams();

    if (agencyId) {
      params.set("agencyId", agencyId);
    }

    if (action) {
      params.set("action", action);
    }

    if (pageNumber > 1) {
      params.set("page", String(pageNumber));
    }

    const query = params.toString();

    return query !== "" ? `/super-admin?${query}` : "/super-admin";
  };

  const getVisiblePages = (
    current: number,
    total: number
  ): readonly (number | "...")[] => {
    if (total <= 7) {
      const pages: number[] = [];

      for (let i = 1; i <= total; i += 1) {
        pages.push(i);
      }

      return pages;
    }

    const pages: (number | "...")[] = [1];

    if (current > 3) {
      pages.push("...");
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    if (current < total - 2) {
      pages.push("...");
    }

    pages.push(total);

    return pages;
  };

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
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Audit Log Sistem Terpusat
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                  Total: {totalCount} log
                </span>
                {totalPages > 1 && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-brand-blue border border-blue-200">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                )}
              </div>
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

              {(agencyId || action) && (
                <Link
                  href="/super-admin"
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition shadow-xs"
                >
                  Reset
                </Link>
              )}
            </form>
          </div>

          <AuditLogViewer logs={logs} />

          {/* Kontrol Navigasi Pagination */}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-xs text-xs text-slate-600">
              <div>
                <span>
                  Menampilkan{" "}
                  <strong className="text-slate-900 font-semibold">
                    {offset + 1}
                  </strong>
                  -
                  <strong className="text-slate-900 font-semibold">
                    {Math.min(offset + LOGS_PER_PAGE, totalCount)}
                  </strong>{" "}
                  dari{" "}
                  <strong className="text-slate-900 font-semibold">
                    {totalCount}
                  </strong>{" "}
                  catatan log
                </span>
              </div>

              {totalPages > 1 && (
                <nav
                  aria-label="Navigasi halaman audit log"
                  className="flex items-center gap-1.5"
                >
                  {currentPage > 1 ? (
                    <Link
                      href={buildPageUrl(currentPage - 1)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition shadow-xs"
                    >
                      ← Sebelumnya
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-400">
                      ← Sebelumnya
                    </span>
                  )}

                  <div className="hidden sm:flex items-center gap-1">
                    {getVisiblePages(currentPage, totalPages).map((p, idx) => {
                      if (p === "...") {
                        return (
                          <span
                            key={`ellipsis-${idx}`}
                            className="px-2 text-slate-400"
                          >
                            ...
                          </span>
                        );
                      }

                      const isCurrent = p === currentPage;

                      if (isCurrent) {
                        return (
                          <span
                            key={p}
                            aria-current="page"
                            className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-bold text-white shadow-xs"
                          >
                            {p}
                          </span>
                        );
                      }

                      return (
                        <Link
                          key={p}
                          href={buildPageUrl(p)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition shadow-xs"
                        >
                          {p}
                        </Link>
                      );
                    })}
                  </div>

                  <span className="sm:hidden text-xs text-slate-500 font-medium px-1">
                    Halaman {currentPage} / {totalPages}
                  </span>

                  {currentPage < totalPages ? (
                    <Link
                      href={buildPageUrl(currentPage + 1)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue-light transition shadow-xs"
                    >
                      Selanjutnya →
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-400">
                      Selanjutnya →
                    </span>
                  )}
                </nav>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
