"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import Toast from "@/components/Toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { updateCurrentUser } from "@/lib/supabase-store";
import { setAuthCookie } from "@/lib/auth-cookie";
import { flattenZodErrors, registerSchema } from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [errors, setErrors] = useState({});

  async function handleRegister(event) {
    event.preventDefault();
    setErrors({});
    const formData = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword")
    });

    if (!parsed.success) {
      const fieldErrors = flattenZodErrors(parsed);
      setErrors(fieldErrors);
      setToast(Object.values(fieldErrors)[0] || "Input belum valid.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setToast("Supabase belum dikonfigurasi. Isi .env.local dulu agar register email asli bisa berjalan.");
      return;
    }

    setLoading(true);
    const { username, email, password } = parsed.data;
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=/home`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: { name: username, username }
      }
    });

    if (error) {
      setLoading(false);
      setToast(`Register Supabase gagal: ${error.message}`);
      return;
    }

    if (data?.session) {
      await updateCurrentUser({
        id: data.user?.id,
        name: username,
        username,
        email,
        phone: "",
        birthDate: "",
        provider: "email"
      });
      setAuthCookie();
      setToast("Register berhasil. Akun baru sudah masuk dan terhubung ke Supabase.");
      setTimeout(() => router.replace("/home"), 750);
      return;
    }

    setToast("Register berhasil. Cek email kamu untuk konfirmasi akun, lalu login kembali.");
    setTimeout(() => router.replace("/login"), 1600);
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleRegister} noValidate>
        <Logo href="/login" ariaLabel="Kembali ke halaman login" />
        <div className="form-group">
          <label htmlFor="username">Nama / Username</label>
          <input className="input" id="username" name="username" type="text" placeholder="Masukkan nama atau username" autoComplete="name" />
          {errors.username && <p className="field-error">{errors.username}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" placeholder="email@domain.com" autoComplete="email" />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="password">Kata Sandi</label>
          <input className="input" id="password" name="password" type="password" placeholder="Minimal 6 karakter" autoComplete="new-password" />
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Konfirmasi Kata Sandi</label>
          <input className="input" id="confirmPassword" name="confirmPassword" type="password" placeholder="Ulangi kata sandi" autoComplete="new-password" />
          {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
        </div>
        <button className="primary-btn full-width" disabled={loading}>
          {loading ? "Mendaftarkan..." : "DAFTAR"}
        </button>
        <p className="auth-footer">
          Sudah punya akun? <Link className="link-text" href="/login">Masuk Disini</Link>
        </p>
      </form>
      <Toast message={toast} type={toast.includes("berhasil") ? "success" : "error"} />
    </main>
  );
}
