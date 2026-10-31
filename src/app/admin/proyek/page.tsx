import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SipantauLogo } from "@/components/sipantau-logo";

export const metadata: Metadata = {
  title: "Daftar Proyek - Panel Admin | SIPANTAU",
  description: "Kelola proyek instansi pemerintah di portal SIPANTAU",
};

export default async function AdminProjectsPage() {
  const { profile, agency } = await requireAdmin();

  const supabase = await createSupabaseServerClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("agency_id", profile.agency_id ?? "")
    .order("created_at", { ascending: false });

  const projectList = projects ?? [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:opacity-90 transition">
              <SipantauLogo size="sm" />
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Link
                  href="/admin"
                  className="hover:text-brand-blue hover:underline"
                >
                  Dasbor
                </Link>
                <span>/</span>
                <span className="text-slate-800 font-semibold">Proyek</span>
              </div>
              <h1 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Manajemen Proyek
              </h1>
              <p className="text-xs text-slate-500">
                Instansi:{" "}
                <span className="font-semibold text-slate-700">
                  {agency?.name}
                </span>
              </p>
            </div>
          </div>

          <Link
            href="/admin/proyek/baru"
            className="rounded-lg bg-brand-blue px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
          >
            + Buat Proyek Baru
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {projectList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h2 className="text-base font-semibold text-slate-900">
              Belum ada proyek
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Mulai publikasikan proyek pembangunan atau pengadaan instansi Anda
              kepada publik.
            </p>
            <div className="mt-6">
              <Link
                href="/admin/proyek/baru"
                className="inline-flex items-center rounded-lg bg-brand-blue px-4 py-2 text-xs font-semibold text-white hover:bg-brand-blue-hover shadow-xs"
              >
                + Buat Proyek Pertama
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      Judul Proyek
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Kategori & Wilayah
                    </th>
                    <th scope="col" className="px-6 py-3 whitespace-nowrap">
                      Total Anggaran
                    </th>
                    <th scope="col" className="px-6 py-3 whitespace-nowrap">
                      Target Selesai
                    </th>
                    <th scope="col" className="px-6 py-3 whitespace-nowrap">
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right whitespace-nowrap"
                    >
                      Tindakan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectList.map((project) => {
                    const isArchived = project.archived_at !== null;

                    return (
                      <tr key={project.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          <div>
                            <Link
                              href={`/admin/proyek/${project.id}`}
                              className="hover:text-brand-blue hover:underline font-bold"
                            >
                              {project.title}
                            </Link>
                            <p className="text-xs text-slate-500 font-mono">
                              Slug: {project.slug}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div>{project.category}</div>
                          <div className="text-xs text-slate-400">
                            {project.location_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-800 font-semibold whitespace-nowrap">
                          Rp{" "}
                          {Number(project.budget_total).toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                          {project.target_end_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isArchived
                                ? "bg-slate-100 text-slate-700"
                                : "bg-brand-green-light text-brand-green border border-brand-green/20"
                            }`}
                          >
                            {isArchived ? "Diarsipkan" : "Aktif"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/proyek/${project.id}`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-blue/30 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-blue shadow-xs hover:bg-brand-blue-light hover:border-brand-blue transition whitespace-nowrap"
                          >
                            <span>Kelola & Tahapan</span>
                            <span aria-hidden="true">→</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
