import { z } from "zod";

export const expenseFormSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
  landmarkId: z.string().uuid("ID landmark tidak valid.").optional().nullable(),
  amount: z.coerce
    .number()
    .int("Nominal pengeluaran harus berupa bilangan bulat.")
    .positive("Nominal pengeluaran harus lebih besar dari 0."),
  note: z.string().min(3, "Catatan pengeluaran minimal 3 karakter."),
  spent_at: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Format tanggal pengeluaran harus YYYY-MM-DD."
    )
    .optional(),
});

export const updateExpenseSchema = expenseFormSchema.extend({
  expenseId: z.string().uuid("ID pengeluaran tidak valid."),
});

export const deleteExpenseSchema = z.object({
  projectId: z.string().uuid("ID proyek tidak valid."),
  expenseId: z.string().uuid("ID pengeluaran tidak valid."),
});
