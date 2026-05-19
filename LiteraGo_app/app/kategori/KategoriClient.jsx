"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import BookCard from "@/components/BookCard";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import PageShell from "@/components/PageShell";
import SkeletonGrid from "@/components/SkeletonGrid";
import Toast from "@/components/Toast";
import { fetchBooks, fetchLibraries, fetchWishlistIds, getSelectedLibraryDb } from "@/lib/supabase-store";

function getParam(searchParams, key, fallback = "Semua") {
  return searchParams.get(key) || fallback;
}

function getPageTitle({ query, activeType, activeCategory, activeSection }) {
  if (query.trim()) return "Hasil Pencarian";
  if (activeSection !== "Semua") return activeSection;
  if (activeCategory !== "Semua") return `Kategori ${activeCategory}`;
  if (activeType !== "Semua") return `Daftar ${activeType}`;
  return "Semua Item";
}

export default function CategoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [library, setLibrary] = useState(null);
  const [libraries, setLibraries] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const activeType = getParam(searchParams, "type", "Semua");
  const activeCategory = getParam(searchParams, "category");
  const activeSection = getParam(searchParams, "section");
  const query = searchParams.get("q") || "";

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      const [selectedLibrary, libraryRows, bookRows, wishlistRows] = await Promise.all([
        getSelectedLibraryDb(),
        fetchLibraries(),
        fetchBooks(),
        fetchWishlistIds()
      ]);

      if (!mounted) return;
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

  function updateUrl(updates) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "Semua") params.delete(key);
      else params.set(key, value);
    });
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  function resetAllFilters() {
    router.replace(pathname, { scroll: false });
  }

  const baseByLibrary = useMemo(() => {
    return allBooks.filter((book) => (library ? book.libraryIds.includes(library.id) : true));
  }, [allBooks, library]);

  const typeOptions = useMemo(() => {
    const options = [...new Set(baseByLibrary.map((book) => book.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id-ID"));
    return ["Semua", ...options.filter((option) => option !== "Semua")];
  }, [baseByLibrary]);

  const categoryOptions = useMemo(() => {
    const source = baseByLibrary.filter((book) => {
      const byType = activeType === "Semua" ? true : book.type === activeType;
      const bySection = activeSection === "Semua" ? true : book.section === activeSection;
      return byType && bySection;
    });

    return [...new Set(source.map((book) => book.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [baseByLibrary, activeType, activeSection]);

  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return baseByLibrary.filter((book) => {
      const byType = activeType === "Semua" ? true : book.type === activeType;
      const byCategory = activeCategory === "Semua" ? true : book.category === activeCategory;
      const bySection = activeSection === "Semua" ? true : book.section === activeSection;
      const byQuery = normalizedQuery
        ? [book.title, book.author, book.year, book.category, book.type, book.publisher, book.isbn]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        : true;
      return byType && byCategory && bySection && byQuery;
    });
  }, [baseByLibrary, activeType, activeCategory, activeSection, query]);

  const pageTitle = getPageTitle({ query, activeType, activeCategory, activeSection });
  const emptyTitle = query.trim() ? "Item tidak ditemukan" : "Belum ada item pada filter ini";
  const emptyText = query.trim()
    ? `Tidak ada item yang cocok dengan kata kunci “${query.trim()}”. Coba gunakan judul, penulis, penerbit, atau tahun yang berbeda.`
    : "Coba pilih tipe atau kategori lain, atau klik Lihat Semua untuk menampilkan seluruh item yang tersedia di perpustakaan aktif.";

  if (loading) {
    return (
      <PageShell>
        <SkeletonGrid title="Menyiapkan kategori" count={6} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="section-block" style={{ marginTop: 0 }}>
        <span className="kicker">Kategori</span>
        <h1 className="section-title">Cari item berdasarkan judul, penulis, penerbit, atau tahun</h1>
        <p className="section-lead">
          Perpustakaan aktif: <strong>{library?.name || libraries[0]?.name || "Belum dipilih"}</strong>. Filter kategori otomatis mengikuti item yang tersedia di perpustakaan aktif.
        </p>
        <input
          className="input"
          value={query}
          onChange={(event) => updateUrl({ q: event.target.value })}
          placeholder="Cari judul, penulis, penerbit, tahun, ISBN, atau kategori"
        />
        <div className="tabs">
          {typeOptions.map((type) => (
            <button
              key={type}
              className={`tab-btn ${activeType === type ? "active" : ""}`}
              onClick={() => updateUrl({ type, category: "Semua" })}
            >
              {type}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="section-header">
          <h2>Kategori Item</h2>
        </div>
        <div className="filter-bar">
          <button
            className={`chip-btn ${activeCategory === "Semua" ? "active" : ""}`}
            onClick={() => updateUrl({ category: "Semua" })}
          >
            Semua
          </button>
          {categoryOptions.map((category) => (
            <button
              key={category}
              className={`chip-btn ${activeCategory === category ? "active" : ""}`}
              onClick={() => updateUrl({ category })}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <div className="section-header">
        <h2>{pageTitle}</h2>
        <span>{filteredBooks.length} item</span>
      </div>

      {filteredBooks.length > 0 ? (
        <div className="book-grid">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              library={library}
              liked={wishlistIds.includes(book.id)}
              onWishlistChange={setWishlistIds}
              onToast={showToast}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Icon name="search" size={24} />}
          title={emptyTitle}
          description={emptyText}
        />
      )}

      <Toast message={toast} />
    </PageShell>
  );
}
