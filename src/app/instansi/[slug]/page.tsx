import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/rupiah";

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: agency } = await supabase
    .from("agencies")
    .select("name, region")
    .eq("slug", slug)
    .eq("verified", true)
    .maybeSingle();

  if (agency === null) {
    return {
      title: "Instansi Tidak Ditemukan",
    };
  }

  return {
    title: `${agency.name} (${agency.region}) - Profil Instansi | KawalProyek`,
    description: `Daftar proyek dan realisasi pembangunan di bawah naungan ${agency.name}.`,
  };
}

export default async function AgencyDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: agency } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", slug)
    .eq("verified", true)
    .maybeSingle();

  if (agency === null) {
    notFound();
  }

  const { data: projectsData } = await supabase
    .from("project_stats")
    .select("*")
    .eq("agency_id", agency.id)
    .order("project_id", { ascending: false });

  const projects = projectsData ?? [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <div>
        <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-sm font-bold text-white">
                KP
              </span>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                KawalProyek
              </span>
            </Link>

            <Link
              href="/masuk"
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Masuk Pengelola
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 flex flex-col gap-8">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:underline">
              Beranda
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Instansi</span>
            <span>/</span>
            <span className="text-slate-800 font-semibold">{agency.name}</span>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-800">
                  ✓ Instansi Pemerintah Terverifikasi
                </span>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {agency.name}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Wilayah Kerja:{" "}
                  <span className="font-semibold">{agency.region}</span>
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center">
                <span className="text-xs text-slate-500 block">
                  Total Proyek Terdata
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {projects.length}
                </span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              Daftar Proyek {agency.name}
            </h2>

            {projects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
                Belum ada proyek yang dipublikasikan oleh instansi ini.
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {projects.map((p) => {
                  const progress = p.progress_percent ?? 0;
                  const spent = p.spent_total ?? 0;

                  return (
                    <article
                      key={p.project_id}
                      className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700 capitalize">
                            {p.status_waktu?.replace("_", " ") ?? "Tepat Waktu"}
                          </span>
                          <span>Target: {p.target_end_date}</span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-base">
                          <Link
                            href={`/proyek/${p.slug}`}
                            className="hover:text-slate-700"
                          >
                            {p.title}
                          </Link>
                        </h3>

                        <div className="mt-4">
                          <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                            <span>Progres Fisik</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-slate-900"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                          <div>
                            <span className="text-slate-500 block">
                              Total Pagu
                            </span>
                            <span className="font-semibold text-slate-900 font-mono">
                              {formatRupiah(p.budget_total)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">
                              Terealisasi
                            </span>
                            <span className="font-semibold text-slate-900 font-mono">
                              {formatRupiah(spent)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 border-t border-slate-100 pt-4">
                        <Link
                          href={`/proyek/${p.slug}`}
                          className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          Lihat Proyek →
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white py-8 mt-16 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-5xl px-4">
          <p>© 2026 KawalProyek - Portal Transparansi Proyek Pemerintah RI.</p>
        </div>
      </footer>
    </div>
  );
}
