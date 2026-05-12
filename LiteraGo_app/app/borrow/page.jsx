"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BookCover from "@/components/BookCover";
import EmptyState from "@/components/EmptyState";
import PageShell from "@/components/PageShell";
import SkeletonGrid from "@/components/SkeletonGrid";
import { fetchBooks, fetchBorrowings } from "@/lib/supabase-store";
import { formatRupiah } from "@/lib/data";

export default function BorrowPage() {
  const [borrowings, setBorrowings] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadBorrowings() {
      const [rows, bookRows] = await Promise.all([fetchBorrowings(), fetchBooks()]);
      if (!mounted) return;
      setBorrowings(rows);
      setAllBooks(bookRows);
      setLoading(false);
    }
    loadBorrowings();
    return () => {
      mounted = false;
    };
  }, []);

  const normalizedBorrowings = useMemo(() => {
    return borrowings.map((borrowing) => ({
      ...borrowing,
      books: borrowing.books?.length
        ? borrowing.books
        : (borrowing.items || []).map((id) => allBooks.find((book) => book.id === id)).filter(Boolean)
    }));
  }, [borrowings, allBooks]);

  if (loading) {
    return (
      <PageShell>
        <SkeletonGrid title="Menyiapkan riwayat peminjaman" count={4} />
      </PageShell>
    );
  }

  if (!normalizedBorrowings.length) {
    return (
      <PageShell>
        <EmptyState
          title="Belum ada riwayat peminjaman"
          description="Peminjaman yang berhasil akan tampil di halaman ini."
          actionHref="/kategori"
          actionLabel="Cari Item"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="section-block" style={{ marginTop: 0 }}>
        <span className="kicker">Peminjaman</span>
        <h1 className="section-title">Riwayat <span>Peminjaman</span></h1>
        <p className="section-lead">Pantau kode pinjaman, tanggal peminjaman, tanggal pengembalian, dan status pembayaran.</p>
      </section>

      <div className="borrow-list">
        {normalizedBorrowings.map((borrowing) => {
          const firstBook = borrowing.books[0];
          return (
            <article className="borrow-card" key={borrowing.id}>
              {firstBook && <BookCover book={firstBook} size="sm" />}
              <div>
                <span className="field-label">Kode Peminjaman</span>
                <h3>{borrowing.id}</h3>
                <p>{borrowing.books.map((book) => `${book.author} — ${book.title}`).join(", ")}</p>
                <p>{borrowing.pickupDate || borrowing.createdAt} - {borrowing.returnDate}</p>
                <p>{borrowing.books.length || borrowing.items?.length || 1} pcs · Total Harga {formatRupiah(borrowing.total)}</p>
                <span className="status-pill available">{borrowing.status}</span>
              </div>
              <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                <Link href="/invoice" className="secondary-btn small">Lihat Detail</Link>
              </div>
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}
