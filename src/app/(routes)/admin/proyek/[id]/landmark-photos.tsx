"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/db/types";
import { ImageUploadForm } from "@/components/image-upload-form";
import { evidencePublicUrl } from "@/lib/storage-url";
import {
  deleteLandmarkImage,
  uploadLandmarkImages,
} from "@/server/controllers/landmark-images";

type LandmarkImageRow = Database["public"]["Tables"]["landmark_images"]["Row"];

/** Foto bukti pengerjaan satu tahapan (hanya admin instansi yang bisa menambah). */
export function LandmarkPhotos({
  projectId,
  landmarkId,
  landmarkName,
  photos,
}: {
  readonly projectId: string;
  readonly landmarkId: string;
  readonly landmarkName: string;
  readonly photos: readonly LandmarkImageRow[];
}) {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(photoId: string) {
    if (!window.confirm("Hapus foto bukti ini?")) {
      return;
    }

    setErrorMessage(null);

    const formData = new FormData();

    formData.append("projectId", projectId);
    formData.append("landmarkId", landmarkId);
    formData.append("imageId", photoId);

    startTransition(async () => {
      const result = await deleteLandmarkImage(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? "Gagal menghapus foto bukti.");

        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">
          Foto bukti pengerjaan ({photos.length})
        </p>
        <button
          type="button"
          aria-expanded={showUpload}
          onClick={() => setShowUpload((open) => !open)}
          className="min-h-11 cursor-pointer rounded-md px-2 text-xs font-semibold text-brand-blue hover:underline focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
          {showUpload ? "Tutup" : "Tambah foto bukti"}
        </button>
      </div>

      {errorMessage !== null && (
        <p role="alert" className="text-xs text-red-700">
          {errorMessage}
        </p>
      )}

      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <li key={photo.id} className="flex w-24 flex-col gap-1">
              <a
                href={evidencePublicUrl(photo.image_path)}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <img
                  src={evidencePublicUrl(photo.image_path)}
                  alt={photo.caption || `Foto bukti ${landmarkName}`}
                  width={96}
                  height={96}
                  loading="lazy"
                  className="h-24 w-24 rounded-md border border-slate-200 object-cover"
                />
              </a>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDelete(photo.id)}
                aria-label={`Hapus foto bukti ${photo.caption || landmarkName}`}
                className="min-h-11 cursor-pointer rounded text-xs font-semibold text-red-700 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
      )}

      {showUpload && (
        <ImageUploadForm
          hiddenFields={[
            { name: "projectId", value: projectId },
            { name: "landmarkId", value: landmarkId },
          ]}
          onUpload={uploadLandmarkImages}
          submitLabel="Unggah foto bukti"
          captionPlaceholder="Contoh: Pengecoran pilar 3 selesai"
        />
      )}
    </div>
  );
}
