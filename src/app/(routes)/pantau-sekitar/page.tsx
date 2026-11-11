import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { RoadworksNearby } from "@/components/roadworks-nearby";
import { SipantauLogo } from "@/components/sipantau-logo";
import { projectCategoryFilterGroups } from "@/lib/project-categories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoadworkProjects } from "@/server/models/roadworks";

export const metadata: Metadata = {
  title:
    "PantauSekitar - Proyek dan Penutupan Jalan di Sekitar Anda | SIPANTAU",
  description:
    "Lacak perbaikan jalan, pembangunan jalan dan jembatan, galian kabel bawah tanah, acara yang menutup jalan, serta proyek pemerintah lain di sekitar Anda, lengkap dengan progres dan deadline-nya.",
};

export default async function PantauSekitarPage() {
  const roadworks = await getRoadworkProjects(
    await createSupabaseServerClient()
  );

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 text-slate-900">
      <div>
        <PublicHeader active="pantau-sekitar" />

        <section className="bg-brand-blue py-10 text-white sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                PantauSekitar
              </h1>
              <p className="mt-3 text-base leading-relaxed text-blue-50 sm:text-lg">
                Temui proses pengerjaan proyek-proyek pemerintah yang ada di sekitar anda dan ikut berpatisipasi dalam proses
                pengawasan 
              </p>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <RoadworksNearby
            projects={roadworks.projects}
            categoryGroups={projectCategoryFilterGroups(
              roadworks.projects.map((project) => project.category)
            )}
            loadFailed={roadworks.loadFailed}
          />
        </main>
      </div>

      <footer className="mt-4 border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4">
          <SipantauLogo size="sm" />
          <p className="mt-2">
            © 2026 SIPANTAU - Portal Transparansi Proyek Pemerintah RI.
          </p>
          <p className="text-slate-600">
            Lokasi dan jadwal berasal dari data instansi. Kondisi lalu lintas
            aktual bisa berbeda.
          </p>
        </div>
      </footer>
    </div>
  );
}
