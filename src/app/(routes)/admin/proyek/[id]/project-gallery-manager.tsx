"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/db/types";
import { ImageUploadForm } from "@/components/image-upload-form";
import { evidencePublicUrl } from "@/lib/storage-url";
import {
  deleteProjectImage,
  setProjectCoverImage,
  uploadProjectImages,
} from "@/server/controllers/project-images";

type ProjectImageRow = Database["public"]["Tables"]["project_images"]["Row"];

export function ProjectGalleryManager({
  projectId,
  images,
}: {
  readonly projectId: string;
  readonly images: readonly ProjectImageRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function runImageAction(
    imageId: string,
    action: typeof setProjectCoverImage
  ) {
    setErrorMessage(null);

    const formData = new FormData();

    formData.append("projectId", projectId);
    formData.append("imageId", imageId);

    startTransition(async () => {
      const result = await action(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? "Aksi foto gagal.");

        return;
      }

      router.refresh();
    });
  }

  function handleDelete(image: ProjectImageRow) {
    const warning = image.is_cover
      ? "Hapus foto sampul ini? Foto lain akan otomatis dijadikan sampul."
      : "Hapus foto ini dari galeri?";

    if (window.confirm(warning)) {
      runImageAction(image.id, deleteProjectImage);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Galeri Foto Proyek
        </h2>
        <p className="text-sm text-slate-600">
          Foto sampul tampil di daftar proyek dan di bagian atas halaman publik.
          Foto pertama yang diunggah otomatis jadi sampul.
        </p>
      </div>

      {errorMessage !== null && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {errorMessage}
        </p>
      )}

      {images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          Belum ada foto. Unggah foto lokasi atau kondisi proyek di bawah.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image) => (
            <li
              key={image.id}
              className={`overflow-hidden rounded-lg border bg-white ${
                image.is_cover ? "border-brand-blue" : "border-slate-200"
              }`}
            >
              <div className="relative">
                <img
                  src={evidencePublicUrl(image.image_path)}
                  alt={image.caption || "Foto proyek"}
                  width={320}
                  height={240}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
                {image.is_cover && (
                  <span className="absolute left-2 top-2 rounded bg-brand-blue px-2 py-0.5 text-xs font-semibold text-white">
                    Sampul
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 p-2">
                {image.caption !== "" && (
                  <p className="line-clamp-2 text-xs text-slate-700">
                    {image.caption}
                  </p>
                )}
                <div className="flex gap-2">
                  {!image.is_cover && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runImageAction(image.id, setProjectCoverImage)
                      }
                      className="min-h-11 flex-1 cursor-pointer rounded-md border border-brand-blue/30 bg-white px-2 text-xs font-semibold text-brand-blue transition hover:bg-brand-blue-light active:bg-brand-blue/10 focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Jadikan sampul
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(image)}
                    className="min-h-11 flex-1 cursor-pointer rounded-md border border-red-200 bg-white px-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 active:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ImageUploadForm
        hiddenFields={[{ name: "projectId", value: projectId }]}
        onUpload={uploadProjectImages}
        submitLabel="Unggah ke galeri"
        captionPlaceholder="Contoh: Kondisi jalan sebelum pengaspalan"
      />
    </div>
  );
}
