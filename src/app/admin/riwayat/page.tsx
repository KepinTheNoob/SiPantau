import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditLogViewer } from "@/components/audit-log-viewer";

export const metadata: Metadata = {
  title: "Riwayat Audit Log - Panel Admin | SIPANTAU",
  description: "Riwayat mutasi data proyek dan anggaran instansi di SIPANTAU",
};

export default async function AdminAuditHistoryPage() {
  const { profile } = await requireAdmin();

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
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 flex flex-col gap-6">
        <div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Riwayat Audit Log Instansi
          </h1>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs text-xs text-slate-600">
          Semua penambahan, pengubahan, dan penghapusan data proyek, tahapan,
          serta realisasi belanja anggaran dicatat secara permanen tanpa dapat
          dimodifikasi.
        </div>

        <AuditLogViewer logs={logs} />
      </main>
    </div>
  );
}
