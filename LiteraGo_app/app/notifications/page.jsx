"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import PageShell from "@/components/PageShell";
import SkeletonGrid from "@/components/SkeletonGrid";
import { fetchNotifications } from "@/lib/supabase-store";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadNotifications() {
      const rows = await fetchNotifications();
      if (!mounted) return;
      setItems(rows);
      setLoading(false);
    }
    loadNotifications();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <PageShell>
        <SkeletonGrid title="Menyiapkan notifikasi" count={4} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="section-block" style={{ marginTop: 0 }}>
        <span className="kicker">Notifikasi</span>
        <h1 className="section-title">Pengingat <span>pengembalian</span></h1>
        <p className="section-lead">Untuk akun baru, notifikasi kosong. Pesan baru akan muncul setelah ada transaksi peminjaman atau pengingat jatuh tempo.</p>
      </section>

      {items.length === 0 ? (
        <EmptyState
          title="Belum ada notifikasi"
          description="Aktivitas seperti pembayaran berhasil dan pengingat pengembalian akan tampil di sini."
          actionHref="/kategori"
          actionLabel="Cari Item"
        />
      ) : (
        <div className="notification-list">
          {items.map((item) => (
            <article className="notification-item" key={item.id}>
              <div className="notification-icon"><Icon name={item.type === "due" ? "alert" : "bell"} size={24} /></div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <p style={{ color: "#be123c", marginTop: 4 }}>{item.date}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}
