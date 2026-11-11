import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AgencyYearSummary } from "@/components/agency-year-summary";
import { listAgencyProjectSchedules } from "@/server/models/projects";
import { listAgencyExpenseAmounts } from "@/server/models/expenses";
import { jakartaYearRange, summarizeYear } from "@/lib/year-summary";
import { todayInJakarta } from "@/lib/validation/delay-reports";
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

  const currentYear = Number(todayInJakarta().slice(0, 4));

  const [schedulesResult, statsResult, expensesResult] =
    profile.agency_id === null
      ? [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ]
      : await Promise.all([
          listAgencyProjectSchedules(supabase, profile.agency_id),
          supabase
            .from("project_stats")
            .select("project_id, is_completed, completed_at")
            .eq("agency_id", profile.agency_id)
            .is("archived_at", null),
          listAgencyExpenseAmounts(
            supabase,
            profile.agency_id,
            jakartaYearRange(currentYear)
          ),
        ]);

  const summaryError =
    schedulesResult.error ?? statsResult.error ?? expensesResult.error;

  if (summaryError !== null) {
    throw new Error(`Gagal memuat ringkasan tahunan: ${summaryError.message}`);
  }

  const statsByProject = new Map(
    (statsResult.data ?? []).map((stat) => [stat.project_id, stat])
  );

  const yearSummary = summarizeYear(
    currentYear,
    (schedulesResult.data ?? []).map((project) => {
      const stat = statsByProject.get(project.id);

      return {
        startDate: project.start_date,
        targetEndDate: project.target_end_date,
        budgetTotal: project.budget_total,
        isCompleted: stat?.is_completed ?? false,
        completedAt: stat?.completed_at ?? null,
      };
    }),
    (expensesResult.data ?? []).map((expense) => expense.amount)
  );

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

  const agencyName = agency?.name ?? "Tidak terafiliasi dengan instansi";
  const isVerified = agency?.verified === true;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <section className="rounded-xl bg-brand-blue p-6 text-white shadow-xs">
            <h2 className="text-xs font-semibold uppercase text-blue-50">
              Profil Instansi
            </h2>
            <p className="mt-2 text-lg font-bold text-white">{agencyName}</p>
            <div className="mt-3">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isVerified
                    ? "bg-brand-green text-slate-900"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isVerified ? "✓ Terverifikasi" : "Menunggu Verifikasi"}
              </span>
            </div>
            {!isVerified && (
              <p className="mt-2 text-xs text-blue-50">
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

        <div className="mt-6">
          <AgencyYearSummary summary={yearSummary} />
        </div>

        {citizenReportsResult !== null && (
          <div className="mt-6">
            <UnansweredReportsNotice
              reports={unansweredReports}
              now={Date.now()}
            />
          </div>
        )}
      </main>
    </div>
  );
}
