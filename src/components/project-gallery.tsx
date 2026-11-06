import type { Database } from "@/db/types";
import { evidencePublicUrl } from "@/lib/storage-url";

type ProjectImageRow = Database["public"]["Tables"]["project_images"]["Row"];

/** Foto sampul besar di bagian atas detail proyek (gambar hero, tidak di-lazy load). */
export function ProjectCoverImage({
  image,
  projectTitle,
}: {
  readonly image: ProjectImageRow;
  readonly projectTitle: string;
}) {
  return (
    <figure className="-mx-6 -mt-6 mb-6 overflow-hidden rounded-t-xl sm:-mx-8 sm:-mt-8">
      <img
        src={evidencePublicUrl(image.image_path)}
        alt={image.caption || `Foto sampul ${projectTitle}`}
        width={1200}
        height={600}
        fetchPriority="high"
        className="aspect-[2/1] w-full bg-slate-100 object-cover"
      />
      {image.caption !== "" && (
        <figcaption className="px-6 pt-2 text-xs text-slate-600 sm:px-8">
          {image.caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Seluruh foto galeri proyek; tiap foto membuka ukuran penuh di tab baru. */
export function ProjectGallery({
  images,
  projectTitle,
}: {
  readonly images: readonly ProjectImageRow[];
  readonly projectTitle: string;
}) {
  return (
    <section
      aria-labelledby="project-gallery-title"
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
    >
      <h2
        id="project-gallery-title"
        className="text-lg font-bold text-slate-900"
      >
        Galeri Foto Proyek
      </h2>
      <p className="mt-1 text-xs text-slate-600">
        Foto dari instansi pelaksana. Ketuk foto untuk melihat ukuran penuh.
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <li key={image.id}>
            <a
              href={evidencePublicUrl(image.image_path)}
              target="_blank"
              rel="noreferrer"
              className="group block overflow-hidden rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <img
                src={evidencePublicUrl(image.image_path)}
                alt={image.caption || `Foto ${index + 1} ${projectTitle}`}
                width={320}
                height={240}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition group-hover:opacity-90"
              />
            </a>
            {image.caption !== "" && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                {image.caption}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

type LandmarkImageRow = Database["public"]["Tables"]["landmark_images"]["Row"];

/** Deretan foto bukti pengerjaan pada satu tahapan di halaman publik. */
export function LandmarkPhotoStrip({
  photos,
  landmarkName,
}: {
  readonly photos: readonly LandmarkImageRow[];
  readonly landmarkName: string;
}) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-slate-700">
        Foto bukti pengerjaan
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <a
              href={evidencePublicUrl(photo.image_path)}
              target="_blank"
              rel="noreferrer"
              className="block rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <img
                src={evidencePublicUrl(photo.image_path)}
                alt={
                  photo.caption ||
                  `Foto bukti ${index + 1} tahapan ${landmarkName}`
                }
                width={80}
                height={80}
                loading="lazy"
                className="h-20 w-20 rounded-md border border-slate-200 object-cover"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
