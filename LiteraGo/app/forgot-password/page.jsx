"use client";

import Link from "next/link";
import { useState } from "react";
import Logo from "@/components/Logo";
import Toast from "@/components/Toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { flattenZodErrors, forgotPasswordSchema } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [errors, setErrors] = useState({});

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});
    const formData = new FormData(event.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

    if (!parsed.success) {
      const fieldErrors = flattenZodErrors(parsed);
      setErrors(fieldErrors);
      setToast(Object.values(fieldErrors)[0] || "Input belum valid.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setToast("Supabase belum dikonfigurasi. Isi .env.local terlebih dahulu.");
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
    setLoading(false);

    if (error) {
      setToast(`Gagal mengirim email reset: ${error.message}`);
      return;
    }

    setToast("Link reset kata sandi sudah dikirim. Cek email kamu, lalu buka link tersebut.");
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <Logo href="/login" ariaLabel="Kembali ke halaman login" />
        <h1 style={{ margin: "18px 0 8px" }}>Lupa Kata Sandi</h1>
        <p className="auth-hint">Masukkan email akun LiteraGo. Link untuk membuat kata sandi baru akan dikirim ke email tersebut.</p>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" placeholder="email@domain.com" autoComplete="email" />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <button className="primary-btn full-width" disabled={loading}>
          {loading ? "Mengirim..." : "KIRIM LINK RESET"}
        </button>
        <p className="auth-footer">
          Ingat kata sandi? <Link className="link-text" href="/login">Kembali ke Login</Link>
        </p>
      </form>
      <Toast message={toast} type={toast.toLowerCase().includes("gagal") || toast.toLowerCase().includes("valid") ? "error" : "success"} />
    </main>
  );
}
