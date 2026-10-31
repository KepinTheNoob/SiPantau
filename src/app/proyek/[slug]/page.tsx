import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/rupiah";
import { hitungProgres } from "@/lib/progress";
import { BUDGET_OVERRUN_THRESHOLD_PERCENT } from "@/lib/constants";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { ProjectMap } from "@/components/project-map";
import { CitizenReportSection } from "@/components/citizen-report-section";
import { SipantauLogo } from "@/components/sipantau-logo";
import { PublicHeader } from "@/components/public-header";

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: project } = await supabase
    .from("projects")
    .select("title, description, agencies(name)")
    .eq("slug", slug)
    .maybeSingle();

  if (project === null) {
    return {
      title: "Proyek Tidak Ditemukan",
    };
  }

  const agencyName = project.agencies?.name ?? "Pemerintah";

  return {
    title: `${project.title} - ${agencyName} | SIPANTAU`,
    description: project.description.slice(0, 160),
    openGraph: {
      title: project.title,
      description: project.description.slice(0, 160),
      type: "article",
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, agencies (id, name, slug, region)")
    .eq("slug", slug)
    .maybeSingle();

  if (project === null) {
    notFound();
  }

  const agency = project.agencies;

  if (agency === null) {
    notFound();
  }

  const { data: landmarksData } = await supabase
    .from("landmarks")
    .select("*")
    .eq("project_id", project.id)
    .order("position", { ascending: true });

  const landmarks = landmarksData ?? [];

  const { data: expensesData } = await supabase
    .from("expenses")
    .select("*")
    .eq("project_id", project.id)
    .order("spent_at", { ascending: false });

  const expenses = expensesData ?? [];

  const { data: reportsData } = await supabase
    .from("citizen_reports")
    .select("*")
    .eq("project_id", project.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const approvedReports = reportsData ?? [];

  const progressPercent = hitungProgres(landmarks);
  const spentTotal = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const budgetTotal = project.budget_total;
  const budgetForCalc = budgetTotal > 0 ? budgetTotal : 1;
  const spentPercent = Math.round((spentTotal / budgetForCalc) * 100);
  const remainingBudget = Math.max(0, budgetTotal - spentTotal);

  const isOverrun =
    spentPercent - progressPercent >= BUDGET_OVERRUN_THRESHOLD_PERCENT;

  const storageBaseUrl = `${getSupabaseUrl()}/storage/v1/object/public/evidence`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <div>
        <PublicHeader active={null} containerClassName="max-w-5xl" />

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 flex flex-col gap-8">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:text-brand-blue hover:underline">
              Beranda
            </Link>
            <span>/</span>
            <Link
              href={`/instansi/${agency.slug}`}
              className="hover:text-brand-blue hover:underline"
            >
              {agency.name}
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium truncate max-w-xs">
              {project.title}
            </span>
          </div>

          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <Link
                href={`/instansi/${agency.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-full px-3 py-1 hover:bg-brand-blue-light hover:text-brand-blue transition"
              >
                🏛️ {agency.name} ({agency.region})
              </Link>
              <span className="rounded-full bg-brand-blue-light px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
                Kategori: {project.category}
              </span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {project.title}
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              {project.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <div>
                Lokasi:{" "}
                <span className="font-semibold text-slate-800">
                  {project.location_name}
                </span>
              </div>
              <div>•</div>
              <div>
                Mulai:{" "}
                <span className="font-semibold text-slate-800">
                  {project.start_date}
                </span>
              </div>
              <div>•</div>
              <div>
                Target Selesai:{" "}
                <span className="font-semibold text-slate-800">
                  {project.target_end_date}
                </span>
              </div>
            </div>
          </article>

          {isOverrun && (
            <div
              role="alert"
              className="rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-xs text-amber-900"
            >
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span>⚠️</span> Peringatan Anomali Realisasi Anggaran
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Realisasi serapan anggaran proyek ini mencapai{" "}
                <strong>{spentPercent}%</strong>, sedangkan capaian progres
                fisik berbobot baru mencapai <strong>{progressPercent}%</strong>
                . Selisih serapan anggaran melebihi batas toleransi wajar (≥{" "}
                {BUDGET_OVERRUN_THRESHOLD_PERCENT}%).
              </p>
            </div>
          )}

          <section className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:col-span-1">
              <h2 className="text-xs font-semibold uppercase text-slate-500">
                Capaian Progres Fisik
              </h2>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-brand-green">
                  {progressPercent}%
                </span>
                <span className="text-xs text-slate-500">selesai</span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-green transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:col-span-2">
              <h2 className="text-xs font-semibold uppercase text-slate-500">
                Ringkasan Anggaran Proyek
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <span className="text-xs text-slate-500 block">
                    Total Pagu
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {formatRupiah(budgetTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">
                    Terealisasi ({spentPercent}%)
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {formatRupiah(spentTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">
                    Sisa Anggaran
                  </span>
                  <span className="text-sm font-bold text-brand-green font-mono">
                    {formatRupiah(remainingBudget)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6">
              Tahapan Pekerjaan (Landmarks)
            </h2>

            {landmarks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Belum ada data tahapan pekerjaan yang diunggah untuk proyek ini.
              </p>
            ) : (
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pl-6">
                {landmarks.map((lm, index) => {
                  const isDone = lm.done_at !== null || lm.done;

                  return (
                    <div key={lm.id} className="relative">
                      <span
                        className={`absolute -left-[35px] top-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isDone
                            ? "bg-brand-green text-white shadow-xs"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {isDone ? "✓" : index + 1}
                      </span>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900">
                              {lm.name}
                            </h3>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              Bobot {lm.weight}%
                            </span>
                            {isDone && (
                              <span className="rounded bg-brand-green-light px-2 py-0.5 text-xs font-semibold text-brand-green border border-brand-green/20">
                                Selesai
                              </span>
                            )}
                          </div>
                          {isDone && lm.done_at && (
                            <p className="text-xs text-slate-500 mt-1">
                              Diselesaikan pada:{" "}
                              {new Date(lm.done_at).toLocaleDateString("id-ID")}
                            </p>
                          )}
                        </div>

                        {lm.evidence_path && (
                          <div className="self-start sm:self-auto">
                            <a
                              href={`${storageBaseUrl}/${lm.evidence_path}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue/30 bg-white px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue-light shadow-xs transition"
                            >
                              📷 Bukti Dokumentasi ↗
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Peta Lokasi Proyek
            </h2>
            <ProjectMap
              lat={project.lat}
              lng={project.lng}
              title={project.title}
              locationName={project.location_name}
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <CitizenReportSection
              projectId={project.id}
              approvedReports={approvedReports}
            />
          </section>
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white py-8 mt-16 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-5xl px-4 flex flex-col items-center gap-2">
          <SipantauLogo size="sm" />
          <p className="mt-2">
            © 2026 SIPANTAU - Portal Transparansi Proyek Pemerintah RI.
          </p>
        </div>
      </footer>
    </div>
  );
}
