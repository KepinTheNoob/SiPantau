import Link from "next/link";
import { SipantauLogo } from "@/components/sipantau-logo";
import { UserMenu } from "@/components/user-menu";
import { HeaderSignInButton } from "@/components/header-sign-in-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { panelHomeForRole } from "@/lib/panel-routes";
import { findProfileById } from "@/server/models/profiles";

export type PublicNavSection = "proyek" | "pantau-sekitar";

const NAV_ITEMS: readonly {
  readonly section: PublicNavSection;
  readonly href: string;
  readonly label: string;
}[] = [
  { section: "proyek", href: "/", label: "PantauProyek" },
  {
    section: "pantau-sekitar",
    href: "/pantau-sekitar",
    label: "PantauSekitar",
  },
];

/**
 * Header halaman publik. `active` menandai menu halaman saat ini; null untuk halaman detail.
 * Lebar dan padding sama di semua halaman supaya navbar tidak bergeser saat berpindah menu.
 * Status masuk hanya ditampilkan di sini: tombol "Masuk" (popup masuk/daftar warga) berganti menjadi menu akun.
 * PantauLaporan tidak ada di menu utama; warga membukanya dari menu akun setelah masuk.
 */
export async function PublicHeader({
  active,
}: {
  readonly active: PublicNavSection | null;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } =
    user === null ? { data: null } : await findProfileById(supabase, user.id);

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-xs">
      {/* Tautan lewati (WCAG 2.4.1): muncul saat difokus dengan keyboard. */}
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-brand-blue focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Lewati ke konten utama
      </a>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-h-11 items-center rounded focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
          <SipantauLogo size="md" />
        </Link>

        {user?.email !== undefined ? (
          <UserMenu
            email={user.email}
            panelHref={profile === null ? null : panelHomeForRole(profile.role)}
          />
        ) : (
          <HeaderSignInButton />
        )}

        <nav
          aria-label="Menu utama"
          className="order-last flex w-full gap-0.5 overflow-x-auto sm:order-none sm:ml-auto sm:w-auto sm:gap-1 sm:overflow-visible"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.section === active;

            return (
              <Link
                key={item.section}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-2 text-[13px] font-semibold sm:px-3 sm:text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-blue ${
                  isActive
                    ? "bg-brand-blue-light text-brand-blue-hover"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
