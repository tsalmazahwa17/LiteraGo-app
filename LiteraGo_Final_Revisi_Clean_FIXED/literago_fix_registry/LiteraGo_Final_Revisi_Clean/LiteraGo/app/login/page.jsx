"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import Toast from "@/components/Toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { updateCurrentUser } from "@/lib/supabase-store";
import { setAuthCookie } from "@/lib/auth-cookie";
import { flattenZodErrors, loginSchema } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [errors, setErrors] = useState({});
  const toastIsError = ["wajib", "gagal", "belum", "konfigurasi", "valid"].some((word) => toast.toLowerCase().includes(word));

  function getNextUrl() {
    if (typeof window === "undefined") return "/home";
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/home";
    return next.startsWith("/") ? next : "/home";
  }

  async function handleLogin(event) {
    event.preventDefault();
    setErrors({});
    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password")
    });

    if (!parsed.success) {
      const fieldErrors = flattenZodErrors(parsed);
      setErrors(fieldErrors);
      setToast(Object.values(fieldErrors)[0] || "Input belum valid.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setToast("Supabase belum dikonfigurasi. Isi .env.local dulu agar login email asli bisa berjalan.");
      return;
    }

    setLoading(true);
    const { email, password } = parsed.data;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setToast(`Login Supabase gagal: ${error.message}`);
      return;
    }

    const authUser = data?.user;
    await updateCurrentUser({
      id: authUser?.id,
      email,
      username: authUser?.user_metadata?.username || authUser?.user_metadata?.name || email.split("@")[0],
      name: authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || email.split("@")[0],
      phone: "",
      birthDate: "",
      provider: "email"
    });

    setAuthCookie();
    setToast("Login berhasil, data akun terhubung ke Supabase...");
    setTimeout(() => router.replace(getNextUrl()), 650);
  }

  async function handleGoogleLogin() {
    if (!isSupabaseConfigured || !supabase) {
      setToast("Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY terlebih dahulu.");
      return;
    }

    setGoogleLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=/home`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        scopes: "openid email profile",
        queryParams: { prompt: "select_account" }
      }
    });

    if (error) {
      setGoogleLoading(false);
      setToast(`Google login gagal: ${error.message}`);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleLogin} noValidate>
        <Logo href="/" ariaLabel="Kembali ke landing page LiteraGo" />
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" placeholder="Masukkan email" autoComplete="email" />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="password">Kata Sandi</label>
          <input className="input" id="password" name="password" type="password" placeholder="Masukkan kata sandi" autoComplete="current-password" />
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>
        <Link href="/forgot-password" className="link-text" style={{ display: "inline-block", marginBottom: 18 }}>
          Lupa kata sandi?
        </Link>
        <button className="primary-btn full-width" disabled={loading || googleLoading}>
          {loading ? "Memproses..." : "MASUK"}
        </button>
        <div className="auth-divider">atau</div>
        <button className="secondary-btn full-width oauth-btn" type="button" onClick={handleGoogleLogin} disabled={loading || googleLoading}>
          <img src="/google-g.svg" alt="" className="google-icon" />
          {googleLoading ? "Membuka pilihan akun Google..." : "Masuk dengan Google"}
        </button>
        <p className="auth-footer">
          Belum Punya Akun? <Link className="link-text" href="/register">Register Disini</Link>
        </p>
        <p className="auth-footer" style={{ marginTop: 8 }}>
          Masuk sebagai admin?{" "}
          <Link className="link-text" href="/admin/login">
            Login Admin
          </Link>
        </p>
      </form>
      <Toast message={toast} type={toastIsError ? "error" : "success"} />
    </main>
  );
}
