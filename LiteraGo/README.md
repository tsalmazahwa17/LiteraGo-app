# LiteraGo

LiteraGo adalah aplikasi web untuk mencari koleksi perpustakaan, menyimpan wishlist, memasukkan item ke keranjang, dan melakukan peminjaman berdasarkan stok yang tersedia di setiap perpustakaan.

Aplikasi ini dibuat dengan Next.js dan Supabase. Data koleksi, perpustakaan, stok, keranjang, wishlist, riwayat peminjaman, invoice, notifikasi, dan profil pengguna disimpan di database Supabase. Proses checkout memakai fungsi database agar pengurangan stok tetap aman ketika ada beberapa pengguna yang melakukan transaksi bersamaan.

## Fitur utama

- Autentikasi pengguna melalui Supabase Auth.
- Pencarian dan filter koleksi berdasarkan URL query.
- Detail item dengan informasi penulis, penerbit, tanggal terbit, ISBN, halaman, biaya pinjam, dan ketersediaan di perpustakaan.
- Wishlist dan keranjang yang tersimpan per akun pengguna.
- Checkout dengan validasi stok dari database.
- Riwayat peminjaman, invoice, dan notifikasi pengguna.
- Proxy route untuk membatasi akses halaman yang membutuhkan login.
- Validasi form menggunakan Zod.
- Skeleton loading dan optimistic update pada interaksi keranjang.

## Teknologi

- Next.js App Router
- React
- Supabase Auth dan Postgres
- Zod
- CSS custom

## Menjalankan project

Salin contoh environment lalu isi dengan konfigurasi Supabase masing-masing.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Environment yang dibutuhkan:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Struktur database dan data awal tersedia di:

```txt
database/literago.sql
```

Jalankan file tersebut melalui SQL Editor Supabase untuk membuat tabel, policy, fungsi checkout, data perpustakaan, dan data koleksi awal.

## Struktur folder

```txt
app/          Halaman dan route aplikasi
components/   Komponen UI yang dipakai lintas halaman
lib/          Koneksi Supabase, validasi, helper data, dan service database
.github/      Workflow CI untuk pengecekan build
public/       Asset publik aplikasi
database/     Skema database dan seed awal
```

## Catatan pengembangan

Pastikan Redirect URL di Supabase sudah mengarah ke domain aplikasi, terutama untuk verifikasi email, reset password, dan callback OAuth.

Untuk development lokal, gunakan:

```txt
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
```

Untuk deployment, tambahkan URL domain produksi dengan path yang sama.
