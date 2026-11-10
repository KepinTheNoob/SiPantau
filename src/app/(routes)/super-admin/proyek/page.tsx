import type { Metadata } from "next";
import Link from "next/link";
import type { Database } from "@/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminServiceClient } from "@/server/admin-only/client";
import {
  findFilterCategory,
  projectCategoryFilterGroups,
} from "@/lib/project-categories";
import { ProjectCategoryFilter } from "@/components/project-category-filter";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export const metadata: Metadata = {
  title: "Daftar Proyek - Super Admin | SIPANTAU",
  description: "Daftar proyek seluruh instansi SIPANTAU",
};

export default async function SuperAdminProjectsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly createdBy?: string;
    readonly region?: string;
    readonly kategori?: string;
  }>;
}) {
  const { createdBy, region, kategori } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: agenciesData, error: agenciesError } = await supabase
    .from("agencies")
    .select("id, name, region")
    .order("name", { ascending: true });

  if (agenciesError !== null) {
    throw new Error(`Gagal memuat daftar instansi: ${agenciesError.message}`);
  }

  const projects: ProjectRow[] = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + 999);

    if (error !== null) {
      throw new Error(`Gagal memuat daftar proyek: ${error.message}`);
    }

    projects.push(...data);

    if (data.length < 1000) {
      break;
    }
  }

  const insertEvents: {
    readonly entity_id: string;
    readonly actor_id: string | null;
  }[] = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("entity_id, actor_id")
      .eq("entity", "projects")
      .eq("action", "INSERT")
      .order("created_at", { ascending: true })
      .range(from, from + 999);

    if (error !== null) {
      throw new Error(`Gagal memuat pembuat proyek: ${error.message}`);
    }

    insertEvents.push(...data);

    if (data.length < 1000) {
      break;
    }
  }

  const creatorByProjectId = new Map<string, string | null>();

  for (const event of insertEvents) {
    if (!creatorByProjectId.has(event.entity_id)) {
      creatorByProjectId.set(event.entity_id, event.actor_id);
    }
  }

  const creatorIds = new Set(
    [...creatorByProjectId.values()].filter(
      (actorId): actorId is string => actorId !== null
    )
  );

  const emailByCreatorId = new Map<string, string>();

  if (creatorIds.size > 0) {
    const adminClient = getAdminServiceClient();
    const perPage = 1000;

    for (let page = 1; ; page += 1) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error !== null) {
        throw new Error(
          `Gagal memuat identitas pembuat proyek: ${error.message}`
        );
      }

      for (const user of data.users) {
        if (creatorIds.has(user.id) && user.email !== undefined) {
          emailByCreatorId.set(user.id, user.email);
        }
      }

      if (
        creatorIds.size === emailByCreatorId.size ||
        data.users.length < perPage
      ) {
        break;
      }
    }
  }

  const agencyById = new Map(
    (agenciesData ?? []).map((agency) => [agency.id, agency])
  );

  const creatorOptions = [...creatorIds]
    .map((id) => ({ id, email: emailByCreatorId.get(id) ?? id }))
    .sort((left, right) => left.email.localeCompare(right.email));

  const regions = [
    ...new Set((agenciesData ?? []).map((agency) => agency.region)),
  ].sort((left, right) => left.localeCompare(right));

  const categoryGroups = projectCategoryFilterGroups(
    projects.map((project) => project.category)
  );

  const selectedCategory = findFilterCategory(categoryGroups, kategori);

  const filteredProjects = projects.filter((project) => {
    const projectCreator = creatorByProjectId.get(project.id) ?? "system";
    const projectRegion = agencyById.get(project.agency_id)?.region;

    return (
      (!createdBy || projectCreator === createdBy) &&
      (!region || projectRegion === region) &&
      (selectedCategory === undefined || project.category === selectedCategory)
    );
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Daftar Proyek</h2>
        <p className="mt-1 text-sm text-slate-600">
          Seluruh proyek dari berbagai instansi beserta pembuat dan wilayahnya.
        </p>
      </div>

      <form method="GET" className="flex flex-wrap items-center gap-2">
        <select
          name="createdBy"
          defaultValue={createdBy ?? ""}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
        >
          <option value="">Semua Pembuat</option>
          <option value="system">System</option>
          {creatorOptions.map((creator) => (
            <option key={creator.id} value={creator.id}>
              {creator.email}
            </option>
          ))}
        </select>

        <select
          name="region"
          defaultValue={region ?? ""}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
        >
          <option value="">Semua Wilayah</option>
          {regions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <ProjectCategoryFilter
          id="filter-kategori"
          name="kategori"
          groups={categoryGroups}
          defaultValue={selectedCategory ?? ""}
          selectClassName="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
          hideLabel
        />

        <button
          type="submit"
          className="rounded-lg bg-brand-blue px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover"
        >
          Filter
        </button>
      </form>

      {filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Tidak ada proyek yang cocok dengan filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Proyek
                </th>
                <th scope="col" className="px-4 py-3">
                  Instansi
                </th>
                <th scope="col" className="px-4 py-3">
                  Dibuat Oleh
                </th>
                <th scope="col" className="px-4 py-3">
                  Wilayah
                </th>
                <th scope="col" className="px-4 py-3">
                  Tanggal Dibuat
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((project) => {
                const agency = agencyById.get(project.agency_id);
                const creatorId = creatorByProjectId.get(project.id);

                return (
                  <tr key={project.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/proyek/${project.slug}`}
                        className="font-semibold text-slate-900 hover:text-brand-blue hover:underline"
                      >
                        {project.title}
                      </Link>
                      <span className="mt-0.5 block font-mono text-xs text-slate-500">
                        {project.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {agency?.name ?? "Instansi tidak tersedia"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {creatorId
                        ? (emailByCreatorId.get(creatorId) ??
                          `Akun ${creatorId.slice(0, 8)}...`)
                        : "System"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {agency?.region ?? "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {new Date(project.created_at).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          timeZone: "Asia/Jakarta",
                        }
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {project.archived_at === null ? "Aktif" : "Diarsipkan"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
