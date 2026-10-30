import { z } from "zod";

export const citizenReportFormSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
  content: z
    .string()
    .min(10, "Laporan warga minimal 10 karakter.")
    .max(2000, "Laporan warga maksimal 2000 karakter."),
});

export const moderateReportSchema = z.object({
  reportId: z.string().uuid("ID laporan tidak valid."),
  projectId: z.string().uuid("ID proyek tidak valid."),
  status: z.enum(["approved", "rejected"]),
});
