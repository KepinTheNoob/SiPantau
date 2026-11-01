import type { ReactNode } from "react";
import { PanelNavbar } from "@/components/panel-navbar";
import { requireAdmin } from "@/server/auth";

export default async function AdminLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  const { profile, agency } = await requireAdmin();

  return (
    <>
      <PanelNavbar
        role={profile.role === "super_admin" ? "super_admin" : "admin"}
        agencyName={agency?.name ?? null}
      />
      {children}
    </>
  );
}
