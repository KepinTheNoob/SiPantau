import { z } from "zod";
import { REPLY_MAX_LENGTH, REPLY_MIN_LENGTH } from "@/lib/citizen-reports";

export const citizenReportFormSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
  content: z
    .string()
    .trim()
    .min(10, "Laporan warga minimal 10 karakter.")
    .max(2000, "Laporan warga maksimal 2000 karakter."),
});

export const citizenReportReplySchema = z.object({
  reportId: z.string().uuid("ID laporan tidak valid."),
  projectId: z.string().uuid("ID proyek tidak valid."),
  body: z
    .string()
    .trim()
    .min(
      REPLY_MIN_LENGTH,
      `Tanggapan minimal ${REPLY_MIN_LENGTH} karakter supaya warga mendapat kejelasan.`
    )
    .max(REPLY_MAX_LENGTH, `Tanggapan maksimal ${REPLY_MAX_LENGTH} karakter.`),
});
