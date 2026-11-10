import { z } from "zod";

export const citizenSignInSchema = z.object({
  email: z.string().trim().email("Format email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export const citizenSignUpSchema = z
  .object({
    nik: z
      .string()
      .trim()
      .regex(/^[0-9]{16}$/, "NIK harus terdiri dari 16 digit angka."),
    email: z.string().trim().email("Format email tidak valid."),
    password: z.string().min(8, "Kata sandi minimal 8 karakter."),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Konfirmasi kata sandi tidak sama.",
    path: ["passwordConfirm"],
  });
