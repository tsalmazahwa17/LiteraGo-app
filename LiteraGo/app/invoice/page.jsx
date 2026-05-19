"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BookCover from "@/components/BookCover";
import EmptyState from "@/components/EmptyState";
import PageShell from "@/components/PageShell";
import SkeletonGrid from "@/components/SkeletonGrid";
import { fetchBooks, fetchCurrentUser, fetchLastInvoice, fetchLibraries } from "@/lib/supabase-store";
import { formatRupiah } from "@/lib/data";

export default function InvoicePage() {
  const [invoice, setInvoice] = useState(null);
  const [allBooks, setAllBooks] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadInvoice() {
      const [invoiceRow, bookRows, libraryRows, currentUser] = await Promise.all([
        fetchLastInvoice(),
        fetchBooks(),
        fetchLibraries(),
        fetchCurrentUser()
      ]);
      if (!mounted) return;
      setInvoice(invoiceRow);
      setAllBooks(bookRows);
      setLibraries(libraryRows);
      setUser(currentUser);
      setLoading(false);
    }
    loadInvoice();
    return () => {
      mounted = false;
    };
  }, []);

  const details = useMemo(() => {
    if (!invoice) return null;
    return {
      ...invoice,
      library: libraries.find((library) => library.id === invoice.libraryId),
      borrower: invoice.borrower || user,
      books: invoice.books?.length ? invoice.books : (invoice.items || []).map((id) => allBooks.find((book) => book.id === id)).filter(Boolean)
    };
  }, [invoice, allBooks, libraries, user]);

  if (loading) {
    return (
      <PageShell>
        <SkeletonGrid title="Menyiapkan invoice" count={4} />
      </PageShell>
    );
  }

  if (!details) {
    return (
      <PageShell>
        <EmptyState
          title="Invoice belum tersedia"
          description="Selesaikan pembayaran terlebih dahulu agar invoice peminjaman dibuat."
          actionHref="/cart"
          actionLabel="Ke Keranjang"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="invoice-card">
        <div className="invoice-top">
          <div>
            <strong>Peminjaman</strong>
            <p>{details.pickupTime || "12:00"} · {details.pickupDate}</p>
          </div>
          <div className="invoice-dotline"><span /></div>
          <div>
            <strong>Pengembalian</strong>
            <p>{details.returnDate}</p>
          </div>
        </div>

        <h1 className="section-title">Invoice <span>{details.id}</span></h1>
        <div className="library-card" style={{ marginBottom: 20 }}>
          <div>
            <h3>Detail Peminjam</h3>
            <p><strong>{details.borrower?.name || details.borrower?.username || "User"}</strong></p>
            <p>{details.borrower?.phone || "Nomor telepon belum diisi"}</p>
            <p>{details.library?.name} {details.library?.address}</p>
          </div>
          <span className="status-pill available">{details.status}</span>
        </div>

        <h2>Product List</h2>
        <div className="cart-items">
          {details.books.map((book) => (
            <article className="cart-item" key={book.id}>
              <BookCover book={book} size="sm" />
              <div>
                <h3>{book.title}</h3>
                <p>{book.author}</p>
                <p>1 pcs</p>
              </div>
            </article>
          ))}
        </div>

        <div className="invoice-lines">
          <div className="invoice-line"><span>Metode Pembayaran</span><strong>{details.paymentMethod}</strong></div>
          <div className="invoice-line"><span>Subtotal</span><strong>{formatRupiah(details.subtotal)}</strong></div>
          <div className="invoice-line"><span>Total Termasuk PPN</span><strong>{formatRupiah(details.total)}</strong></div>
        </div>
        <div className="notice">DIBAYAR dengan <strong>{details.paymentMethod}</strong></div>
        <div className="hero-actions">
          <Link href="/borrow" className="primary-btn">SELESAI</Link>
          <Link href="/home" className="secondary-btn">Kembali ke Home</Link>
        </div>
      </section>
    </PageShell>
  );
}
