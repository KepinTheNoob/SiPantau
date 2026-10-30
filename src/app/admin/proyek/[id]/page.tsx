import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAgencyAccess } from "@/server/auth";
import { ProjectNotFoundError } from "@/server/auth/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProjectEditForm } from "./project-edit-form";
import { LandmarkManager } from "./landmark-manager";
import { ExpenseManager } from "./expense-manager";
import { SipantauLogo } from "@/components/sipantau-logo";

export const metadata: Metadata = {
  title: "Kelola Proyek & Tahapan - Panel Admin | SIPANTAU",
  description: "Edit rincian proyek dan kelola landmark instansi di SIPANTAU",
};

export default async function AdminProjectDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;

  let access;

  try {
    access = await requireAgencyAccess(id);
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      notFound();
    }

    throw error;
  }

  const { project, agency } = access;
  const supabase = await createSupabaseServerClient();

  const { data: landmarksData } = await supabase
    .from("landmarks")
    .select("*")
    .eq("project_id", id)
    .order("position", { ascending: true });

  const landmarks = landmarksData ?? [];

  const { data: expensesData } = await supabase
    .from("expenses")
    .select("*")
    .eq("project_id", id)
    .order("spent_at", { ascending: false });

  const expenses = expensesData ?? [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/" className="hover:opacity-90 transition">
              <SipantauLogo size="sm" />
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link
                href="/admin"
                className="hover:text-brand-blue hover:underline"
              >
                Dasbor
              </Link>
              <span>/</span>
              <Link
                href="/admin/proyek"
                className="hover:text-brand-blue hover:underline"
              >
                Proyek
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-semibold truncate max-w-xs">
                {project.title}
              </span>
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {project.title}
            </h1>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {agency.name}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 flex flex-col gap-8">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Rincian & Informasi Proyek
          </h2>
          <ProjectEditForm project={project} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <LandmarkManager projectId={project.id} landmarks={landmarks} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <ExpenseManager
            projectId={project.id}
            budgetTotal={project.budget_total}
            expenses={expenses}
            landmarks={landmarks}
          />
        </section>
      </main>
    </div>
  );
}
