"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/EmptyState";
import Toast from "@/components/Toast";
import SkeletonGrid from "@/components/SkeletonGrid";
import {
  checkoutWithSupabase,
  fetchBooks,
  fetchLibraries,
  getCheckoutDraftDb,
  paymentMethods
} from "@/lib/supabase-store";
import { formatRupiah } from "@/lib/data";

export default function PaymentPage() {
  const router = useRouter();
  const [draft, setDraft] = useState(null);
  const [allBooks, setAllBooks] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast] = useState("");
  const toastIsError = toast.toLowerCase().includes("gagal") || toast.toLowerCase().includes("harus") || toast.toLowerCase().includes("habis");

  useEffect(() => {
    let mounted = true;

    async function loadPayment() {
      const [bookRows, libraryRows, checkoutDraft] = await Promise.all([fetchBooks(), fetchLibraries(), getCheckoutDraftDb()]);
      if (!mounted) return;
      setAllBooks(bookRows);
      setLibraries(libraryRows);
      setDraft(checkoutDraft);
      setPageLoading(false);
    }

    loadPayment();
    return () => {
      mounted = false;
    };
  }, []);

  const details = useMemo(() => {
    if (!draft) return null;
    const items = draft.items.map((item) => ({ ...item, book: allBooks.find((book) => book.id === item.bookId) })).filter((item) => item.book);
    const subtotal = items.reduce((total, item) => total + (item.book?.price || 0) * (item.qty || 1), 0);
    const tax = Math.round(subtotal * 0.1);
    const method = paymentMethods.find((entry) => entry.id === draft.paymentMethod) || paymentMethods[2];
    return {
      items,
      subtotal,
      tax,
      method,
      library: libraries.find((library) => library.id === draft.libraryId),
      total: subtotal + tax + method.admin
    };
  }, [draft, allBooks, libraries]);

  async function handlePay() {
    if (!draft || !details) return;
    setLoading(true);
    try {
      await checkoutWithSupabase(draft, details.method.label);
      setToast("Pembayaran berhasil. Stok database otomatis berkurang dan peminjaman tersimpan.");
      window.dispatchEvent(new Event("literago:cart"));
      setTimeout(() => router.push("/invoice"), 750);
    } catch (error) {
      setToast(error?.message || "Checkout gagal. Silakan periksa stok atau coba beberapa saat lagi.");
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <PageShell>
        <SkeletonGrid title="Menyiapkan payment gateway" count={4} />
      </PageShell>
    );
  }

  if (!draft || !details) {
    return (
      <PageShell>
        <EmptyState
          title="Belum ada transaksi"
          description="Silakan isi keranjang dan lanjutkan checkout terlebih dahulu."
          actionHref="/cart"
          actionLabel="Buka Keranjang"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="section-block" style={{ marginTop: 0 }}>
        <span className="kicker">Payment Gateway</span>
        <h1 className="section-title">Konfirmasi <span>peminjaman</span></h1>
        <p className="section-lead">
          Pastikan detail peminjaman sudah sesuai sebelum melanjutkan pembayaran. Stok akan diperbarui otomatis setelah transaksi berhasil.
        </p>
      </section>

      <section className="payment-layout">
        <div className="payment-gateway">
          <h2>{details.method.label}</h2>
          <p>{details.method.instruction}</p>
          <div className="va-box">
            <span className="field-label">Nomor Pembayaran</span>
            <div className="va-number">8808 2026 4040 7299</div>
            <p>Batas pembayaran: 24 jam setelah checkout.</p>
          </div>
          <div className="db-note">
            <strong>Catatan:</strong> transaksi hanya dapat diproses jika stok item masih tersedia di perpustakaan yang dipilih.
          </div>
          <div className="hero-actions">
            <button className="primary-btn" onClick={handlePay} disabled={loading}>
              {loading ? "Memproses Pembayaran..." : "BAYAR & KURANGI STOK"}
            </button>
            <Link className="secondary-btn" href="/cart">Kembali ke Cart</Link>
          </div>
        </div>

        <aside className="panel-card">
          <h2>Ringkasan Order</h2>
          <p><Icon name="mapPin" size={15} /> {details.library?.name}</p>
          <div className="checkout-summary" style={{ marginTop: 16 }}>
            {details.items.map((item) => (
              <div key={item.bookId}>
                <strong>{item.book.title}</strong>
                <br />
                <span>{item.qty} pcs · Return Date {item.returnDate}</span>
              </div>
            ))}
          </div>
          <div className="total-line"><span>Subtotal</span><span>{formatRupiah(details.subtotal)}</span></div>
          <div className="total-line"><span>PPN</span><span>{formatRupiah(details.tax)}</span></div>
          <div className="total-line"><span>Admin</span><span>{formatRupiah(details.method.admin)}</span></div>
          <div className="total-line"><span>Total</span><span>{formatRupiah(details.total)}</span></div>
        </aside>
      </section>
      <Toast message={toast} type={toastIsError ? "error" : "success"} />
    </PageShell>
  );
}
