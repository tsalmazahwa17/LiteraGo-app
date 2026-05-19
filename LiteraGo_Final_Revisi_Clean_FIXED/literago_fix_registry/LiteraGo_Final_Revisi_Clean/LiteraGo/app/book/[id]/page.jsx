"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import BookCover from "@/components/BookCover";
import Icon from "@/components/Icon";
import PageShell from "@/components/PageShell";
import Toast from "@/components/Toast";
import SkeletonGrid from "@/components/SkeletonGrid";
import {
  addToCartDb,
  fetchBookById,
  fetchLibraries,
  fetchWishlistIds,
  getBookStock,
  getSelectedLibraryDb,
  getTotalStock,
  toggleWishlistDb
} from "@/lib/supabase-store";
import { formatRupiah } from "@/lib/data";

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [book, setBook] = useState(null);
  const [library, setLibrary] = useState(null);
  const [libraries, setLibraries] = useState([]);
  const [toast, setToast] = useState("");
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDetail() {
      const [bookRow, selectedLibrary, libraryRows, wishlistIds] = await Promise.all([
        fetchBookById(params.id),
        getSelectedLibraryDb(),
        fetchLibraries(),
        fetchWishlistIds()
      ]);

      if (!mounted) return;
      setBook(bookRow);
      setLibrary(selectedLibrary || libraryRows[0] || null);
      setLibraries(libraryRows);
      setLiked(bookRow ? wishlistIds.includes(bookRow.id) : false);
      setLoading(false);
    }

    loadDetail();
    return () => {
      mounted = false;
    };
  }, [params.id]);

  const librariesAvailable = useMemo(() => {
    if (!book) return [];
    return book.libraryIds.map((id) => libraries.find((item) => item.id === id)).filter(Boolean);
  }, [book, libraries]);

  if (loading) {
    return (
      <PageShell>
        <SkeletonGrid title="Menyiapkan detail item" count={3} />
      </PageShell>
    );
  }

  if (!book) {
    return (
      <PageShell>
        <div className="empty-state">
          <div>
            <h1>Item tidak ditemukan</h1>
            <Link className="primary-btn" href="/kategori">Kembali ke Kategori</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const activeLibraryStock = library ? getBookStock(book, library.id) : 0;
  const availableHere = activeLibraryStock > 0;
  const totalStock = getTotalStock(book);

  async function handleAddToCart() {
    if (!availableHere || !library) {
      setToast("Stok item belum tersedia di perpustakaan aktif.");
      return;
    }
    setBusy(true);
    try {
      await addToCartDb(book.id, library.id);
      window.dispatchEvent(new Event("literago:cart"));
      setToast("Item masuk keranjang. Lanjut pilih durasi/tanggal peminjaman.");
      setTimeout(() => router.push("/cart"), 650);
    } catch (error) {
      setToast(error?.message || "Gagal memasukkan item ke keranjang.");
      if (String(error?.message || "").toLowerCase().includes("login")) {
        setTimeout(() => router.push("/login"), 900);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleWishlist() {
    setBusy(true);
    try {
      const next = await toggleWishlistDb(book.id);
      setLiked(next.includes(book.id));
      setToast(next.includes(book.id) ? "Item disimpan ke Wishlist." : "Item dihapus dari Wishlist.");
    } catch (error) {
      setToast(error?.message || "Gagal mengubah wishlist.");
      if (String(error?.message || "").toLowerCase().includes("login")) {
        setTimeout(() => router.push("/login"), 900);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <section className="detail-grid">
        <BookCover book={book} size="lg" />
        <div className="detail-info">
          <span className={`status-pill ${availableHere ? "available" : "unavailable"}`}>
            {availableHere ? `${activeLibraryStock} stok di perpustakaan aktif` : "Tidak tersedia di perpustakaan aktif"}
          </span>
          <h1>{book.title}</h1>

          <div className="detail-meta detail-meta-wide detail-meta-compact">
            <div><span>Penulis</span><strong>{book.author}</strong></div>
            <div><span>Penerbit</span><strong>{book.publisher}</strong></div>
            <div><span>Tanggal Terbit</span><strong>{book.publishDate}</strong></div>
            <div><span>ISBN</span><strong>{book.isbn}</strong></div>
            <div><span>Halaman</span><strong>{book.pages} halaman</strong></div>
            <div><span>Biaya Pinjam</span><strong>{formatRupiah(book.price)}</strong></div>
          </div>

          <p className="section-lead">
            Perpustakaan aktif: <strong>{library?.name || "Belum dipilih"}</strong>. Total stok semua perpustakaan: <strong>{totalStock}</strong> eksemplar.
          </p>

          <div className="hero-actions">
            <button className="primary-btn" onClick={handleAddToCart} disabled={!availableHere || busy}>
              {availableHere ? "Pilih Durasi / Tanggal Peminjaman" : "Stok Tidak Tersedia"}
            </button>
            <button className="secondary-btn" onClick={handleWishlist} disabled={busy}>
              <Icon name="heart" size={16} /> {liked ? "Hapus dari Wishlist" : "Simpan Wishlist"}
            </button>
            <Link className="ghost-btn" href="/kategori">Kembali</Link>
          </div>
        </div>
      </section>

      <section className="section-block">
        <h2 className="section-title">Ketersediaan di <span>perpustakaan</span></h2>
        <p className="section-lead">Pilih perpustakaan dengan stok tersedia untuk melanjutkan proses peminjaman.</p>
        <div className="library-list">
          {librariesAvailable.map((item) => {
            const stock = getBookStock(book, item.id);
            return (
              <article className="library-card" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p><Icon name="mapPin" size={15} /> {item.address}</p>
                  <p><Icon name="clock" size={15} /> {item.open} · ⭐ {item.rating} · {item.distance}</p>
                </div>
                <span className={`status-pill ${stock > 0 ? "available" : "unavailable"}`}>
                  {stock > 0 ? `${stock} stok tersedia` : "Stok kosong"}
                </span>
              </article>
            );
          })}
        </div>
      </section>
      <Toast message={toast} />
    </PageShell>
  );
}
