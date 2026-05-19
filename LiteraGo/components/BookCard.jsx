"use client";

import Link from "next/link";
import { useState } from "react";
import {
  addToCartDb,
  getBookStock,
  toggleWishlistDb
} from "@/lib/supabase-store";
import BookCover from "./BookCover";
import Icon from "./Icon";

export default function BookCard({ book, compact = false, onToast, library = null, liked = false, onWishlistChange }) {
  const [isLiked, setIsLiked] = useState(Boolean(liked));
  const [busy, setBusy] = useState(false);

  const selectedLibraryStock = library ? getBookStock(book, library.id) : book.stock;
  const stockAvailableAtSelectedLibrary = selectedLibraryStock > 0;

  async function handleAddToCart() {
    if (!library) {
      onToast?.("Pilih perpustakaan terlebih dahulu.");
      return;
    }
    if (!stockAvailableAtSelectedLibrary) {
      onToast?.("Stok item belum tersedia di perpustakaan aktif.");
      return;
    }
    setBusy(true);
    try {
      const nextCart = await addToCartDb(book.id, library.id);
      window.dispatchEvent(new Event("literago:cart"));
      onToast?.(`${book.title} ditambahkan ke keranjang. Total item: ${nextCart.reduce((total, item) => total + (item.qty || 1), 0)}.`);
    } catch (error) {
      onToast?.(error?.message || "Gagal menambahkan item ke keranjang.");
    } finally {
      setBusy(false);
    }
  }

  async function handleWishlist() {
    setBusy(true);
    const previous = isLiked;
    setIsLiked(!previous);
    try {
      const next = await toggleWishlistDb(book.id);
      const nextLiked = next.includes(book.id);
      setIsLiked(nextLiked);
      onWishlistChange?.(next);
      onToast?.(nextLiked ? "Item berhasil masuk Wishlist." : "Item dihapus dari Wishlist.");
    } catch (error) {
      setIsLiked(previous);
      onToast?.(error?.message || "Gagal mengubah wishlist.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`book-card ${compact ? "compact" : ""}`}>
      <button className={`wishlist-mini ${isLiked ? "active" : ""}`} onClick={handleWishlist} aria-label="Tambah ke Wishlist" disabled={busy}>
        <Icon name="heart" size={16} />
      </button>
      <Link href={`/book/${book.id}`} className="book-card-cover">
        <BookCover book={book} size={compact ? "sm" : "md"} />
      </Link>
      <div className="book-card-body">
        <Link href={`/book/${book.id}`} className="book-title">
          {book.title}
        </Link>
        <p>{book.author}</p>
        <div className="card-meta">
          <span>{book.category}</span>
          <span>{book.year}</span>
          <span className={stockAvailableAtSelectedLibrary ? "available" : "unavailable"}>
            {stockAvailableAtSelectedLibrary ? `${selectedLibraryStock} tersedia` : "Tidak tersedia"}
          </span>
        </div>
        <button className="primary-btn small" onClick={handleAddToCart} disabled={busy || !stockAvailableAtSelectedLibrary}>
          {stockAvailableAtSelectedLibrary ? "Tambah ke Keranjang" : "Stok Habis"}
        </button>
      </div>
    </article>
  );
}
