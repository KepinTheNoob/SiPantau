import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/rupiah";
import {
  BUDGET_OVERRUN_THRESHOLD_PERCENT,
  PROJECTS_PER_PAGE,
} from "@/lib/constants";
import { SipantauLogo } from "@/components/sipantau-logo";
import { PublicHeader } from "@/components/public-header";
import { evidencePublicUrl } from "@/lib/storage-url";
import { listCoverImages } from "@/server/models/project-images";
import { listDelayOverviews } from "@/server/models/delay-reports";
import { formatIsoDate } from "@/lib/dates";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_DISPLAY,
  completionNote,
  parseProjectStatus,
} from "@/lib/project-status";
import { AgencyCombobox } from "@/components/agency-combobox";
import { listVerifiedAgencies } from "@/server/models/agencies";
import { listProjectCategories } from "@/server/models/projects";
import {
  findFilterCategory,
  projectCategoryFilterGroups,
} from "@/lib/project-categories";
import { ProjectCategoryFilter } from "@/components/project-category-filter";

export const metadata: Metadata = {
  title: "SIPANTAU - Portal Transparansi Proyek Pemerintah",
  description:
    "Pantau realisasi anggaran dan tahapan progres fisik proyek pembangunan instansi pemerintah secara terbuka dan transparan.",
  openGraph: {
    title: "SIPANTAU - Transparansi Pembangunan Pemerintah",
    description:
      "Pantau tahapan dan anggaran proyek pemerintah langsung dari data instansi resmi.",
    type: "website",
  },
};

export default async function HomePage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly page?: string;
    readonly status?: string;
    readonly anggaran?: string;
    readonly agency?: string;
    readonly kategori?: string;
  }>;
}) {
  const {
    page: rawPage,
    status,
    anggaran,
    agency: agencySlug,
    kategori,
  } = await searchParams;

  const currentPage = Math.max(1, Number(rawPage) || 1);
  const offset = (currentPage - 1) * PROJECTS_PER_PAGE;

  const supabase = await createSupabaseServerClient();

  const [{ data: agenciesData }, { data: categoryRows }] = await Promise.all([
    listVerifiedAgencies(supabase),
    listProjectCategories(supabase),
  ]);

  const agencies = agenciesData ?? [];

  const categoryGroups = projectCategoryFilterGroups(
    (categoryRows ?? []).map((row) => row.category)
  );

  const selectedCategory = findFilterCategory(categoryGroups, kategori);

  const selectedAgency = agencySlug
    ? (agencies.find((agency) => agency.slug === agencySlug) ?? null)
    : null;

  let query = supabase
    .from("project_stats")
    .select("*, agencies (id, name, slug, region)", { count: "exact" });

  const selectedStatus = PROJECT_STATUSES.find((value) => value === status);

  if (selectedStatus !== undefined) {
    query = query.eq("status_waktu", selectedStatus);
  }

  if (selectedCategory !== undefined) {
    query = query.eq("category", selectedCategory);
  }

  if (agencySlug) {
    // Slug yang tidak dikenal menghasilkan daftar kosong, bukan diam-diam diabaikan.
    query = query.eq(
      "agency_id",
      selectedAgency?.id ?? "00000000-0000-0000-0000-000000000000"
    );
  }

  // Urutan anggaran: "terendah" atau (bawaan) "tertinggi"; project_id menjaga urutan tetap stabil antarhalaman.
  const budgetOrder = anggaran === "terendah" ? "terendah" : "tertinggi";

  query = query
    .order("budget_total", { ascending: budgetOrder === "terendah" })
    .order("project_id", { ascending: true });

  const { data: statsData, count } = await query.range(
    offset,
    offset + PROJECTS_PER_PAGE - 1
  );

  const projects = statsData ?? [];

  const { data: coverData } =
    projects.length > 0
      ? await listCoverImages(
          supabase,
          projects.map((project) => project.project_id)
        )
      : { data: [] };

  const { data: delayData } =
    projects.length > 0
      ? await listDelayOverviews(
          supabase,
          projects.map((project) => project.project_id)
        )
      : { data: [] };

  const delayByProject = new Map(
    (delayData ?? []).map((overview) => [overview.project_id, overview])
  );

  const coverByProject = new Map(
    (coverData ?? []).map((cover) => [cover.project_id, cover])
  );

  const totalProjects = count ?? 0;
  const totalPages = Math.ceil(totalProjects / PROJECTS_PER_PAGE);

  // Link halaman ikut membawa filter yang sedang aktif.
  const pageHref = (targetPage: number): string => {
    const params = new URLSearchParams();

    for (const [key, value] of [
      ["status", selectedStatus],
      ["anggaran", anggaran === "terendah" ? "terendah" : undefined],
      ["agency", agencySlug],
      ["kategori", selectedCategory],
    ] as const) {
      if (value) {
        params.set(key, value);
      }
    }

    params.set("page", String(targetPage));

    return `/?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <div>
        <PublicHeader active="proyek" />

        <section className="bg-brand-blue py-12 text-white sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex rounded-full bg-brand-green px-3 py-1 text-xs font-semibold text-slate-900">
                Portal Resmi Transparansi Anggaran & Progres Fisik
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Pantau Proyek Pembangunan Pemerintah RI
              </h1>
              <p className="mt-4 text-base leading-relaxed text-blue-50 sm:text-lg">
                Masyarakat berhak mengetahui setiap rupiah anggaran publik yang
                digunakan. Pantau tahapan proyek, bukti verifikasi dokumentasi,
                dan kesesuaian anggaran belanja secara akuntabel.
              </p>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Daftar Proyek Aktif
              </h2>
              <p className="text-sm text-slate-500">
                Menampilkan {projects.length} dari {totalProjects} proyek
                pemerintah terverifikasi
              </p>
            </div>
          </div>

          <form
            method="GET"
            className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center gap-4 text-xs"
          >
            <AgencyCombobox
              agencies={agencies.map((agency) => ({
                slug: agency.slug,
                name: agency.name,
                region: agency.region,
              }))}
              name="agency"
              defaultSlug={agencySlug ?? ""}
              label="Instansi / Dinas"
            />

            <ProjectCategoryFilter
              id="filter-kategori"
              name="kategori"
              groups={categoryGroups}
              defaultValue={selectedCategory ?? ""}
              selectClassName="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-xs"
            />

            <div>
              <label
                htmlFor="filter-status"
                className="block font-semibold text-slate-700 mb-1"
              >
                Status Proyek
              </label>
              <select
                id="filter-status"
                name="status"
                defaultValue={selectedStatus ?? ""}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-xs"
              >
                <option value="">Semua status</option>
                {PROJECT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {PROJECT_STATUS_DISPLAY[value].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-anggaran"
                className="block font-semibold text-slate-700 mb-1"
              >
                Urutkan Anggaran
              </label>
              <select
                id="filter-anggaran"
                name="anggaran"
                defaultValue={budgetOrder}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-xs"
              >
                <option value="tertinggi">Tertinggi</option>
                <option value="terendah">Terendah</option>
              </select>
            </div>

            <div className="self-end flex items-center gap-2">
              <button
                type="submit"
                className="min-h-11 cursor-pointer rounded-lg bg-brand-blue px-4 font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
              >
                Terapkan Filter
              </button>
              {(selectedStatus !== undefined ||
                selectedCategory !== undefined ||
                budgetOrder === "terendah" ||
                agencySlug) && (
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  Reset
                </Link>
              )}
            </div>
          </form>

          {projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-16 text-center">
              <h3 className="text-base font-semibold text-slate-800">
                Belum ada proyek terpublikasi
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Proyek pembangunan yang dipublikasikan oleh instansi
                terverifikasi akan muncul di halaman ini.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => {
                const progress = p.progress_percent ?? 0;
                const spent = p.spent_total ?? 0;
                const budget = p.budget_total > 0 ? p.budget_total : 1;
                const spentPercent = Math.round((spent / budget) * 100);

                const isOverrun =
                  spentPercent - progress >= BUDGET_OVERRUN_THRESHOLD_PERCENT;

                const agency = p.agencies;
                const projectStatus = parseProjectStatus(p.status_waktu);
                const statusDisplay = PROJECT_STATUS_DISPLAY[projectStatus];

                const isDelayedOngoing =
                  projectStatus === "terlambat" && !p.is_completed;

                const cover = coverByProject.get(p.project_id);
                const delay = delayByProject.get(p.project_id);

                return (
                  <article
                    key={p.project_id}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-brand-blue/50 hover:shadow-md focus-within:ring-2 focus-within:ring-brand-blue"
                  >
                    <div>
                      {cover !== undefined && (
                        <img
                          src={evidencePublicUrl(cover.image_path)}
                          alt={cover.caption || `Foto sampul ${p.title}`}
                          width={480}
                          height={270}
                          loading="lazy"
                          className="-mx-6 -mt-6 mb-4 aspect-video w-[calc(100%+3rem)] max-w-none bg-slate-100 object-cover"
                        />
                      )}
                      <div className="mb-2 flex items-start justify-between gap-2 text-xs text-slate-500">
                        {agency ? (
                          <Link
                            href={`/instansi/${agency.slug}`}
                            className="relative z-10 font-medium text-slate-600 hover:text-brand-blue hover:underline"
                          >
                            {agency.name}
                          </Link>
                        ) : (
                          <span>Instansi Terverifikasi</span>
                        )}
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${statusDisplay.badgeClass}`}
                        >
                          {statusDisplay.label}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                        {/* Area klik judul diperluas menutupi seluruh kartu; link instansi tetap di atasnya (z-10). */}
                        <Link
                          href={`/proyek/${p.slug}`}
                          className="transition group-hover:text-brand-blue after:absolute after:inset-0 after:content-[''] focus:outline-none"
                        >
                          {p.title}
                        </Link>
                      </h3>

                      {isDelayedOngoing && (
                        <p className="mt-2 text-xs font-semibold text-red-700">
                          {delay?.latest_revised_target_date
                            ? `Target direvisi ke ${formatIsoDate(delay.latest_revised_target_date)}`
                            : "Belum ada penjelasan keterlambatan"}
                        </p>
                      )}

                      {p.is_completed && p.completed_at !== null && (
                        <p className="mt-2 text-xs font-semibold text-slate-700">
                          {completionNote(p.completed_at, p.target_end_date)}
                        </p>
                      )}

                      <div className="mt-5">
                        <div className="mb-1.5 flex items-baseline justify-between text-xs">
                          <span className="text-slate-500">Progres Fisik</span>
                          <span className="font-bold text-slate-900">
                            {progress}%
                          </span>
                        </div>
                        {/* Hijau = aksen tunggal di kartu: hanya untuk progres. */}
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-green transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <dl className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 text-xs">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <dt className="text-slate-500">Total Anggaran</dt>
                          <dd className="font-mono font-semibold text-slate-900">
                            {formatRupiah(p.budget_total)}
                          </dd>
                        </div>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          {/* Persentase disorot biru (sekunder); kuning bila realisasi mendahului progres. */}
                          <dt className="flex items-center gap-1.5 text-slate-500">
                            Terpakai
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                isOverrun
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-brand-blue-light text-brand-blue"
                              }`}
                            >
                              {spentPercent}%
                            </span>
                          </dt>
                          <dd className="font-mono font-semibold text-slate-900">
                            {formatRupiah(spent)}
                          </dd>
                        </div>
                      </dl>

                      {isOverrun && (
                        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                          <strong className="block font-semibold">
                            ⚠️ Perhatian Anggaran
                          </strong>
                          Realisasi anggaran ({spentPercent}%) mendahului
                          progres fisik ({progress}%) melampaui batas wajar.
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <nav
              aria-label="Navigasi halaman"
              className="mt-12 flex items-center justify-center gap-2"
            >
              {currentPage > 1 && (
                <Link
                  href={pageHref(currentPage - 1)}
                  className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  ← Sebelumnya
                </Link>
              )}
              <span className="px-3 py-1.5 text-xs text-slate-600">
                Halaman {currentPage} dari {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={pageHref(currentPage + 1)}
                  className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  Selanjutnya →
                </Link>
              )}
            </nav>
          )}
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white py-8 mt-16 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col items-center gap-2">
          <SipantauLogo size="sm" />
          <p className="mt-2">
            © 2026 SIPANTAU - Portal Transparansi Proyek Pemerintah RI.
          </p>
          <p className="text-slate-500">
            Data dipublikasikan secara terbuka untuk pengawasan publik demi
            akuntabilitas bersama.
          </p>
        </div>
      </footer>
    </div>
  );
}
