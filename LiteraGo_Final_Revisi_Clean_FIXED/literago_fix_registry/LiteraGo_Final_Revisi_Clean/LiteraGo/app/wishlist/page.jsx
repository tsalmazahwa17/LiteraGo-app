"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BookCover from "@/components/BookCover";
import EmptyState from "@/components/EmptyState";
import PageShell from "@/components/PageShell";
import SkeletonGrid from "@/components/SkeletonGrid";
import Toast from "@/components/Toast";
import {
  addToCartDb,
  fetchBooks,
  fetchWishlistIds,
  getBookStock,
  getSelectedLibraryDb,
  getTotalStock,
  setWishlistDb,
  toggleWishlistDb
} from "@/lib/supabase-store";

export default function WishlistPage() {
  const [wishlistIds, setWishlistIds] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [filter, setFilter] = useState("Semua");
  const [library, setLibrary] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadWishlist() {
      const [ids, selectedLibrary, bookRows] = await Promise.all([fetchWishlistIds(), getSelectedLibraryDb(), fetchBooks()]);
      if (!mounted) return;
      setWishlistIds(ids);
      setLibrary(selectedLibrary);
      setAllBooks(bookRows);
      setLoading(false);
    }
    loadWishlist();
    return () => {
      mounted = false;
    };
  }, []);

  const wishlistBooks = useMemo(() => {
    const entries = wishlistIds.map((id) => allBooks.find((book) => book.id === id)).filter(Boolean);
    return entries.filter((book) => {
      const stock = library ? getBookStock(book, library.id) : getTotalStock(book);
      if (filter === "Tersedia") return stock > 0;
      if (filter === "Tidak Tersedia") return stock === 0;
      return true;
    });
  }, [wishlistIds, allBooks, filter, library]);

  async function handleRemove(bookId) {
    try {
      const next = await toggleWishlistDb(bookId);
      setWishlistIds(next);
      setToast("Item dihapus dari Wishlist.");
    } catch (error) {
      setToast(error?.message || "Gagal menghapus wishlist.");
    }
  }

  async function handleBorrow(book) {
    const targetLibrary = library || null;
    if (!targetLibrary) {
      setToast("Pilih perpustakaan terlebih dahulu.");
      return;
    }
    try {
      await addToCartDb(book.id, targetLibrary.id);
      window.dispatchEvent(new Event("literago:cart"));
      const next = wishlistIds.filter((id) => id !== book.id);
      await setWishlistDb(next);
      setWishlistIds(next);
      setToast("Item tersedia dan sudah masuk keranjang.");
    } catch (error) {
      setToast(error?.message || "Gagal memindahkan item ke keranjang.");
    }
  }

  if (loading) {
    return (
      <PageShell>
        <SkeletonGrid title="Menyiapkan wishlist item" count={4} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="section-block" style={{ marginTop: 0 }}>
        <span className="kicker">Wishlist</span>
        <h1 className="section-title">Simpan item yang belum tersedia atau ingin kamu baca nanti</h1>
        <div className="tabs">
          {["Semua", "Tersedia", "Tidak Tersedia"].map((item) => (
            <button key={item} className={`tab-btn ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </section>

      {wishlistBooks.length === 0 ? (
        <EmptyState
          title="Wishlist kosong"
          description="Item yang kamu simpan akan tampil di sini."
          actionHref="/kategori"
          actionLabel="Cari Item"
        />
      ) : (
        <div className="wishlist-list">
          {wishlistBooks.map((book) => {
            const stock = library ? getBookStock(book, library.id) : getTotalStock(book);
            const available = stock > 0;
            return (
              <article className="wishlist-item" key={book.id}>
                <BookCover book={book} size="sm" />
                <div>
                  <span className={`status-pill ${available ? "available" : "unavailable"}`}>{available ? `${stock} tersedia` : "Tidak Tersedia"}</span>
                  <h3>{book.title}</h3>
                  <p>{book.author}</p>
                  <p>{library?.name || "Perpustakaan belum dipilih"}</p>
                </div>
                <div className="row-actions">
                  {available ? (
                    <button className="primary-btn small" onClick={() => handleBorrow(book)}>Pinjam Sekarang</button>
                  ) : (
                    <Link className="secondary-btn small" href={`/book/${book.id}`}>Lihat Detail</Link>
                  )}
                  <button className="danger-btn small" onClick={() => handleRemove(book.id)}>Hapus</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Toast message={toast} />
    </PageShell>
  );
}
