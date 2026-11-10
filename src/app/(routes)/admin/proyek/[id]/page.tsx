import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAgencyAccess } from "@/server/auth";
import { ProjectNotFoundError } from "@/server/auth/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProjectEditForm } from "./project-edit-form";
import { LandmarkManager } from "./landmark-manager";
import { ExpenseManager } from "./expense-manager";
import { ProjectGalleryManager } from "./project-gallery-manager";
import { DelayReportManager } from "./delay-report-manager";
import { CitizenReportManager } from "./citizen-report-manager";
import { listProjectCitizenReports } from "@/server/models/citizen-reports";
import { toCitizenReportView } from "@/lib/citizen-reports";
import {
  findDelayOverview,
  listDelayReasonCategories,
  loadDelayReportViews,
} from "@/server/models/delay-reports";
import { todayInJakarta } from "@/lib/validation/delay-reports";
import { listProjectImages } from "@/server/models/project-images";
import { listLandmarkImages } from "@/server/models/landmark-images";

export const metadata: Metadata = {
  title: "Kelola Proyek & Tahapan - Panel Admin | SIPANTAU",
  description: "Edit rincian proyek dan kelola landmark instansi di SIPANTAU",
};

export default async function AdminProjectDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;

  let access;

  try {
    access = await requireAgencyAccess(id);
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      notFound();
    }

    throw error;
  }

  const { project, agency, profile } = access;
  const supabase = await createSupabaseServerClient();

  const { data: landmarksData } = await supabase
    .from("landmarks")
    .select("*")
    .eq("project_id", id)
    .order("position", { ascending: true });

  const landmarks = landmarksData ?? [];

  const { data: expensesData } = await supabase
    .from("expenses")
    .select("*")
    .eq("project_id", id)
    .order("spent_at", { ascending: false });

  const expenses = expensesData ?? [];

  const [
    { data: projectImagesData },
    { data: landmarkImagesData },
    { data: delayOverview },
    delayReports,
    { data: delayCategories },
    { data: citizenReportsData },
  ] = await Promise.all([
    listProjectImages(supabase, id),
    listLandmarkImages(
      supabase,
      landmarks.map((landmark) => landmark.id)
    ),
    findDelayOverview(supabase, id),
    loadDelayReportViews(supabase, id),
    listDelayReasonCategories(supabase),
    listProjectCitizenReports(supabase, id),
  ]);

  const citizenReports = (citizenReportsData ?? []).map(toCitizenReportView);

  const isCompleted =
    landmarks.length > 0 && landmarks.every((landmark) => landmark.done);

  const isLate = !isCompleted && todayInJakarta() > project.target_end_date;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/admin/proyek"
              className="text-xs font-semibold text-brand-blue hover:underline"
            >
              ← Kembali ke daftar proyek
            </Link>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {project.title}
            </h1>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {agency.name}
          </span>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Rincian & Informasi Proyek
          </h2>
          <ProjectEditForm project={project} />
        </section>

        {(isLate || delayReports.length > 0) && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <DelayReportManager
              projectId={project.id}
              agencyName={agency.name}
              originalTargetDate={project.target_end_date}
              effectiveTargetDate={
                delayOverview?.effective_target_date ?? project.target_end_date
              }
              isLate={isLate}
              needsNewReport={delayOverview?.needs_delay_report ?? false}
              categories={delayCategories ?? []}
              reports={delayReports}
            />
          </section>
        )}

        <section
          id="laporan-warga"
          className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
        >
          <CitizenReportManager
            projectId={project.id}
            agencyName={agency.name}
            reports={citizenReports}
            canReply={profile.role === "admin" && agency.verified}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <ProjectGalleryManager
            projectId={project.id}
            images={projectImagesData ?? []}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <LandmarkManager
            projectId={project.id}
            landmarks={landmarks}
            landmarkPhotos={landmarkImagesData ?? []}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <ExpenseManager
            projectId={project.id}
            budgetTotal={project.budget_total}
            expenses={expenses}
            landmarks={landmarks}
          />
        </section>
      </main>
    </div>
  );
}
