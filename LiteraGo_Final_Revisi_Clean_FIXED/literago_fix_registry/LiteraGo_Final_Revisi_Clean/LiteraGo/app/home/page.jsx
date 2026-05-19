"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BookCard from "@/components/BookCard";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import PageShell from "@/components/PageShell";
import SectionHeader from "@/components/SectionHeader";
import SkeletonGrid from "@/components/SkeletonGrid";
import Toast from "@/components/Toast";
import {
  fetchBooks,
  fetchCurrentUser,
  fetchLibraries,
  fetchWishlistIds,
  getBookStock,
  getSelectedLibraryDb
} from "@/lib/supabase-store";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [library, setLibrary] = useState(null);
  const [libraries, setLibraries] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [wishlistIds, setWishlistIds] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      const [currentUser, selectedLibrary, libraryRows, bookRows, wishlistRows] = await Promise.all([
        fetchCurrentUser(),
        getSelectedLibraryDb(),
        fetchLibraries(),
        fetchBooks(),
        fetchWishlistIds()
      ]);

      if (!mounted) return;
      setUser(currentUser);
      setLibrary(selectedLibrary || libraryRows[0] || null);
      setLibraries(libraryRows);
      setAllBooks(bookRows);
      setWishlistIds(wishlistRows);
      setLoading(false);
    }

    loadPage();
    return () => {
      mounted = false;
    };
  }, []);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

  const visibleBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allBooks.filter((book) => {
      const inLibrary = library ? book.libraryIds.includes(library.id) : true;
      const matchesQuery = normalizedQuery
        ? [book.title, book.author, book.category, book.type, book.publisher, String(book.year)]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        : true;
      return inLibrary && matchesQuery;
    });
  }, [allBooks, library, query]);

  const queryActive = query.trim().length > 0;
  const newest = visibleBooks.filter((book) => book.section === "Buku Terbaru").slice(0, 18);
  const popular = visibleBooks.filter((book) => book.section === "Buku Populer").slice(0, 18);
  const novels = visibleBooks.filter((book) => book.section === "Novel Rekomendasi").slice(0, 18);
  const comics = visibleBooks.filter((book) => book.section === "Komik Rekomendasi").slice(0, 18);
  const magazines = visibleBooks.filter((book) => book.section === "Majalah Populer").slice(0, 18);
  const newspapers = visibleBooks.filter((book) => book.section === "Koran Populer").slice(0, 12);
  const shownIds = new Set([...newest, ...popular, ...novels, ...comics, ...magazines, ...newspapers].map((book) => book.id));
  const otherRecommendations = visibleBooks.filter((book) => !shownIds.has(book.id)).slice(0, 24);

  const availableCollectionCount = library
    ? allBooks.filter((book) => book.libraryIds.includes(library.id) && getBookStock(book, library.id) > 0).length
    : allBooks.length;
  const availableCategoryCount = new Set(allBooks.filter((book) => (library ? book.libraryIds.includes(library.id) : true)).map((book) => book.category)).size;

  function renderSection(title, href, items) {
    if (!items.length) return null;
    return (
      <>
        <SectionHeader title={title} href={href} />
        <div className="book-grid">
          {items.map((book) => (
            <BookCard key={book.id} book={book} library={library} liked={wishlistIds.includes(book.id)} onWishlistChange={setWishlistIds} onToast={showToast} />
          ))}
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <PageShell>
        <SkeletonGrid title="Menyiapkan item" count={6} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="dashboard-hero">
        <div className="welcome-card">
          <div className="welcome-head">
            <span className="welcome-pill"><Icon name="user" size={16} /> Hi {user?.username || "User"}!</span>
          </div>
          <div className="location-current">
            <Icon name="mapPin" size={20} />
            <div>
              <strong>Lokasi Saat ini</strong>
              <br />
              {library?.name || "Belum memilih perpustakaan"}
            </div>
          </div>
          <div className="search-row">
            <input
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari judul, penulis, penerbit, kategori, tahun..."
            />
            <Link href="/libraries" className="primary-btn">
              <Icon name="search" size={16} />
              Cari Perpustakaan
            </Link>
          </div>
          <div className="banner-card">
            <div>
              <h2>Temukan Perpustakaan, Pinjam Item Lebih Praktis!</h2>
              <p>Cari pustaka terdekat, pilih item, tentukan return date, lalu checkout dalam satu alur.</p>
              <div className="hero-actions" style={{ marginTop: 16 }}>
                <Link href="/libraries" className="secondary-btn small">
                  <Icon name="mapPin" size={15} /> Cari Perpustakaan
                </Link>
                <Link href="/kategori" className="secondary-btn small">
                  <Icon name="grid" size={15} /> Lihat Kategori
                </Link>
              </div>
            </div>
            <div className="banner-illust">👩‍💻</div>
          </div>
        </div>
        <aside className="location-card">
          <div>
            <span className="kicker">Perpustakaan Aktif</span>
            <h2>{library?.name || libraries[0]?.name || "Pilih Perpustakaan"}</h2>
            <p>{library?.address || libraries[0]?.address || ""}</p>
            <p><Icon name="clock" size={15} /> {library?.open || libraries[0]?.open || ""}</p>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <strong>{availableCollectionCount}</strong>
              <span>Item tersedia</span>
            </div>
            <div className="stat-card">
              <strong>{availableCategoryCount}</strong>
              <span>Kategori</span>
            </div>
          </div>
        </aside>
      </section>

      {queryActive ? (
        <>
          <div className="section-header">
            <h2>Hasil Pencarian</h2>
            <span>{visibleBooks.length} item</span>
          </div>
          {visibleBooks.length > 0 ? (
            <div className="book-grid">
              {visibleBooks.map((book) => (
                <BookCard key={book.id} book={book} library={library} liked={wishlistIds.includes(book.id)} onWishlistChange={setWishlistIds} onToast={showToast} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Icon name="search" size={24} />}
              title="Item tidak ditemukan"
              description={`Tidak ada item yang cocok dengan kata kunci “${query.trim()}”. Coba cari memakai judul, penulis, penerbit, atau tahun lain.`}
              actionHref="/kategori"
              actionLabel="Lihat Semua Item"
            />
          )}
        </>
      ) : (
        <>
          {renderSection("Item Terbaru", "/kategori?section=Buku%20Terbaru&type=Buku", newest)}
          {renderSection("Item Populer", "/kategori?section=Buku%20Populer&type=Buku", popular)}
          {renderSection("Novel Rekomendasi", "/kategori?section=Novel%20Rekomendasi&type=Buku&category=Novel", novels)}
          {renderSection("Komik Rekomendasi", "/kategori?section=Komik%20Rekomendasi&type=Buku&category=Komik", comics)}
          {renderSection("Majalah Populer", "/kategori?section=Majalah%20Populer&type=Majalah", magazines)}
          {renderSection("Koran Populer", "/kategori?section=Koran%20Populer&type=Koran", newspapers)}
          {renderSection("Rekomendasi Item Lainnya", "/kategori?type=Semua", otherRecommendations)}
        </>
      )}

      <Toast message={toast} />
    </PageShell>
  );
}
