import {
  OTHER_PROJECT_CATEGORIES,
  ROAD_CATEGORIES,
  ROAD_CATEGORY_HINTS,
  isKnownProjectCategory,
} from "@/lib/project-categories";

/** Pilihan kategori proyek untuk form admin (buat dan ubah proyek). */
export function ProjectCategorySelect({
  defaultValue,
  className,
}: {
  readonly defaultValue?: string;
  readonly className: string;
}) {
  const legacyCategory =
    defaultValue !== undefined &&
    defaultValue !== "" &&
    !isKnownProjectCategory(defaultValue)
      ? defaultValue
      : null;

  return (
    <select
      id="category"
      name="category"
      required
      defaultValue={defaultValue ?? ""}
      className={className}
    >
      <option value="">Pilih Kategori</option>
      <optgroup label="PantauJalanan (tampil di peta proyek jalan)">
        {ROAD_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}: {ROAD_CATEGORY_HINTS[category]}
          </option>
        ))}
      </optgroup>
      <optgroup label="Kategori lain">
        {OTHER_PROJECT_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </optgroup>
      {legacyCategory !== null && (
        <optgroup label="Kategori lama">
          <option value={legacyCategory}>
            {legacyCategory} (pilih kategori baru)
          </option>
        </optgroup>
      )}
    </select>
  );
}
