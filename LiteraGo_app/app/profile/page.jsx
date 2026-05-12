"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import SkeletonGrid from "@/components/SkeletonGrid";
import Toast from "@/components/Toast";
import { fetchCurrentUser, updateCurrentUser } from "@/lib/supabase-store";
import { supabase } from "@/lib/supabase";
import { clearAuthCookie } from "@/lib/auth-cookie";
import { flattenZodErrors, profileSchema } from "@/lib/validation";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      const currentUser = await fetchCurrentUser();
      if (mounted) {
        setUser(currentUser);
        setLoading(false);
      }
    }
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});
    const formData = new FormData(event.currentTarget);
    const parsed = profileSchema.safeParse({
      username: formData.get("username") || user?.username || "",
      name: formData.get("name") || user?.name || "",
      email: formData.get("email") || user?.email || "",
      phone: formData.get("phone") || "",
      birthDate: formData.get("birthDate") || "",
      newPassword: formData.get("newPassword") || ""
    });

    if (!parsed.success) {
      const fieldErrors = flattenZodErrors(parsed);
      setErrors(fieldErrors);
      setToast(Object.values(fieldErrors)[0] || "Input belum valid.");
      return;
    }

    const { newPassword, ...profileData } = parsed.data;
    if (newPassword && supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setToast(`Gagal update password: ${error.message}`);
        return;
      }
    }

    try {
      const nextUser = await updateCurrentUser({ ...user, ...profileData });
      setUser(nextUser);
      window.dispatchEvent(new Event("literago:user"));
      setToast("Profil berhasil diperbarui.");
      setTimeout(() => setToast(""), 2500);
    } catch (error) {
      setToast(error?.message || "Gagal memperbarui profil.");
    }
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    clearAuthCookie();
    window.dispatchEvent(new Event("literago:user"));
    window.dispatchEvent(new Event("literago:cart"));
    router.replace("/login");
  }

  if (loading) {
    return (
      <PageShell>
        <SkeletonGrid title="Menyiapkan profil akun" count={3} />
      </PageShell>
    );
  }

  const displayName = user?.username || user?.name || "User";
  const displayEmail = user?.email || "Email belum diisi";
  const displayPhone = user?.phone || "Nomor telepon belum diisi";

  return (
    <PageShell>
      <section className="profile-hero">
        <div className="profile-user">
          <div className="profile-avatar">{displayName.slice(0, 1).toUpperCase()}</div>
          <div>
            <h1>Akun</h1>
            <h2>{displayName}</h2>
            <p>{displayEmail}<br />{displayPhone}</p>
          </div>
        </div>
        <button className="secondary-btn" type="button" onClick={handleLogout}>LOGOUT</button>
      </section>

      <section className="profile-layout">
        <div className="profile-card">
          <h2>Profil</h2>
          <p>Perubahan profil akan tersimpan ke akun kamu.</p>
          <form onSubmit={handleSubmit} style={{ marginTop: 18 }} noValidate>
            <div className="form-group">
              <label>Nickname</label>
              <input className="input" name="username" defaultValue={user?.username || ""} placeholder="Masukkan username" />
              {errors.username && <p className="field-error">{errors.username}</p>}
            </div>
            <div className="form-group">
              <label>Nama</label>
              <input className="input" name="name" defaultValue={user?.name || ""} placeholder="Masukkan nama lengkap" />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="input" name="email" type="email" defaultValue={user?.email || ""} placeholder="email@domain.com" readOnly />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>
            <div className="form-group">
              <label>Password Baru</label>
              <input className="input" name="newPassword" type="password" placeholder="Kosongkan jika tidak ingin mengganti" />
              {errors.newPassword && <p className="field-error">{errors.newPassword}</p>}
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input className="input" name="phone" defaultValue={user?.phone || ""} placeholder="Masukkan nomor telepon" />
              {errors.phone && <p className="field-error">{errors.phone}</p>}
            </div>
            <div className="form-group">
              <label>Tanggal Lahir</label>
              <input className="input" name="birthDate" type="date" defaultValue={user?.birthDate || ""} />
              {errors.birthDate && <p className="field-error">{errors.birthDate}</p>}
            </div>
            <button className="primary-btn full-width">UPDATE</button>
          </form>
        </div>
      </section>
      <Toast message={toast} type={toast.toLowerCase().includes("gagal") || toast.toLowerCase().includes("valid") ? "error" : "success"} />
    </PageShell>
  );
}
