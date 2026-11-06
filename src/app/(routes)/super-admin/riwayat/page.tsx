import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditLogViewer } from "@/components/audit-log-viewer";

const AUDIT_LOG_PAGE_SIZE = 20;

export const metadata: Metadata = {
  title: "Riwayat Mutasi - Super Admin | SIPANTAU",
  description: "Riwayat mutasi data seluruh instansi di SIPANTAU",
};

export default async function SuperAdminAuditHistoryPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly agencyId?: string;
    readonly action?: string;
    readonly page?: string;
  }>;
}) {
  const { agencyId, action, page } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: agenciesData, error: agenciesError } = await supabase
    .from("agencies")
    .select("id, name")
    .order("name", { ascending: true });

  if (agenciesError !== null) {
    throw new Error(`Gagal memuat daftar instansi: ${agenciesError.message}`);
  }

  const parsedPage = Number(page);

  const requestedPage =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const fetchLogs = async (pageNumber: number) => {
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

    return query.range(
      (pageNumber - 1) * AUDIT_LOG_PAGE_SIZE,
      pageNumber * AUDIT_LOG_PAGE_SIZE - 1
    );
  };

  let {
    data: logsData,
    count,
    error: logsError,
  } = await fetchLogs(requestedPage);

  if (logsError !== null) {
    throw new Error(`Gagal memuat audit log: ${logsError.message}`);
  }

  const totalLogs = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalLogs / AUDIT_LOG_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  if (currentPage !== requestedPage) {
    ({ data: logsData, error: logsError } = await fetchLogs(currentPage));

    if (logsError !== null) {
      throw new Error(`Gagal memuat audit log: ${logsError.message}`);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          Riwayat Mutasi Seluruh Instansi
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Catatan perubahan data proyek, tahapan, dan realisasi anggaran.
        </p>
      </div>

      <form method="GET" className="flex flex-wrap items-center gap-2">
        <select
          name="agencyId"
          defaultValue={agencyId ?? ""}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
        >
          <option value="">Semua Instansi</option>
          {(agenciesData ?? []).map((agency) => (
            <option key={agency.id} value={agency.id}>
              {agency.name}
            </option>
          ))}
        </select>

        <select
          name="action"
          defaultValue={action ?? ""}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
        >
          <option value="">Semua Aksi</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>

        <button
          type="submit"
          className="rounded-lg bg-brand-blue px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover"
        >
          Filter
        </button>
      </form>

      <AuditLogViewer
        logs={logsData ?? []}
        currentPage={currentPage}
        totalPages={totalPages}
        agencyId={agencyId}
        action={action}
        basePath="/super-admin/riwayat"
      />
    </main>
  );
}
