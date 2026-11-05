import { z } from "zod";

export const landmarkFormSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
  name: z
    .string()
    .min(3, "Nama tahapan (landmark) minimal 3 karakter.")
    .max(150, "Nama tahapan maksimal 150 karakter."),
  position: z.coerce
    .number()
    .int("Urutan posisi harus berupa bilangan bulat.")
    .min(0, "Urutan posisi minimal 0."),
  weight: z.coerce
    .number()
    .int("Bobot harus berupa bilangan bulat.")
    .min(1, "Bobot tahapan minimal 1 persen.")
    .max(100, "Bobot tahapan maksimal 100 persen."),
});

export const updateLandmarkSchema = landmarkFormSchema.extend({
  landmarkId: z.string().uuid("ID landmark tidak valid."),
});

export const deleteLandmarkSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
  landmarkId: z.string().uuid("ID landmark tidak valid."),
});

export const toggleLandmarkDoneSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
  landmarkId: z.string().uuid("ID landmark tidak valid."),
  done: z.enum(["true", "false"]),
});

export const reorderLandmarksSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
  orders: z.array(
    z.object({
      id: z.string().uuid("ID landmark tidak valid."),
      position: z.number().int().min(0),
    })
  ),
});
