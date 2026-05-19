"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import Toast from "@/components/Toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { setAuthCookie } from "@/lib/auth-cookie";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  async function handleAdminLogin(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setToast("Email dan password admin wajib diisi.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setToast("Supabase belum dikonfigurasi.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setToast(`Login admin gagal: ${error.message}`);
      return;
    }

    const user = data?.user;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, username, name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setLoading(false);
      setToast(`Gagal cek role admin: ${profileError.message}`);
      return;
    }

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setLoading(false);
      setToast("Akun ini bukan admin. Set role akun menjadi admin di tabel profiles.");
      return;
    }

    setAuthCookie();
    setToast("Login admin berhasil.");

    setTimeout(() => {
      router.replace("/admin");
    }, 600);
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleAdminLogin} noValidate>
        <Logo href="/" ariaLabel="Kembali ke LiteraGo" />

        <div className="admin-login-badge">Admin Panel</div>

        <h1 className="admin-login-title">Masuk Admin</h1>

        <p className="auth-hint" style={{ marginBottom: 22 }}>
          Gunakan akun yang role-nya sudah diset sebagai admin di tabel profiles.
        </p>

        <div className="form-group">
          <label htmlFor="email">Email Admin</label>
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            placeholder="admin@literago.com"
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            placeholder="Minimal 6 karakter"
            autoComplete="current-password"
          />
        </div>

        <button className="primary-btn full-width" disabled={loading}>
          {loading ? "Memeriksa akses admin..." : "MASUK ADMIN"}
        </button>

        <p className="auth-footer">
          Masuk sebagai user?{" "}
          <Link className="link-text" href="/login">
            Login User
          </Link>
        </p>
      </form>

      <Toast
        message={toast}
        type={toast.includes("berhasil") ? "success" : "error"}
      />
    </main>
  );
}