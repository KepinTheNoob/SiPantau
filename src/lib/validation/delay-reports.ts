import { z } from "zod";

/** Tanggal hari ini (zona Asia/Jakarta) dalam format YYYY-MM-DD. */
export function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date()
  );
}

export const delayReportFormSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
  reasonCategoryIds: z
    .array(z.coerce.number().int().positive())
    .min(1, "Pilih minimal satu jenis alasan keterlambatan.")
    .max(8, "Jenis alasan terlalu banyak."),
  reasonDetail: z
    .string()
    .trim()
    .min(20, "Uraian alasan minimal 20 karakter agar warga paham konteksnya.")
    .max(2000, "Uraian alasan maksimal 2000 karakter."),
  recoveryPlan: z
    .string()
    .trim()
    .min(20, "Rencana percepatan minimal 20 karakter.")
    .max(2000, "Rencana percepatan maksimal 2000 karakter."),
  revisedTargetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format target baru harus YYYY-MM-DD.")
    .refine(
      (value) => value > todayInJakarta(),
      "Target selesai baru harus setelah hari ini."
    ),
});
