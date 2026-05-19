"use client";

import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import BookCover from "@/components/BookCover";
import Icon from "@/components/Icon";
import EmptyState from "@/components/EmptyState";
import PageShell from "@/components/PageShell";
import Toast from "@/components/Toast";
import SkeletonGrid from "@/components/SkeletonGrid";
import {
  fetchBooks,
  fetchCartItems,
  fetchLibraries,
  getSelectedLibraryDb,
  paymentMethods,
  removeCartItemDb,
  saveCheckoutDraftDb,
  updateCartItemDb
} from "@/lib/supabase-store";
import { formatRupiah } from "@/lib/data";
import { checkoutDraftSchema, flattenZodErrors } from "@/lib/validation";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCartState] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [library, setLibrary] = useState(null);
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().slice(0, 10));
  const [pickupTime, setPickupTime] = useState("12:00");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState("");
  const [, startTransition] = useTransition();
  const [optimisticCart, updateOptimisticCart] = useOptimistic(cart, (state, action) => {
    if (action.type === "remove") return state.filter((item) => item.bookId !== action.bookId);
    if (action.type === "update") return state.map((item) => item.bookId === action.bookId ? { ...item, ...action.updates } : item);
    return state;
  });

  useEffect(() => {
    let mounted = true;

    async function loadCart() {
      const [cartRows, selectedLibrary, bookRows, libraryRows] = await Promise.all([
        fetchCartItems(),
        getSelectedLibraryDb(),
        fetchBooks(),
        fetchLibraries()
      ]);
      if (!mounted) return;
      setCartState(cartRows);
      setLibrary(selectedLibrary || libraryRows[0] || null);
      setAllBooks(bookRows);
      setLibraries(libraryRows);
      setLoading(false);
    }

    loadCart();
    return () => {
      mounted = false;
    };
  }, []);

  const cartDetails = useMemo(() => {
    return optimisticCart
      .map((item) => {
        const book = allBooks.find((entry) => entry.id === item.bookId);
        const itemLibrary = libraries.find((entry) => entry.id === item.libraryId);
        const availableStock = book && item.libraryId ? Number(book.libraryStocks?.[item.libraryId] || 0) : 0;
        const maxQty = Math.min(Math.max(availableStock, 0), 3);
        const effectiveQty = maxQty > 0 ? Math.min(Number(item.qty || 1), maxQty) : 0;
        return {
          ...item,
          qty: effectiveQty,
          rawQty: Number(item.qty || 1),
          availableStock,
          maxQty,
          book,
          library: itemLibrary
        };
      })
      .filter((item) => item.book);
  }, [optimisticCart, allBooks, libraries]);

  const subtotal = cartDetails.reduce((total, item) => total + (item.book?.price || 0) * (item.qty || 1), 0);
  const tax = Math.round(subtotal * 0.1);
  const selectedPayment = paymentMethods.find((method) => method.id === paymentMethod);
  const total = subtotal + tax + (selectedPayment?.admin || 0);

  async function handleRemove(bookId) {
    const previous = cart;
    startTransition(() => updateOptimisticCart({ type: "remove", bookId }));
    try {
      const next = await removeCartItemDb(bookId);
      setCartState(next);
      window.dispatchEvent(new Event("literago:cart"));
    } catch (error) {
      setCartState(previous);
      setToast(error?.message || "Gagal menghapus item keranjang.");
    }
  }

  async function handleUpdate(bookId, updates) {
    const previous = cart;
    startTransition(() => updateOptimisticCart({ type: "update", bookId, updates }));
    try {
      const next = await updateCartItemDb(bookId, updates);
      setCartState(next);
      window.dispatchEvent(new Event("literago:cart"));
    } catch (error) {
      setCartState(previous);
      setToast(error?.message || "Gagal memperbarui keranjang.");
    }
  }

  async function handleContinue() {
    if (!cartDetails.length) {
      setToast("Keranjang masih kosong.");
      return;
    }
    const unavailableItem = cartDetails.find((item) => item.availableStock <= 0);
    if (unavailableItem) {
      setToast(`${unavailableItem.book.title} sedang tidak tersedia di perpustakaan ini.`);
      return;
    }
    const overStockItem = cartDetails.find((item) => item.rawQty > item.maxQty);
    if (overStockItem) {
      setToast(`${overStockItem.book.title} hanya tersedia ${overStockItem.availableStock} pcs. Jumlah otomatis dibatasi.`);
      await handleUpdate(overStockItem.bookId, { qty: overStockItem.maxQty });
      setProcessing(false);
      return;
    }
    const hasReturnDate = cartDetails.every((item) => item.returnDate);
    if (!hasReturnDate || !pickupDate || !pickupTime || !paymentMethod) {
      setToast("Lengkapi tanggal pengembalian, waktu pengambilan, dan metode pembayaran.");
      return;
    }
    setProcessing(true);
    const payload = {
      items: cartDetails.map(({ book, library: itemLibrary, ...rest }) => rest),
      pickupDate,
      pickupTime,
      paymentMethod,
      libraryId: library?.id || cartDetails[0]?.libraryId
    };
    const parsed = checkoutDraftSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = flattenZodErrors(parsed);
      setToast(Object.values(fieldErrors)[0] || "Data checkout belum valid.");
      setProcessing(false);
      return;
    }
    try {
      await saveCheckoutDraftDb(parsed.data);
      router.push("/payment");
    } catch (error) {
      setProcessing(false);
      setToast(error?.message || "Gagal menyimpan checkout ke Supabase.");
    }
  }

  if (loading) {
    return (
      <PageShell>
        <SkeletonGrid title="Menyiapkan keranjang" count={4} />
      </PageShell>
    );
  }

  if (!cartDetails.length) {
    return (
      <PageShell>
        <EmptyState
          title="Keranjang masih kosong"
          description="Tambahkan item dari Homepage, Kategori, atau Detail Item sebelum menentukan tanggal peminjaman."
          actionHref="/kategori"
          actionLabel="Cari Item"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="section-block" style={{ marginTop: 0 }}>
        <span className="kicker">Your Cart</span>
        <h1 className="section-title">Pilih durasi / tanggal <span>peminjaman</span></h1>
        <p className="section-lead">Lengkapi return date, waktu pengambilan, dan metode pembayaran sebelum masuk ke payment gateway.</p>
      </section>

      <section className="cart-layout">
        <div className="panel-card">
          <div className="notice"><Icon name="mapPin" size={16} /> {library?.name || libraries[0]?.name || "Perpustakaan"}</div>
          <div className="cart-items">
            {cartDetails.map((item) => (
              <article className="cart-item" key={item.bookId}>
                <BookCover book={item.book} size="sm" />
                <div>
                  <h3>{item.book.title}</h3>
                  <p>{item.book.author}</p>
                  <div className="cart-item-fields">
                    <label className="form-group">
                      <span className="field-label">Return Date</span>
                      <input
                        className="input"
                        type="date"
                        value={item.returnDate || ""}
                        onChange={(event) => handleUpdate(item.bookId, { returnDate: event.target.value })}
                      />
                    </label>
                    <label className="form-group">
                      <span className="field-label">Jumlah</span>
                      <select
                        className="select"
                        value={item.qty || 1}
                        onChange={(event) => handleUpdate(item.bookId, { qty: Number(event.target.value) })}
                        disabled={item.maxQty <= 0}
                      >
                        {Array.from({ length: Math.max(item.maxQty, 1) }, (_, index) => index + 1).map((qty) => <option key={qty} value={qty}>{qty} pcs</option>)}
                      </select>
                    </label>
                    {item.availableStock > 0 ? (
                      <small className="field-help">Stok tersedia: {item.availableStock} pcs</small>
                    ) : (
                      <small className="field-error">Stok habis di perpustakaan ini</small>
                    )}
                    <button className="danger-btn small" onClick={() => handleRemove(item.bookId)}>Hapus</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel-card">
          <h2>Order Detail</h2>
          <div className="checkout-summary">
            {cartDetails.map((item) => (
              <div key={item.bookId}>
                <strong>{item.book.title} - {item.qty || 1}pcs</strong>
                <br />
                <span>Jangka waktu sampai: {item.returnDate || "DD/MM/YYYY"}</span>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: 18 }}>
            <label>Waktu Pengambilan</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input className="input" type="date" value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} />
              <input className="input" type="time" value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} />
            </div>
          </div>

          <h3>Metode Pembayaran:</h3>
          <div className="payment-methods">
            {paymentMethods.map((method) => (
              <label key={method.id} className={`payment-option ${paymentMethod === method.id ? "active" : ""}`}>
                <input type="radio" checked={paymentMethod === method.id} onChange={() => setPaymentMethod(method.id)} />
                <span>{method.label}</span>
              </label>
            ))}
          </div>

          <div className="total-line"><span>Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
          <div className="total-line"><span>Total + PPN/Admin</span><span>{formatRupiah(total)}</span></div>
          <button className="primary-btn full-width" onClick={handleContinue} disabled={processing}>
            {processing ? "Menyimpan..." : "LANJUTKAN"}
          </button>
          <Link className="secondary-btn full-width" href="/kategori" style={{ marginTop: 10 }}>Tambah Item Lagi</Link>
        </aside>
      </section>
      <Toast message={toast} type="error" />
    </PageShell>
  );
}
