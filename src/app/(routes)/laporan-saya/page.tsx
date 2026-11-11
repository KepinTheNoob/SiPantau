import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { SipantauLogo } from "@/components/sipantau-logo";
import { CitizenReportCard } from "@/components/citizen-report-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCitizenReportsByReporter } from "@/server/models/citizen-reports";
import {
  hasAgencyReply,
  toCitizenReportView,
  type CitizenReportView,
} from "@/lib/citizen-reports";
import { CitizenSignInPrompt } from "./citizen-sign-in-prompt";
import { ShowMoreList } from "./show-more-list";

/** Jumlah laporan yang langsung tampil per seksi sebelum tombol "Tampilkan lainnya". */
const INITIAL_VISIBLE_REPORTS = 3;

export const metadata: Metadata = {
  title: "PantauLaporan - Laporan Saya | SIPANTAU",
  description:
    "Pantau laporan yang Anda kirim ke proyek pemerintah dan tanggapan tertulis dari instansi.",
};

type MyReport = {
  readonly report: CitizenReportView;
  readonly projectTitle: string | null;
  readonly projectSlug: string | null;
  readonly agencyName: string;
};

function ReportGroup({
  id,
  title,
  reports,
  emptyText,
}: {
  readonly id: string;
  readonly title: string;
  readonly reports: readonly MyReport[];
  readonly emptyText: string;
}) {
  return (
    <section aria-labelledby={id}>
      <h2
        id={id}
        className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900"
      >
        {title}
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          {reports.length}
        </span>
      </h2>

      {reports.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <ShowMoreList
          initialCount={INITIAL_VISIBLE_REPORTS}
          items={reports.map((item) => (
            <CitizenReportCard
              key={item.report.id}
              report={item.report}
              agencyName={item.agencyName}
              reporterLabel="Laporan Anda"
              link={
                item.projectSlug === null
                  ? undefined
                  : {
                      href: `/proyek/${item.projectSlug}`,
                      label: `Buka proyek ${item.projectTitle ?? ""}`,
                    }
              }
              context={
                <p
                  className={`mt-2 text-sm font-semibold ${
                    item.projectSlug === null
                      ? "text-slate-500"
                      : "text-slate-900"
                  }`}
                >
                  {item.projectTitle ?? "Proyek sudah tidak tersedia"}
                </p>
              }
            />
          ))}
        />
      )}
    </section>
  );
}

export default async function LaporanSayaPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows, error } =
    user === null
      ? { data: [], error: null }
      : await listCitizenReportsByReporter(supabase, user.id);

  const myReports: MyReport[] = (rows ?? []).map((row) => ({
    report: toCitizenReportView(row),
    projectTitle: row.projects?.title ?? null,
    projectSlug: row.projects?.slug ?? null,
    agencyName: row.projects?.agencies?.name ?? "Instansi",
  }));

  const ongoing = myReports.filter((item) => !hasAgencyReply(item.report));
  const processed = myReports.filter((item) => hasAgencyReply(item.report));

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 text-slate-900">
      <div>
        <PublicHeader active={null} />

        <section className="bg-brand-blue py-10 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              PantauLaporan
            </h1>
            <p className="mt-2 max-w-2xl text-base text-blue-50">
              Pantau laporan yang Anda kirim dan tanggapan tertulis dari
              instansi.
            </p>
          </div>
        </section>

        {/* Lebar halaman sama dengan menu lain; daftar laporan dibatasi agar baris teks tetap nyaman dibaca. */}
        <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 [&>*]:max-w-4xl">
          {user === null ? (
            <CitizenSignInPrompt />
          ) : error !== null ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"
            >
              Laporan Anda gagal dimuat. Muat ulang halaman untuk mencoba lagi.
            </p>
          ) : myReports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h2 className="text-base font-semibold text-slate-900">
                Anda belum mengirim laporan
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Buka halaman proyek lalu pilih &quot;Buat Laporan Warga&quot;
                untuk melaporkan kondisi di lapangan.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover"
              >
                Lihat daftar proyek
              </Link>
            </div>
          ) : (
            <>
              <ReportGroup
                id="laporan-ditanggapi"
                title="Sudah Ditanggapi"
                reports={processed}
                emptyText="Belum ada laporan Anda yang ditanggapi."
              />
              <ReportGroup
                id="laporan-menunggu"
                title="Menunggu Tanggapan"
                reports={ongoing}
                emptyText="Semua laporan Anda sudah ditanggapi instansi."
              />
            </>
          )}
        </main>
      </div>

      <footer className="mt-4 border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4">
          <SipantauLogo size="sm" />
          <p className="mt-2">
            © 2026 SIPANTAU - Portal Transparansi Proyek Pemerintah RI.
          </p>
        </div>
      </footer>
    </div>
  );
}
