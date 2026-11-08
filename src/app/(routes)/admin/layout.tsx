import type { ReactNode } from "react";
import { PanelNavbar } from "@/components/panel-navbar";
import { DelayReportPrompt } from "@/components/delay-report-prompt";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/server/auth";
import {
  listDelayReasonCategories,
  loadPendingDelayProjects,
} from "@/server/models/delay-reports";

export default async function AdminLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  const { profile, agency } = await requireAdmin();

  // Popup laporan keterlambatan hanya untuk admin instansi terverifikasi.
  const canReportDelays =
    profile.role === "admin" && agency !== null && agency.verified;

  const supabase = await createSupabaseServerClient();

  const [pendingDelays, { data: categories }] = canReportDelays
    ? await Promise.all([
        loadPendingDelayProjects(supabase, agency.id),
        listDelayReasonCategories(supabase),
      ])
    : [[], { data: [] }];

  return (
    <>
      <PanelNavbar
        role={profile.role === "super_admin" ? "super_admin" : "admin"}
        agencyName={agency?.name ?? null}
      />
      {children}
      <DelayReportPrompt
        projects={pendingDelays}
        categories={categories ?? []}
      />
    </>
  );
}
