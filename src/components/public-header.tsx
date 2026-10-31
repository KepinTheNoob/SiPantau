import Link from "next/link";
import { SipantauLogo } from "@/components/sipantau-logo";

export type PublicNavSection = "proyek" | "pantau-jalan";

const NAV_ITEMS: readonly {
  readonly section: PublicNavSection;
  readonly href: string;
  readonly label: string;
}[] = [
  { section: "proyek", href: "/", label: "Proyek" },
  { section: "pantau-jalan", href: "/pantau-jalan", label: "PantauJalan" },
];

/** Header halaman publik. `active` menandai menu halaman saat ini; null untuk halaman detail. */
export function PublicHeader({
  active,
  containerClassName,
}: {
  readonly active: PublicNavSection | null;
  readonly containerClassName: string;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-xs">
      <div
        className={`mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6 ${containerClassName}`}
      >
        <Link
          href="/"
          className="flex min-h-11 items-center rounded focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
          <SipantauLogo size="md" />
        </Link>

        <Link
          href="/masuk"
          className="rounded-lg border border-brand-blue/30 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-blue shadow-xs transition hover:bg-brand-blue-light focus:outline-none focus:ring-2 focus:ring-brand-blue sm:order-last"
        >
          Masuk Pengelola
        </Link>

        <nav
          aria-label="Menu utama"
          className="order-last flex w-full gap-1 sm:order-none sm:ml-auto sm:w-auto"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.section === active;

            return (
              <Link
                key={item.section}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-blue ${
                  isActive
                    ? "bg-brand-blue-light text-brand-blue"
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
