import type { ReactNode } from "react";
import {
  ArrowRightIcon,
  CheckIcon,
  PeopleIcon,
  TargetIcon,
} from "@/components/icons";
import { splitNarrativePoints } from "@/lib/narrative-points";

type PanelTone = "objective" | "impact";

const PANEL_STYLE: Readonly<
  Record<
    PanelTone,
    {
      readonly panel: string;
      readonly iconTile: string;
      readonly itemRing: string;
    }
  >
> = {
  objective: {
    // Tujuan netral; hijau (aksen) disimpan untuk dampak yang dirasakan warga.
    panel: "bg-slate-50",
    iconTile: "bg-slate-900 text-white shadow-slate-900/20",
    itemRing: "ring-slate-200",
  },
  impact: {
    panel: "bg-brand-green-light",
    iconTile: "bg-brand-green text-white shadow-brand-green/30",
    itemRing: "ring-brand-green/25",
  },
};

function ObjectiveMarker({ index }: { readonly index: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white"
    >
      {index + 1}
    </span>
  );
}

function ImpactMarker() {
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-green text-white"
    >
      <CheckIcon className="h-3.5 w-3.5" />
    </span>
  );
}

function NarrativePanel({
  tone,
  headingId,
  title,
  icon,
  points,
  emptyText,
}: {
  readonly tone: PanelTone;
  readonly headingId: string;
  readonly title: string;
  readonly icon: ReactNode;
  readonly points: readonly string[];
  readonly emptyText: string;
}) {
  const style = PANEL_STYLE[tone];

  const ListTag = tone === "objective" ? "ol" : "ul";

  return (
    <div className={`p-6 sm:p-8 ${style.panel}`}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md ${style.iconTile}`}
        >
          {icon}
        </span>
        <h2 id={headingId} className="text-base font-bold text-slate-900">
          {title}
        </h2>
      </div>

      {points.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-sm italic text-slate-500">
          {emptyText}
        </p>
      ) : (
        <ListTag aria-labelledby={headingId} className="mt-5 space-y-2.5">
          {points.map((point, index) => (
            <li
              key={`${index}-${point}`}
              className={`flex items-start gap-3 rounded-lg bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-700 shadow-xs ring-1 transition ${style.itemRing}`}
            >
              {tone === "objective" ? (
                <ObjectiveMarker index={index} />
              ) : (
                <ImpactMarker />
              )}
              <span className="pt-0.5">{point}</span>
            </li>
          ))}
        </ListTag>
      )}
    </div>
  );
}

/**
 * Tujuan dan dampak proyek untuk warga, ditampilkan sebagai daftar poin (satu baris = satu poin).
 * Selalu tampil: bila instansi belum mengisi, warga melihat keterangan itu secara terbuka
 * alih-alih section yang hilang diam-diam.
 */
export function ProjectObjectiveImpact({
  objective,
  impact,
  agencyName,
}: {
  readonly objective: string | null | undefined;
  readonly impact: string | null | undefined;
  readonly agencyName: string;
}) {
  return (
    <section
      aria-label="Tujuan dan dampak proyek"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
    >
      <div className="relative grid divide-y divide-white md:grid-cols-2 md:divide-x md:divide-y-0">
        <NarrativePanel
          tone="objective"
          headingId="objective-title"
          title="Tujuan"
          icon={<TargetIcon className="h-5 w-5" />}
          points={splitNarrativePoints(objective)}
          emptyText={`${agencyName} belum mengisi tujuan proyek ini.`}
        />

        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm md:flex"
        >
          <ArrowRightIcon className="h-4 w-4" />
        </span>

        <NarrativePanel
          tone="impact"
          headingId="impact-title"
          title="Dampak bagi Warga"
          icon={<PeopleIcon className="h-5 w-5" />}
          points={splitNarrativePoints(impact)}
          emptyText={`${agencyName} belum mengisi dampak proyek ini bagi warga.`}
        />
      </div>
    </section>
  );
}
