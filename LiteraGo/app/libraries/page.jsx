"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import PageShell from "@/components/PageShell";
import SkeletonGrid from "@/components/SkeletonGrid";
import Toast from "@/components/Toast";
import { fetchBooks, fetchLibraries, getBookStock, setSelectedLibraryDb } from "@/lib/supabase-store";

export default function LibrariesPage() {
  const router = useRouter();
  const [libraries, setLibraries] = useState([]);
  const [books, setBooks] = useState([]);
  const [activeProvince, setActiveProvince] = useState("Jawa Timur");
  const [activeCity, setActiveCity] = useState("Surabaya");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadLibraries() {
      const [libraryRows, bookRows] = await Promise.all([fetchLibraries(), fetchBooks()]);
      if (!mounted) return;
      setLibraries(libraryRows);
      setBooks(bookRows);
      const first = libraryRows[0];
      if (first) {
        setActiveProvince(first.province || "Jawa Timur");
        setActiveCity(first.city || "Surabaya");
      }
      setLoading(false);
    }
    loadLibraries();
    return () => {
      mounted = false;
    };
  }, []);

  const availableRegions = useMemo(() => {
    const fromDb = libraries.reduce((acc, library) => {
      const province = library.province || "Lainnya";
      const city = library.city || "Kota";
      if (!acc[province]) acc[province] = new Set();
      acc[province].add(city);
      return acc;
    }, {});
    const mapped = Object.entries(fromDb).map(([province, cities]) => ({ province, cities: [...cities].sort() }));
    return mapped;
  }, [libraries]);

  const visibleLibraries = useMemo(() => {
    return libraries.filter((library) => {
      const byCity = activeCity ? String(library.city || "").toLowerCase() === activeCity.toLowerCase() : true;
      const byProvince = activeProvince ? library.province === activeProvince : true;
      const byQuery = [library.name, library.city, library.address].join(" ").toLowerCase().includes(query.toLowerCase());
      return byCity && byProvince && byQuery;
    });
  }, [libraries, activeCity, activeProvince, query]);

  function getCollectionCount(libraryId) {
    return books.filter((book) => book.libraryIds.includes(libraryId)).length;
  }

  function getAvailableCount(libraryId) {
    return books.filter((book) => getBookStock(book, libraryId) > 0).length;
  }

  async function chooseLibrary(library) {
    await setSelectedLibraryDb(library);
    setToast(`${library.name} dipilih. Item akan menyesuaikan lokasi ini.`);
    setTimeout(() => router.push("/home"), 800);
  }

  if (loading) {
    return (
      <PageShell>
        <SkeletonGrid title="Menyiapkan daftar perpustakaan" count={4} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="section-block" style={{ marginTop: 0 }}>
        <span className="kicker">Search Perpustakaan</span>
        <h1 className="section-title">Cari berdasarkan <span>wilayah</span></h1>
        <p className="section-lead">
          Pilih wilayah terlebih dahulu agar stok item dan lokasi pengambilan sesuai dengan flow peminjaman LiteraGo.
        </p>
      </div>

      <section className="library-layout">
        <div className="region-panel">
          <div className="region-header">
            <button className="secondary-btn small" onClick={() => history.back()} aria-label="Kembali"><Icon name="chevronLeft" size={17} /></button>
            <input
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari berdasarkan wilayah"
            />
          </div>
          {availableRegions.map((region) => (
            <div className="accordion-item" key={region.province}>
              <button
                className="accordion-trigger"
                onClick={() => {
                  setActiveProvince(region.province);
                  setActiveCity(region.cities[0]);
                }}
              >
                {region.province}
                <Icon name={activeProvince === region.province ? "chevronUp" : "chevronDown"} size={17} />
              </button>
              {activeProvince === region.province && (
                <div className="city-grid">
                  {region.cities.map((city) => (
                    <button
                      key={city}
                      className={activeCity === city ? "active" : ""}
                      onClick={() => setActiveCity(city)}
                    >
                      {city.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="library-panel">
          <span className="kicker">Daftar perpustakaan</span>
          <h2>{activeCity}, {activeProvince}</h2>
          <div className="library-list">
            {visibleLibraries.length === 0 && (
              <div className="notice">Belum ada data perpustakaan untuk filter ini. Coba wilayah lain.</div>
            )}
            {visibleLibraries.map((library) => (
              <article className="library-card" key={library.id}>
                <div>
                  <h3>{library.name}</h3>
                  <p><Icon name="mapPin" size={15} /> {library.address}</p>
                  <p><Icon name="clock" size={15} /> {library.open} · ⭐ {library.rating} · {library.distance}</p>
                  <p><Icon name="book-open" size={15} /> {getAvailableCount(library.id)} dari {getCollectionCount(library.id)} item sedang tersedia</p>
                </div>
                <button className="primary-btn small" onClick={() => chooseLibrary(library)}>
                  Gunakan Perpustakaan
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Toast message={toast} />
    </PageShell>
  );
}
