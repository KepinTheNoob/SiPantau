import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProjectCompletionSummary } from "@/components/project-completion-summary";
import {
  UnansweredReportsNotice,
  type UnansweredReportItem,
} from "@/components/unanswered-reports-notice";
import { listAgencyCitizenReports } from "@/server/models/citizen-reports";

export const metadata: Metadata = {
  title: "Panel Admin Instansi - SIPANTAU",
  description: "Kelola proyek transparansi instansi pemerintah di SIPANTAU",
};

export default async function AdminDashboardPage() {
  const { user, profile, agency } = await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const projectStatsResult =
    profile.agency_id === null
      ? { data: [], error: null }
      : await supabase
          .from("project_stats")
          .select("archived_at, is_completed")
          .eq("agency_id", profile.agency_id)
          .is("archived_at", null);

  if (projectStatsResult.error !== null) {
    throw new Error(
      `Gagal memuat ringkasan proyek: ${projectStatsResult.error.message}`
    );
  }

  const projects = projectStatsResult.data ?? [];

  const citizenReportsResult =
    profile.agency_id === null
      ? null
      : await listAgencyCitizenReports(supabase, profile.agency_id);

  if (citizenReportsResult !== null && citizenReportsResult.error !== null) {
    throw new Error(
      `Gagal memuat laporan warga: ${citizenReportsResult.error.message}`
    );
  }

  // Urut dari laporan terlama: yang paling lama menunggu tampil paling atas.
  const unansweredReports: UnansweredReportItem[] = (
    citizenReportsResult?.data ?? []
  ).flatMap((report) =>
    report.citizen_report_replies.length > 0
      ? []
      : [
          {
            reportId: report.id,
            projectId: report.projects.id,
            projectTitle: report.projects.title,
            content: report.content,
            createdAt: report.created_at,
          },
        ]
  );

  const completedProjects = projects.filter(
    (project) => project.is_completed
  ).length;

  const agencyName = agency?.name ?? "Tidak terafiliasi dengan instansi";
  const isVerified = agency?.verified === true;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
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

        {citizenReportsResult !== null && (
          <div className="mt-6">
            <UnansweredReportsNotice
              reports={unansweredReports}
              now={Date.now()}
            />
          </div>
        )}

        <div className="mt-6">
          <ProjectCompletionSummary
            completed={completedProjects}
            total={projects.length}
          />
        </div>
      </main>
    </div>
  );
}
