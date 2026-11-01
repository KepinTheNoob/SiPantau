import type { ReactNode } from "react";
import { PanelNavbar } from "@/components/panel-navbar";
import { requireSuperAdmin } from "@/server/auth";

export default async function SuperAdminLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  await requireSuperAdmin();

  return (
    <>
      <PanelNavbar role="super_admin" agencyName={null} />
      {children}
    </>
  );
}
