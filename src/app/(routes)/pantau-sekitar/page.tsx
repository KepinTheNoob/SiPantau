import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { RoadworksNearby } from "@/components/roadworks-nearby";
import { SipantauLogo } from "@/components/sipantau-logo";
import { ROAD_CATEGORIES } from "@/lib/project-categories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoadworkProjects } from "@/server/models/roadworks";

export const metadata: Metadata = {
  title:
    "PantauSekitar - Proyek dan Penutupan Jalan di Sekitar Anda | SIPANTAU",
  description:
    "Lacak perbaikan jalan, pembangunan jalan dan jembatan, galian kabel bawah tanah, serta acara yang menutup jalan, lengkap dengan progres dan deadline-nya.",
};

export default async function PantauSekitarPage() {
  const roadworks = await getRoadworkProjects(
    await createSupabaseServerClient()
  );

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 text-slate-900">
      <div>
        <PublicHeader active="pantau-sekitar" containerClassName="max-w-7xl" />

        <section className="border-b border-slate-200 bg-white py-10 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                PantauSekitar
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">
                Sebelum berangkat, cek jalan mana yang sedang dikerjakan atau
                ditutup di sekitar Anda, sampai kapan, dan sejauh apa
                progresnya.
              </p>
              <p className="mt-4 text-sm text-slate-600">
                Mencakup: {ROAD_CATEGORIES.join(", ")}.
              </p>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <RoadworksNearby
            projects={roadworks.projects}
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
