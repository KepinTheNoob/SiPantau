import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listUserAccounts } from "@/server/admin-only/accounts";
import { AgencyManager } from "./agency-manager";
import { CreateAdminForm } from "./create-admin-form";
import { UserAccountList } from "./user-account-list";
import {
  ProjectCompletionSummary,
  type RegionProjectSummary,
} from "@/components/project-completion-summary";

export const metadata: Metadata = {
  title: "Dashboard Super Admin - SIPANTAU",
  description:
    "Manajemen instansi, akun administrator, dan pengawasan audit log terpusat di SIPANTAU",
};

export default async function SuperAdminDashboardPage() {
  const { user, profile, agency } = await requireSuperAdmin();
  const supabase = await createSupabaseServerClient();

  const [userAccounts, agenciesResult, projectStatsResult] = await Promise.all([
    listUserAccounts(supabase),
    supabase.from("agencies").select("*").order("name", { ascending: true }),
    supabase
      .from("project_stats")
      .select("agency_id, archived_at, is_completed")
      .is("archived_at", null),
  ]);

  if (agenciesResult.error !== null) {
    throw new Error(
      `Gagal memuat daftar instansi: ${agenciesResult.error.message}`
    );
  }

  const agencies = agenciesResult.data;

  if (projectStatsResult.error !== null) {
    throw new Error(
      `Gagal memuat ringkasan proyek: ${projectStatsResult.error.message}`
    );
  }

  const projects = projectStatsResult.data ?? [];

  const completedProjects = projects.filter(
    (project) => project.is_completed
  ).length;

  const projectCountsByAgency = new Map<
    string,
    { total: number; completed: number }
  >();

  for (const project of projects) {
    const counts = projectCountsByAgency.get(project.agency_id) ?? {
      total: 0,
      completed: 0,
    };

    counts.total += 1;

    if (project.is_completed) {
      counts.completed += 1;
    }

    projectCountsByAgency.set(project.agency_id, counts);
  }

  const projectsByRegion = new Map<string, RegionProjectSummary>();

  for (const item of agencies) {
    const counts = projectCountsByAgency.get(item.id) ?? {
      total: 0,
      completed: 0,
    };

    const regionSummary = projectsByRegion.get(item.region) ?? {
      region: item.region,
      total: 0,
      completed: 0,
    };

    projectsByRegion.set(item.region, {
      region: item.region,
      total: regionSummary.total + counts.total,
      completed: regionSummary.completed + counts.completed,
    });
  }

  const regionSummaries = Array.from(projectsByRegion.values()).sort((a, b) =>
    a.region.localeCompare(b.region, "id")
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-900">
      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Dashboard Super Admin
        </h1>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-xs font-semibold uppercase text-slate-500">
              Profil Instansi
            </h2>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {agency?.name ?? "Tidak terafiliasi dengan instansi"}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Akses pengawasan seluruh instansi dan proyek.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-xs font-semibold uppercase text-slate-500">
              Informasi Akun
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {user.email}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Peran:{" "}
              <span className="font-semibold uppercase text-brand-blue">
                {profile.role}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-xs font-semibold uppercase text-slate-500">
              Cakupan Wilayah
            </h2>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {agency?.region ?? "-"}
            </p>
          </div>
        </section>

        <ProjectCompletionSummary
          completed={completedProjects}
          total={projects.length}
          regions={regionSummaries}
        />

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-900">
            Daftar & Verifikasi Instansi Pemerintah
          </h2>
          <AgencyManager agencies={agencies} />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Daftar Akun Admin
            </h2>
            <CreateAdminForm agencies={agencies} />
          </div>
          <UserAccountList accounts={userAccounts} agencies={agencies} />
        </section>
      </main>
    </div>
  );
}
