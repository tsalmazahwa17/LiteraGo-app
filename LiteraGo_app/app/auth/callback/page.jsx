"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { updateCurrentUser } from "@/lib/supabase-store";
import { setAuthCookie } from "@/lib/auth-cookie";

function buildProfile(authUser) {
  const metadata = authUser?.user_metadata || {};
  const email = authUser?.email || metadata.email || "";
  const fallbackName = email ? email.split("@")[0] : "Pengguna LiteraGo";

  return {
    id: authUser?.id,
    name: metadata.full_name || metadata.name || fallbackName,
    username: metadata.username || metadata.name || metadata.full_name || fallbackName,
    email,
    avatarUrl: metadata.avatar_url || metadata.picture || "",
    phone: "",
    birthDate: "",
    provider: authUser?.app_metadata?.provider || "supabase"
  };
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Menyelesaikan autentikasi Supabase...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function completeAuth() {
      if (!isSupabaseConfigured || !supabase) {
        setFailed(true);
        setMessage("Supabase belum dikonfigurasi, callback autentikasi belum bisa diproses.");
        return;
      }

      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        const errorDescription = searchParams.get("error_description") || searchParams.get("error");

        if (errorDescription) {
          const normalizedError = errorDescription.toLowerCase();
          if (normalizedError.includes("expired") || normalizedError.includes("invalid")) {
            setFailed(true);
            setMessage("Link verifikasi sudah pernah dipakai atau kedaluwarsa. Kalau kamu sudah bisa login, berarti email sudah terverifikasi. Silakan kembali ke halaman login.");
            return;
          }
          throw new Error(errorDescription);
        }

        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) {
            const normalizedError = error.message?.toLowerCase() || "";
            if (normalizedError.includes("expired") || normalizedError.includes("invalid")) {
              setFailed(true);
              setMessage("Link verifikasi sudah pernah dipakai atau kedaluwarsa. Kalau akun sudah bisa login, email kamu sudah terkonfirmasi.");
              return;
            }
            throw error;
          }
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            const normalizedError = error.message?.toLowerCase() || "";
            if (normalizedError.includes("expired") || normalizedError.includes("invalid")) {
              setFailed(true);
              setMessage("Link autentikasi sudah pernah dipakai atau kedaluwarsa. Silakan login ulang, atau kirim ulang reset password jika sedang mengganti kata sandi.");
              return;
            }
            throw error;
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data?.session;
        if (!session?.user) {
          throw new Error("Sesi autentikasi belum ditemukan. Pastikan Redirect URL Supabase mengarah ke /auth/callback.");
        }

        await updateCurrentUser(buildProfile(session.user));
        setAuthCookie();

        if (mounted) {
          const next = searchParams.get("next") || "/home";
          setMessage(next === "/reset-password" ? "Verifikasi reset berhasil. Mengarahkan ke halaman ubah kata sandi..." : "Autentikasi berhasil. Mengarahkan ke homepage...");
          router.replace(next.startsWith("/") ? next : "/home");
        }
      } catch (error) {
        if (mounted) {
          setFailed(true);
          setMessage(error?.message || "Autentikasi Supabase gagal diproses.");
        }
      }
    }

    completeAuth();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main className="auth-page">
      <section className="auth-card auth-callback-card">
        <Logo href="/" ariaLabel="Kembali ke landing page LiteraGo" />
        <div className={`callback-loader ${failed ? "failed" : ""}`}>{failed ? "!" : "✓"}</div>
        <h1>{failed ? "Autentikasi belum berhasil" : "Autentikasi LiteraGo"}</h1>
        <p className="auth-hint">{message}</p>
        {failed && (
          <div className="hero-actions" style={{ justifyContent: "center", marginTop: 18 }}>
            <Link className="primary-btn" href="/login">Kembali ke Login</Link>
            <Link className="secondary-btn" href="/forgot-password">Reset Kata Sandi</Link>
          </div>
        )}
      </section>
    </main>
  );
}
