import { z } from "zod";

export const projectFormSchema = z.object({
  title: z
    .string()
    .min(3, "Judul proyek minimal 3 karakter.")
    .max(200, "Judul proyek maksimal 200 karakter."),
  slug: z
    .string()
    .min(3, "Slug minimal 3 karakter.")
    .max(100, "Slug maksimal 100 karakter.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-) tanpa spasi."
    ),
  description: z.string().min(10, "Deskripsi proyek minimal 10 karakter."),
  category: z.string().min(2, "Kategori proyek wajib dipilih atau diisi."),
  location_name: z.string().min(2, "Nama lokasi minimal 2 karakter."),
  budget_total: z.coerce
    .number()
    .int("Anggaran harus berupa bilangan bulat.")
    .min(0, "Anggaran tidak boleh negatif."),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal mulai harus YYYY-MM-DD."),
  target_end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal selesai harus YYYY-MM-DD."),
  lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  lng: z.coerce.number().min(-180).max(180).optional().nullable(),
});

export const updateProjectSchema = projectFormSchema.extend({
  projectId: z.string().uuid("ID proyek tidak valid."),
});

export const archiveProjectSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
});

/** Tahapan awal yang wajib diisi saat membuat proyek baru. */
export const initialLandmarksSchema = z
  .array(
    z.object({
      name: z
        .string()
        .trim()
        .min(3, "Nama tahapan minimal 3 karakter.")
        .max(150, "Nama tahapan maksimal 150 karakter."),
      weight: z.coerce
        .number()
        .int("Bobot harus berupa bilangan bulat.")
        .min(1, "Bobot tahapan minimal 1.")
        .max(100, "Bobot tahapan maksimal 100."),
    })
  )
  .min(1, "Minimal satu tahapan proyek wajib diisi.")
  .max(30, "Maksimal 30 tahapan saat membuat proyek.");
