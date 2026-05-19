import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Format email belum valid."),
  password: z.string().min(6, "Kata sandi minimal 6 karakter.")
});

export const registerSchema = z
  .object({
    username: z.string().trim().min(2, "Nama/username minimal 2 karakter."),
    email: z.string().trim().email("Format email belum valid."),
    password: z.string().min(6, "Kata sandi minimal 6 karakter."),
    confirmPassword: z.string().min(6, "Konfirmasi kata sandi wajib diisi.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi belum sama."
  });

const optionalText = z.preprocess(
  (value) => (value === null || value === undefined ? "" : value),
  z.string().trim().optional()
);

export const profileSchema = z.object({
  username: z.preprocess(
    (value) => (value === null || value === undefined ? "" : value),
    z.string().trim().min(2, "Nickname minimal 2 karakter.")
  ),
  name: z.preprocess(
    (value) => (value === null || value === undefined ? "" : value),
    z.string().trim().min(2, "Nama minimal 2 karakter.")
  ),
  email: z.preprocess(
    (value) => (value === null || value === undefined ? "" : value),
    z.string().trim().email("Format email belum valid.")
  ),
  phone: optionalText,
  birthDate: optionalText,
  newPassword: optionalText
}).superRefine((data, ctx) => {
  if (data.newPassword && data.newPassword.length < 6) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["newPassword"], message: "Password baru minimal 6 karakter." });
  }
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Format email belum valid.")
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Kata sandi baru minimal 6 karakter."),
  confirmPassword: z.string().min(6, "Konfirmasi kata sandi wajib diisi.")
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Konfirmasi kata sandi belum sama."
});

export const checkoutDraftSchema = z.object({
  items: z.array(z.object({
    bookId: z.string().min(1),
    libraryId: z.string().min(1),
    qty: z.number().int().min(1).max(3),
    returnDate: z.string().min(1, "Tanggal pengembalian wajib diisi.")
  })).min(1, "Keranjang masih kosong."),
  pickupDate: z.string().min(1, "Tanggal pengambilan wajib diisi."),
  pickupTime: z.string().min(1, "Waktu pengambilan wajib diisi."),
  paymentMethod: z.string().min(1, "Metode pembayaran wajib dipilih."),
  libraryId: z.string().min(1)
});

export function flattenZodErrors(result) {
  if (result.success) return {};
  const formatted = result.error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(formatted).map(([key, value]) => [key, value?.[0] || "Input belum valid."])
  );
}
