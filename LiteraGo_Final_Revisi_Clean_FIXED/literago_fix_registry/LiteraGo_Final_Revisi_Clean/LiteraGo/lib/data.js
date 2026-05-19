export const appName = "LiteraGo";

export const navItems = [
  { label: "Beranda", href: "/home", icon: "home" },
  { label: "Kategori", href: "/kategori", icon: "grid" },
  { label: "Peminjaman", href: "/borrow", icon: "book-open" },
  { label: "Wishlist", href: "/wishlist", icon: "heart" },
  { label: "Bantuan", href: "/help", icon: "help-circle" }
];

export const userProfile = {
  name: "",
  username: "",
  email: "",
  phone: "",
  location: "Surabaya",
  birthDate: "",
  provider: "email"
};

export const faqs = [
  {
    group: "Rekomendasi",
    question: "Kenapa saya harus memilih perpustakaan terlebih dahulu?",
    answer:
      "Pilihan perpustakaan dipakai untuk menyesuaikan daftar koleksi, stok, dan lokasi pengambilan yang tersedia."
  },
  {
    group: "Rekomendasi",
    question: "Apakah koleksi di setiap perpustakaan sama?",
    answer:
      "Tidak selalu. Setiap perpustakaan memiliki daftar koleksi dan jumlah stok yang berbeda."
  },
  {
    group: "Keamanan",
    question: "Apakah login Google memakai akun Google asli?",
    answer:
      "Ya. Jika provider Google sudah diaktifkan di Supabase, pengguna akan diarahkan ke halaman pemilihan akun Google lalu kembali ke LiteraGo."
  },
  {
    group: "Keamanan",
    question: "Apakah password Google tersimpan di LiteraGo?",
    answer:
      "Tidak. LiteraGo hanya menerima sesi autentikasi dari Supabase. Password akun Google tetap dikelola oleh Google."
  },
  {
    group: "Peminjaman",
    question: "Apa yang harus dilakukan jika item yang saya cari tidak tersedia?",
    answer:
      "Kamu bisa menyimpannya ke Wishlist agar lebih mudah dicek kembali saat stok sudah tersedia."
  },
  {
    group: "Peminjaman",
    question: "Di mana saya bisa melihat item yang sedang dipinjam?",
    answer:
      "Buka menu Peminjaman untuk melihat kode pinjaman, tanggal ambil, tanggal kembali, dan status pembayaran."
  },
  {
    group: "Pembayaran",
    question: "Apa yang harus dilakukan jika pembayaran gagal?",
    answer:
      "Ulangi proses pembayaran atau pilih metode pembayaran lain yang tersedia."
  },
  {
    group: "Akun",
    question: "Apa yang harus saya lakukan jika lupa kata sandi?",
    answer:
      "Gunakan tautan lupa kata sandi pada halaman login. Link reset akan dikirim ke email yang terdaftar."
  },
  {
    group: "Notifikasi",
    question: "Mengapa saya belum menerima notifikasi?",
    answer:
      "Notifikasi baru akan muncul setelah ada aktivitas akun, misalnya peminjaman berhasil atau pengingat pengembalian."
  },
  {
    group: "Notifikasi",
    question: "Bagaimana cara mengaktifkan notifikasi aplikasi?",
    answer:
      "Pengaturan notifikasi mengikuti data akun pengguna dan dapat dikembangkan sesuai kebutuhan layanan."
  }
];

export const paymentMethods = [
  {
    id: "bca",
    label: "BCA Virtual Account",
    admin: 2500,
    instruction: "Transfer ke nomor VA 8808 2026 4040 7299 sebelum batas waktu pembayaran."
  },
  {
    id: "dana",
    label: "DANA",
    admin: 1500,
    instruction: "Lanjutkan pembayaran melalui aplikasi DANA dengan nomor ponsel yang terdaftar."
  },
  {
    id: "cod",
    label: "Cash On Delivery (COD)",
    admin: 2000,
    instruction: "Bayar saat mengambil item di perpustakaan yang dipilih."
  }
];

export function formatRupiah(amount = 0) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(amount);
}
