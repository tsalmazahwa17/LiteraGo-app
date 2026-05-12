import Link from "next/link";
import Logo from "@/components/Logo";
import Icon from "@/components/Icon";

export default function LandingPage() {
  return (
    <main className="page-shell">
      {/* --- HERO SECTION --- */}
      <section id="home" className="hero-grid">
        <div>
          <Logo />
          <div style={{ marginTop: 28 }} className="kicker">
            Aplikasi Peminjaman Item Digital
          </div>
          <h1 className="hero-title">
            Temukan perpustakaan terdekat dan pinjam item lebih praktis.
          </h1>
          <p className="hero-copy">
            LiteraGo membantu pengguna memilih perpustakaan berdasarkan lokasi, mencari item sesuai kategori,
            menyimpan item yang belum tersedia ke Wishlist, hingga menyelesaikan peminjaman melalui payment gateway
            yang terhubung ke Supabase.
          </p>
          <div className="hero-actions">
            <Link href="/register" className="primary-btn">
              Daftar Sekarang
            </Link>
            <Link href="login" className="secondary-btn">
              Masuk
            </Link>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-phone">
            <div className="phone-top">
              <span>Hi User!</span>
              <span className="phone-icons"><Icon name="bell" size={17} /> <Icon name="shopping" size={17} /></span>
            </div>
            <div className="mock-search">Pilih perpustakaan dari lokasi terdekat...</div>
            <div className="mock-banner">Temukan Perpustakaan dan Pinjam Item Lebih Praktis!</div>
            <div className="mock-cards">
              <div className="mock-book">📘</div>
              <div className="mock-book">📙</div>
              <div className="mock-book">📗</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TENTANG KAMI SECTION --- */}
      <section id="tentang" className="about-section section-bg">
        <div className="section-overlay"></div>
        <div className="container about-grid section-content">
          <div className="about-text">
            <p className="section-label section-label-light">Tentang Kami</p>
            <h2>
              LiteraGo hadir untuk membuat proses pencarian dan peminjaman item
              menjadi lebih sederhana.
            </h2>
            <p>
              LiteraGo dirancang sebagai aplikasi yang membantu pengguna mencari
              perpustakaan berdasarkan wilayah, melihat ketersediaan item,
              melakukan peminjaman, serta memantau item yang sedang dipinjam.
            </p>
            <p>
              Platform ini dirancang khusus untuk mengoptimalkan pengalaman literasi digital Anda dengan menyediakan akses cepat ke berbagai layanan perpustakaan secara terintegrasi dan efisien.
            </p>
          </div>

          <div className="about-points">
            <article className="about-card">
              <h3>Berbasis Lokasi</h3>
              <p>
                Item yang tampil menyesuaikan perpustakaan yang dipilih
                pengguna.
              </p>
            </article>

            <article className="about-card">
              <h3>Lebih Praktis</h3>
              <p>
                Pengguna tidak perlu berpindah-pindah platform untuk mencari,
                menyimpan, dan meminjam item.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* --- FITUR UTAMA SECTION --- */}
      <section id="fitur" className="features-section section-bg">
        <div className="section-overlay"></div>
        <div className="container section-content">
          <div className="section-heading section-heading-light">
            <p className="section-label section-label-light">Fitur Utama</p>
            <h2>
              Fitur yang membantu pengguna mengakses item secara lebih
              terstruktur
            </h2>
            <p>
              Nikmati kemudahan akses literasi dalam satu genggaman. Dari pencarian cerdas hingga sistem peminjaman otomatis, semua dirancang untuk kenyamanan membaca Anda.
            </p>
          </div>

          <div className="features-grid">
            <article className="feature-card">
              <div className="feature-icon"><Icon name="mapPin" size={30} /></div>
              <h3>Pilih Perpustakaan Terdekat</h3>
              <p>
                Pengguna dapat mencari perpustakaan berdasarkan wilayah lalu
                memilih lokasi yang paling relevan sebelum melihat stok item.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon"><Icon name="search" size={30} /></div>
              <h3>Pencarian Item dan Kategori</h3>
              <p>
                Cari berdasarkan judul, penulis, tahun, atau langsung masuk ke
                kategori seperti fiksi, teknologi, biografi, dan komik.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon"><Icon name="shopping" size={30} /></div>
              <h3>Peminjaman Terkontrol</h3>
              <p>
                Pengguna memilih item, menentukan return date, waktu
                pengambilan, dan metode pembayaran sebelum konfirmasi akhir.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon"><Icon name="heart" size={30} /></div>
              <h3>Wishlist Item</h3>
              <p>
                Item yang belum tersedia tetap bisa disimpan, sehingga pengguna
                tidak perlu mencarinya ulang nanti.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon"><Icon name="bell" size={30} /></div>
              <h3>Pengingat Jatuh Tempo</h3>
              <p>
                LiteraGo menampilkan notifikasi pengembalian agar pengguna tidak
                lupa batas pinjam item.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon"><Icon name="help-circle" size={30} /></div>
              <h3>Pusat Bantuan</h3>
              <p>
                FAQ, chat, telepon, dan email disiapkan untuk membantu pengguna
                saat menemui kendala.
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}