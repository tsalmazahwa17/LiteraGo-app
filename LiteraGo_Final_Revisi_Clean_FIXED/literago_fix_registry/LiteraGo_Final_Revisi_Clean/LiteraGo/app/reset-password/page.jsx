"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import Toast from "@/components/Toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { clearAuthCookie, setAuthCookie } from "@/lib/auth-cookie";
import { flattenZodErrors, resetPasswordSchema } from "@/lib/validation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      if (!isSupabaseConfigured || !supabase) {
        setToast("Supabase belum dikonfigurasi.");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data?.session?.user) {
        setAuthCookie();
        setReady(true);
      } else {
        clearAuthCookie();
        setToast("Sesi reset belum ditemukan. Buka halaman ini dari link reset yang dikirim ke email.");
      }
    }
    checkSession();
    return () => { mounted = false; };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});
    const formData = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword")
    });

    if (!parsed.success) {
      const fieldErrors = flattenZodErrors(parsed);
      setErrors(fieldErrors);
      setToast(Object.values(fieldErrors)[0] || "Input belum valid.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);

    if (error) {
      setToast(`Gagal memperbarui kata sandi: ${error.message}`);
      return;
    }

    setToast("Kata sandi berhasil diperbarui. Silakan login ulang.");
    await supabase.auth.signOut();
    clearAuthCookie();
    setTimeout(() => router.replace("/login"), 1200);
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <Logo href="/login" ariaLabel="Kembali ke halaman login" />
        <h1 style={{ margin: "18px 0 8px" }}>Buat Kata Sandi Baru</h1>
        <p className="auth-hint">Masukkan kata sandi baru setelah membuka link reset dari email.</p>
        <div className="form-group">
          <label htmlFor="password">Kata Sandi Baru</label>
          <input className="input" id="password" name="password" type="password" placeholder="Minimal 6 karakter" autoComplete="new-password" disabled={!ready} />
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Konfirmasi Kata Sandi</label>
          <input className="input" id="confirmPassword" name="confirmPassword" type="password" placeholder="Ulangi kata sandi baru" autoComplete="new-password" disabled={!ready} />
          {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
        </div>
        <button className="primary-btn full-width" disabled={loading || !ready}>
          {loading ? "Menyimpan..." : "UPDATE KATA SANDI"}
        </button>
        <p className="auth-footer">
          Link bermasalah? <Link className="link-text" href="/forgot-password">Kirim ulang reset password</Link>
        </p>
      </form>
      <Toast message={toast} type={toast.toLowerCase().includes("berhasil") ? "success" : "error"} />
    </main>
  );
}
