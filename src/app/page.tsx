import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/rupiah";
import {
  BUDGET_OVERRUN_THRESHOLD_PERCENT,
  PROJECTS_PER_PAGE,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Kawal Proyek - Portal Transparansi Proyek Pemerintah",
  description:
    "Pantau realisasi anggaran dan tahapan progres fisik proyek pembangunan instansi pemerintah secara terbuka dan transparan.",
  openGraph: {
    title: "Kawal Proyek - Transparansi Pembangunan Pemerintah",
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
    readonly minBudget?: string;
    readonly maxBudget?: string;
  }>;
}) {
  const { page: rawPage, status, minBudget, maxBudget } = await searchParams;
  const currentPage = Math.max(1, Number(rawPage) || 1);
  const offset = (currentPage - 1) * PROJECTS_PER_PAGE;

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("project_stats")
    .select("*, agencies (id, name, slug, region)", { count: "exact" });

  if (status) {
    query = query.eq("status_waktu", status);
  }

  if (minBudget) {
    const min = Number(minBudget);

    if (!Number.isNaN(min)) {
      query = query.gte("budget_total", min);
    }
  }

  if (maxBudget) {
    const max = Number(maxBudget);

    if (!Number.isNaN(max)) {
      query = query.lte("budget_total", max);
    }
  }

  const { data: statsData, count } = await query.range(
    offset,
    offset + PROJECTS_PER_PAGE - 1
  );

  const projects = statsData ?? [];
  const totalProjects = count ?? 0;
  const totalPages = Math.ceil(totalProjects / PROJECTS_PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <div>
        <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-sm font-bold text-white">
                KP
              </span>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                KawalProyek
              </span>
            </Link>

            <nav className="flex items-center gap-4">
              <Link
                href="/masuk"
                className="rounded border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                Masuk Pengelola
              </Link>
            </nav>
          </div>
        </header>

        <section className="border-b border-slate-200 bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Transparansi Proyek Pembangunan Pemerintah
              </h1>
              <p className="mt-4 text-base text-slate-600 sm:text-lg">
                Masyarakat berhak mengetahui setiap rupiah anggaran publik yang
                digunakan. Pantau tahapan landmark, bukti dokumentasi, dan
                kesesuaian anggaran proyek secara terbuka.
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
            <div>
              <label
                htmlFor="filter-status"
                className="block font-semibold text-slate-700 mb-1"
              >
                Status Waktu
              </label>
              <select
                id="filter-status"
                name="status"
                defaultValue={status ?? ""}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              >
                <option value="">Semua Status</option>
                <option value="tepat_waktu">Tepat Waktu</option>
                <option value="terlambat">Terlambat</option>
                <option value="selesai">Selesai</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-min"
                className="block font-semibold text-slate-700 mb-1"
              >
                Min. Anggaran (Rp)
              </label>
              <input
                id="filter-min"
                name="minBudget"
                type="number"
                placeholder="0"
                defaultValue={minBudget ?? ""}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="filter-max"
                className="block font-semibold text-slate-700 mb-1"
              >
                Maks. Anggaran (Rp)
              </label>
              <input
                id="filter-max"
                name="maxBudget"
                type="number"
                placeholder="5000000000"
                defaultValue={maxBudget ?? ""}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
              />
            </div>

            <div className="self-end flex items-center gap-2">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
              >
                Terapkan Filter
              </button>
              {(status || minBudget || maxBudget) && (
                <Link
                  href="/"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50"
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

                return (
                  <article
                    key={p.project_id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-xs transition hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                        {agency ? (
                          <Link
                            href={`/instansi/${agency.slug}`}
                            className="font-medium text-slate-700 hover:underline"
                          >
                            {agency.name}
                          </Link>
                        ) : (
                          <span>Instansi Terverifikasi</span>
                        )}
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 font-medium capitalize">
                          {p.status_waktu?.replace("_", " ") ?? "Tepat Waktu"}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                        <Link
                          href={`/proyek/${p.slug}`}
                          className="hover:text-slate-700"
                        >
                          {p.title}
                        </Link>
                      </h3>

                      <div className="mt-5">
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>Progres Fisik</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-900 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                        <div>
                          <span className="text-slate-500 block">
                            Total Anggaran
                          </span>
                          <span className="font-semibold text-slate-900 font-mono">
                            {formatRupiah(p.budget_total)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Terpakai</span>
                          <span className="font-semibold text-slate-900 font-mono">
                            {formatRupiah(spent)} ({spentPercent}%)
                          </span>
                        </div>
                      </div>

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

                    <div className="mt-6 border-t border-slate-100 pt-4">
                      <Link
                        href={`/proyek/${p.slug}`}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                      >
                        Lihat Tahapan & Rincian →
                      </Link>
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
                  href={`/?page=${currentPage - 1}`}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  ← Sebelumnya
                </Link>
              )}
              <span className="px-3 py-1.5 text-xs text-slate-600">
                Halaman {currentPage} dari {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/?page=${currentPage + 1}`}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Selanjutnya →
                </Link>
              )}
            </nav>
          )}
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white py-8 mt-16 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4">
          <p>© 2026 KawalProyek - Portal Transparansi Proyek Pemerintah RI.</p>
          <p className="mt-1">
            Data dipublikasikan secara terbuka untuk pengawasan publik demi
            akuntabilitas bersama.
          </p>
        </div>
      </footer>
    </div>
  );
}
