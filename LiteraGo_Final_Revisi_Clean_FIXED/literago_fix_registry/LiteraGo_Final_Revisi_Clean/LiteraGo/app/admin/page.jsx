"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";
import { clearAuthCookie } from "@/lib/auth-cookie";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { formatRupiah } from "@/lib/data";

const statusOptions = [
  "Lunas",
  "Diproses",
  "Siap Diambil",
  "Dipinjam",
  "Selesai",
  "Dibatalkan",
];

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function shortDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("orders");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  async function checkAdmin() {
    if (!isSupabaseConfigured || !supabase) {
      setToast("Supabase belum dikonfigurasi.");
      setLoading(false);
      return null;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return null;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email, username, name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || profile?.role !== "admin") {
      await supabase.auth.signOut();
      clearAuthCookie();
      router.replace("/admin/login");
      return null;
    }

    setAdmin(profile);
    return profile;
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from("borrowings")
      .select(
        `
        *,
        profiles (
          id,
          name,
          username,
          email,
          phone
        ),
        books (
          id,
          title,
          author,
          category,
          cover_url
        ),
        libraries (
          id,
          name,
          city,
          address
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      setToast(`Gagal memuat pesanan: ${error.message}`);
      setOrders([]);
      return;
    }

    setOrders(data || []);
  }

  async function loadStocks() {
    const { data, error } = await supabase
      .from("library_books")
      .select(
        `
        *,
        books (
          id,
          title,
          author,
          category,
          type
        ),
        libraries (
          id,
          name,
          city
        )
      `,
      )
      .order("updated_at", { ascending: false });

    if (error) {
      setToast(`Gagal memuat stok: ${error.message}`);
      setStocks([]);
      return;
    }

    setStocks(data || []);
  }

  async function loadUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, username, email, phone, role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setToast(`Gagal memuat user: ${error.message}`);
      setUsers([]);
      return;
    }

    setUsers(data || []);
  }

  async function loadDashboard() {
    setLoading(true);

    const profile = await checkAdmin();

    if (!profile) {
      setLoading(false);
      return;
    }

    await Promise.all([loadOrders(), loadStocks(), loadUsers()]);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const statusMatch =
        statusFilter === "Semua" ? true : order.status === statusFilter;

      const text = [
        order.id,
        order.code,
        order.status,
        order.profiles?.name,
        order.profiles?.username,
        order.profiles?.email,
        order.books?.title,
        order.libraries?.name,
      ]
        .join(" ")
        .toLowerCase();

      const queryMatch = query ? text.includes(query.toLowerCase()) : true;

      return statusMatch && queryMatch;
    });
  }, [orders, statusFilter, query]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;

    const activeOrders = orders.filter((item) =>
      ["Lunas", "Diproses", "Siap Diambil", "Dipinjam"].includes(item.status),
    ).length;

    const finishedOrders = orders.filter(
      (item) => item.status === "Selesai",
    ).length;

    const revenue = orders.reduce(
      (total, item) => total + Number(item.total || item.price || 0),
      0,
    );

    const lowStock = stocks.filter((item) => {
      const stock = Number(
        item.stock_available ?? item.stock ?? item.available_stock ?? 0,
      );

      return stock <= 2;
    }).length;

    return {
      totalOrders,
      activeOrders,
      finishedOrders,
      revenue,
      lowStock,
      users: users.length,
    };
  }, [orders, stocks, users]);

  async function updateOrderStatus(orderId, status) {
    const { error } = await supabase
      .from("borrowings")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      setToast(`Gagal update status: ${error.message}`);
      return;
    }

    setOrders((current) =>
      current.map((item) => (item.id === orderId ? { ...item, status } : item)),
    );

    setToast("Status pesanan berhasil diperbarui.");
  }

  async function updateStock(stockRow, value) {
    const stock = Number(value);

    if (Number.isNaN(stock) || stock < 0) {
      setToast("Stok harus angka minimal 0.");
      return;
    }

    const payload = {};

    if ("stock_available" in stockRow) {
      payload.stock_available = stock;
    } else if ("stock" in stockRow) {
      payload.stock = stock;
    } else if ("available_stock" in stockRow) {
      payload.available_stock = stock;
    } else {
      setToast("Kolom stok tidak ditemukan di tabel library_books.");
      return;
    }

    payload.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("library_books")
      .update(payload)
      .eq("id", stockRow.id);

    if (error) {
      setToast(`Gagal update stok: ${error.message}`);
      return;
    }

    setStocks((current) =>
      current.map((item) =>
        item.id === stockRow.id
          ? {
              ...item,
              ...payload,
            }
          : item,
      ),
    );

    setToast("Stok berhasil diperbarui.");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    clearAuthCookie();
    router.replace("/admin/login");
  }

  if (loading) {
    return (
      <main className="page-shell admin-shell">
        <div className="admin-loading-card">
          <h1>Memuat Admin Panel...</h1>
          <p>Mengambil pesanan, stok, user, dan pembayaran dari Supabase.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell admin-shell">
      <section className="admin-hero">
        <div>
          <span className="kicker">LiteraGo Admin</span>
          <h1 className="section-title">
            Monitoring <span>Peminjaman</span>
          </h1>
          <p className="section-lead">
            Panel admin untuk memantau pesanan user, status peminjaman, stok
            buku, dan akun yang terdaftar.
          </p>
        </div>

        <div className="admin-profile-card">
          <div className="admin-avatar">
            {(admin?.username || admin?.name || "A").slice(0, 1).toUpperCase()}
          </div>

          <div>
            <strong>{admin?.name || admin?.username || "Admin"}</strong>
            <p>{admin?.email}</p>
          </div>

          <button className="danger-btn small" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>

      <section className="admin-stats-grid">
        <article className="admin-stat-card">
          <span>Total Pesanan</span>
          <strong>{stats.totalOrders}</strong>
          <p>Semua transaksi</p>
        </article>

        <article className="admin-stat-card">
          <span>Pesanan Aktif</span>
          <strong>{stats.activeOrders}</strong>
          <p>Butuh pemantauan</p>
        </article>

        <article className="admin-stat-card">
          <span>Selesai</span>
          <strong>{stats.finishedOrders}</strong>
          <p>Peminjaman selesai</p>
        </article>

        <article className="admin-stat-card">
          <span>Revenue</span>
          <strong>{formatRupiah(stats.revenue)}</strong>
          <p>Total nilai transaksi</p>
        </article>

        <article className="admin-stat-card warning">
          <span>Stok Rendah</span>
          <strong>{stats.lowStock}</strong>
          <p>Stok ≤ 2</p>
        </article>

        <article className="admin-stat-card">
          <span>User</span>
          <strong>{stats.users}</strong>
          <p>Akun terdaftar</p>
        </article>
      </section>

      <section className="admin-tabs">
        {[
          ["orders", "Pesanan"],
          ["stock", "Stok Buku"],
          ["users", "User"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={activeTab === value ? "active" : ""}
            onClick={() => setActiveTab(value)}
          >
            {label}
          </button>
        ))}
      </section>

      {activeTab === "orders" && (
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Daftar Pesanan</h2>
              <p>Admin bisa melihat dan mengubah status peminjaman.</p>
            </div>

            <div className="admin-filter-row">
              <input
                className="input"
                placeholder="Cari kode, user, buku..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />

              <select
                className="select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>Semua</option>
                {statusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-order-list">
            {filteredOrders.length === 0 ? (
              <div className="admin-empty">
                <h3>Belum ada pesanan</h3>
                <p>Pesanan baru muncul setelah user checkout/payment.</p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                return (
                  <article className="admin-order-card" key={order.id}>
                    <div className="admin-order-top">
                      <div>
                        <span className="field-label">Kode Pesanan</span>
                        <h3>{order.code || order.id}</h3>
                        <p>
                          {formatDate(order.created_at || order.borrowed_at)} ·{" "}
                          {order.libraries?.name || "Perpustakaan"}
                        </p>
                      </div>

                      <select
                        className="select admin-status-select"
                        value={order.status || "Lunas"}
                        onChange={(event) =>
                          updateOrderStatus(order.id, event.target.value)
                        }
                      >
                        {statusOptions.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    <div className="admin-order-grid">
                      <div>
                        <span className="field-label">Peminjam</span>
                        <p>
                          <strong>
                            {order.profiles?.name ||
                              order.profiles?.username ||
                              "User"}
                          </strong>
                          <br />
                          {order.profiles?.email || "-"}
                          <br />
                          {order.profiles?.phone || "Nomor belum diisi"}
                        </p>
                      </div>

                      <div>
                        <span className="field-label">Buku</span>
                        <p>
                          <strong>
                            {order.books?.title || order.book_id || "-"}
                          </strong>
                          <br />
                          {order.books?.author || "-"}
                        </p>
                      </div>

                      <div>
                        <span className="field-label">Jadwal</span>
                        <p>
                          Ambil:{" "}
                          {shortDate(order.pickup_date || order.borrowed_at)}
                          <br />
                          Kembali:{" "}
                          {shortDate(order.return_date || order.due_at)}
                          <br />
                          Total: {formatRupiah(order.total || order.price || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="admin-order-actions">
                      <Link
                        className="secondary-btn small"
                        href={`/invoice?borrowing_id=${order.id}`}
                      >
                        Lihat Invoice
                      </Link>

                      <button
                        className="ghost-btn small"
                        onClick={() =>
                          updateOrderStatus(order.id, "Siap Diambil")
                        }
                      >
                        Tandai Siap Diambil
                      </button>

                      <button
                        className="primary-btn small"
                        onClick={() => updateOrderStatus(order.id, "Selesai")}
                      >
                        Tandai Selesai
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}

      {activeTab === "stock" && (
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Monitoring Stok</h2>
              <p>Admin bisa melihat dan mengubah stok buku per perpustakaan.</p>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Buku</th>
                  <th>Perpustakaan</th>
                  <th>Kategori</th>
                  <th>Stok</th>
                  <th>Update</th>
                </tr>
              </thead>

              <tbody>
                {stocks.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="admin-empty">
                        <h3>Belum ada data stok</h3>
                        <p>Data stok akan muncul dari tabel library_books.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  stocks.map((item) => {
                    const currentStock =
                      item.stock_available ??
                      item.stock ??
                      item.available_stock ??
                      0;

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.books?.title || item.book_id}</strong>
                          <br />
                          <span>{item.books?.author || "-"}</span>
                        </td>

                        <td>
                          {item.libraries?.name || item.library_id}
                          <br />
                          <span>{item.libraries?.city || "-"}</span>
                        </td>

                        <td>{item.books?.category || "-"}</td>

                        <td>
                          <input
                            className="input admin-stock-input"
                            type="number"
                            min="0"
                            defaultValue={currentStock}
                            onBlur={(event) =>
                              updateStock(item, event.target.value)
                            }
                          />
                        </td>

                        <td>{shortDate(item.updated_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "users" && (
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Data User</h2>
              <p>Akun yang terdaftar di LiteraGo.</p>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Telepon</th>
                  <th>Role</th>
                  <th>Terdaftar</th>
                </tr>
              </thead>

              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="admin-empty">
                        <h3>Belum ada user</h3>
                        <p>Data user akan muncul dari tabel profiles.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.name || user.username || "User"}</strong>
                        <br />
                        <span>{user.username || "-"}</span>
                      </td>

                      <td>{user.email || "-"}</td>
                      <td>{user.phone || "-"}</td>

                      <td>
                        <span
                          className={`admin-role-pill ${
                            user.role === "admin" ? "admin" : ""
                          }`}
                        >
                          {user.role || "user"}
                        </span>
                      </td>

                      <td>{shortDate(user.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Toast
        message={toast}
        type={toast.includes("Gagal") ? "error" : "success"}
      />
    </main>
  );
}
