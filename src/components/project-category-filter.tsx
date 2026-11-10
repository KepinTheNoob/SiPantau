import type { ProjectCategoryGroup } from "@/lib/project-categories";

/** Select kategori untuk form filter GET; nilai kosong berarti semua kategori. */
export function ProjectCategoryFilter({
  id,
  name,
  groups,
  defaultValue,
  selectClassName,
  hideLabel = false,
}: {
  readonly id: string;
  readonly name: string;
  readonly groups: readonly ProjectCategoryGroup[];
  readonly defaultValue: string;
  readonly selectClassName: string;
  /** Label tetap terbaca pembaca layar; dipakai di form yang pilihannya sudah berlabel sendiri. */
  readonly hideLabel?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className={
          hideLabel ? "sr-only" : "mb-1 block font-semibold text-slate-700"
        }
      >
        Kategori
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className={selectClassName}
      >
        <option value="">Semua kategori</option>
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
