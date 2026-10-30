import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditLogViewer } from "@/components/audit-log-viewer";

export const metadata: Metadata = {
  title: "Riwayat Audit Log - Panel Admin",
  description: "Riwayat mutasi data proyek dan anggaran instansi",
};

export default async function AdminAuditHistoryPage() {
  const { profile, agency } = await requireAdmin();

  const supabase = await createSupabaseServerClient();

  const { data: logsData } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("agency_id", profile.agency_id ?? "")
    .order("created_at", { ascending: false })
    .limit(100);

  const logs = logsData ?? [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/admin" className="hover:underline">
              Dasbor
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Riwayat Mutasi</span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Riwayat Audit Log Instansi
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Instansi: <span className="font-semibold">{agency?.name}</span>
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 flex flex-col gap-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs text-xs text-slate-600">
          Semua penambahan, pengubahan, dan penghapusan data proyek, tahapan,
          serta realisasi belanja anggaran dicatat secara permanen tanpa dapat
          dimodifikasi.
        </div>

        <AuditLogViewer logs={logs} />
      </main>
    </div>
  );
}
