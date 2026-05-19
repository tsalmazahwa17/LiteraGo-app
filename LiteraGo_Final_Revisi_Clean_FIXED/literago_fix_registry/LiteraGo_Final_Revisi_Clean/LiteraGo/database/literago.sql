-- =========================================================
-- LiteraGo database schema
-- Membersihkan tabel aplikasi tanpa mengubah data pengguna di auth.users.
-- =========================================================

begin;

drop table if exists public.notifications cascade;
drop table if exists public.checkout_sessions cascade;
drop table if exists public.cart_items cascade;
drop table if exists public.wishlists cascade;
drop table if exists public.borrowings cascade;
drop table if exists public.library_books cascade;
drop table if exists public.profiles cascade;
drop table if exists public.books cascade;
drop table if exists public.libraries cascade;

drop function if exists public.checkout_cart(jsonb, date, time, text) cascade;
drop function if exists public.checkout_book(text, text, date, date, time, text) cascade;
drop function if exists public.checkout_book(uuid, uuid, date, date, time, text) cascade;
drop function if exists public.validate_cart_item_stock() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;

commit;


-- =========================================================
-- Struktur utama aplikasi
-- Tabel, policy RLS, trigger profil, dan fungsi checkout.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.libraries (
  id text primary key,
  name text not null,
  address text not null,
  city text,
  province text,
  distance text,
  open_hours text,
  rating numeric default 4.5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.books (
  id text primary key,
  title text not null,
  author text,
  publisher text,
  publish_date text,
  isbn text,
  pages integer default 0,
  cover_url text,
  cover_tone text default 'blue',
  category text not null default 'Umum',
  type text not null default 'buku' check (type in ('buku', 'majalah', 'koran')),
  section text default 'Buku Populer',
  borrow_price integer default 0,
  description text,
  synopsis text,
  year integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  name text,
  email text,
  phone text,
  birth_date date,
  selected_library_id text references public.libraries(id) on delete set null,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  book_id text not null references public.books(id) on delete cascade,
  library_id text not null references public.libraries(id) on delete cascade,
  stock_total integer not null default 0 check (stock_total >= 0),
  stock_available integer not null default 0 check (stock_available >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(book_id, library_id),
  check (stock_available <= stock_total)
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, book_id)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  library_id text not null references public.libraries(id) on delete cascade,
  qty integer not null default 1 check (qty between 1 and 3),
  return_date date not null default (current_date + 7),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, book_id)
);

create table if not exists public.borrowings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  library_id text not null references public.libraries(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'returned', 'cancelled')),
  price integer default 0,
  payment_method text,
  pickup_date date,
  pickup_time time,
  return_date date,
  borrowed_at timestamptz default now(),
  returned_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text default 'success',
  created_at timestamptz default now()
);

create table if not exists public.checkout_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_libraries_updated_at on public.libraries;
create trigger set_libraries_updated_at before update on public.libraries
for each row execute function public.set_updated_at();

drop trigger if exists set_books_updated_at on public.books;
create trigger set_books_updated_at before update on public.books
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_library_books_updated_at on public.library_books;
create trigger set_library_books_updated_at before update on public.library_books
for each row execute function public.set_updated_at();

drop trigger if exists set_cart_items_updated_at on public.cart_items;
create trigger set_cart_items_updated_at before update on public.cart_items
for each row execute function public.set_updated_at();

drop trigger if exists set_checkout_sessions_updated_at on public.checkout_sessions;
create trigger set_checkout_sessions_updated_at before update on public.checkout_sessions
for each row execute function public.set_updated_at();

create or replace function public.validate_cart_item_stock()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_stock integer;
begin
  select stock_available into v_stock
  from public.library_books
  where book_id = new.book_id and library_id = new.library_id;

  if coalesce(v_stock, 0) <= 0 then
    raise exception 'Stok item sudah habis di perpustakaan ini.';
  end if;

  if new.qty > least(v_stock, 3) then
    raise exception 'Jumlah melebihi stok item yang tersedia.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_cart_items_stock on public.cart_items;
create trigger validate_cart_items_stock before insert or update on public.cart_items
for each row execute function public.validate_cart_item_stock();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, username, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(public.profiles.username, excluded.username),
    name = coalesce(public.profiles.name, excluded.name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.libraries enable row level security;
alter table public.library_books enable row level security;
alter table public.wishlists enable row level security;
alter table public.cart_items enable row level security;
alter table public.borrowings enable row level security;
alter table public.notifications enable row level security;
alter table public.checkout_sessions enable row level security;

drop policy if exists "Books are readable" on public.books;
create policy "Books are readable" on public.books for select to anon, authenticated using (true);

drop policy if exists "Libraries are readable" on public.libraries;
create policy "Libraries are readable" on public.libraries for select to anon, authenticated using (true);

drop policy if exists "Library stocks are readable" on public.library_books;
create policy "Library stocks are readable" on public.library_books for select to anon, authenticated using (true);

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Users can manage own wishlist" on public.wishlists;
create policy "Users can manage own wishlist" on public.wishlists for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own cart" on public.cart_items;
create policy "Users can manage own cart" on public.cart_items for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own borrowings" on public.borrowings;
create policy "Users can read own borrowings" on public.borrowings for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications" on public.notifications for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own checkout session" on public.checkout_sessions;
create policy "Users can manage own checkout session" on public.checkout_sessions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select on public.books to anon, authenticated;
grant select on public.libraries to anon, authenticated;
grant select on public.library_books to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.wishlists to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select, insert, update, delete on public.checkout_sessions to authenticated;
grant select on public.borrowings to authenticated;
grant select on public.notifications to authenticated;

create or replace function public.checkout_book(
  p_book_id text,
  p_library_id text,
  p_return_date date,
  p_pickup_date date,
  p_pickup_time time,
  p_payment_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_stock integer;
  v_borrowing_id uuid;
  v_price integer;
  v_title text;
begin
  if v_user_id is null then
    raise exception 'Anda harus login terlebih dahulu.';
  end if;

  update public.library_books
  set stock_available = stock_available - 1
  where book_id = p_book_id
    and library_id = p_library_id
    and stock_available > 0
  returning stock_available into v_stock;

  if not found then
    raise exception 'Stok item sudah habis.';
  end if;

  select borrow_price, title into v_price, v_title
  from public.books
  where id = p_book_id;

  insert into public.borrowings (
    user_id, book_id, library_id, return_date, pickup_date,
    pickup_time, payment_method, price, status
  ) values (
    v_user_id, p_book_id, p_library_id, p_return_date, p_pickup_date,
    p_pickup_time, p_payment_method, coalesce(v_price, 0), 'active'
  ) returning id into v_borrowing_id;

  insert into public.notifications (user_id, title, body, type)
  values (
    v_user_id,
    'Peminjaman Berhasil',
    coalesce(v_title, 'Item') || ' berhasil dipinjam. Stok otomatis berkurang.',
    'success'
  );

  return jsonb_build_object('success', true, 'borrowing_id', v_borrowing_id, 'remaining_stock', v_stock);
end;
$$;

create or replace function public.checkout_cart(
  p_items jsonb,
  p_pickup_date date,
  p_pickup_time time,
  p_payment_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_qty integer;
  v_index integer;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'Anda harus login terlebih dahulu.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(1, least(coalesce((v_item->>'qty')::integer, 1), 3));
    for v_index in 1..v_qty loop
      v_result := public.checkout_book(
        v_item->>'book_id',
        v_item->>'library_id',
        nullif(v_item->>'return_date', '')::date,
        p_pickup_date,
        p_pickup_time,
        p_payment_method
      );
      v_results := v_results || jsonb_build_array(v_result);
    end loop;
  end loop;

  delete from public.cart_items where user_id = v_user_id;

  return jsonb_build_object('success', true, 'items', v_results);
end;
$$;

revoke execute on function public.checkout_book(text, text, date, date, time, text) from public;
revoke execute on function public.checkout_book(text, text, date, date, time, text) from anon;
grant execute on function public.checkout_book(text, text, date, date, time, text) to authenticated;

revoke execute on function public.checkout_cart(jsonb, date, time, text) from public;
revoke execute on function public.checkout_cart(jsonb, date, time, text) from anon;
grant execute on function public.checkout_cart(jsonb, date, time, text) to authenticated;


-- =========================================================
-- Data awal aplikasi
-- 18 perpustakaan dan 70 koleksi awal: 50 buku, 12 majalah, 8 koran.
-- =========================================================

begin;

-- Bersihkan data yang bergantung pada koleksi supaya tidak nyangkut ke item lama.
truncate table public.notifications restart identity cascade;
truncate table public.checkout_sessions restart identity cascade;
truncate table public.cart_items restart identity cascade;
truncate table public.wishlists restart identity cascade;
truncate table public.borrowings restart identity cascade;
truncate table public.library_books restart identity cascade;
truncate table public.books restart identity cascade;

insert into public.libraries (id, name, address, city, province, distance, open_hours, rating) values
  ('surabaya-aksara', 'Perpustakaan Taman Aksara Surabaya', 'Jl. Manyar Kertoarjo No. 17, Mulyorejo, Surabaya, Jawa Timur 60116', 'Surabaya', 'Jawa Timur', '2.1 km', '08.00 - 18.00', 4.8),
  ('surabaya-ketintang', 'Perpustakaan Kampus Ketintang', 'Jl. Ketintang Madya No. 12, Gayungan, Surabaya, Jawa Timur 60231', 'Surabaya', 'Jawa Timur', '3.4 km', '08.00 - 16.30', 4.7),
  ('surabaya-barat-literasi', 'Perpustakaan Barat Literasi', 'Jl. Raya Darmo Permai No. 55, Surabaya, Jawa Timur 60226', 'Surabaya', 'Jawa Timur', '5.2 km', '08.00 - 17.00', 4.6),
  ('sidoarjo-cakrawala', 'Perpustakaan Cakrawala Sidoarjo', 'Jl. Pahlawan No. 88, Sidoarjo, Jawa Timur 61212', 'Sidoarjo', 'Jawa Timur', '21 km', '08.00 - 16.00', 4.5),
  ('malang-cendekia', 'Perpustakaan Cendekia Malang', 'Jl. Ijen Nirwana Raya No. 24, Klojen, Malang, Jawa Timur 65116', 'Malang', 'Jawa Timur', '72 km', '08.30 - 17.00', 4.6),
  ('yogya-malioboro', 'Perpustakaan Malioboro Reading Hub', 'Jl. Suryatmajan No. 22, Danurejan, Yogyakarta 55213', 'Yogyakarta', 'DI Yogyakarta', '326 km', '09.00 - 19.00', 4.8),
  ('bandung-paramarta', 'Perpustakaan Paramarta Bandung', 'Jl. Riau No. 65, Citarum, Bandung Wetan, Bandung, Jawa Barat 40115', 'Bandung', 'Jawa Barat', '690 km', '08.00 - 18.00', 4.7),
  ('depok-margonda', 'Perpustakaan Margonda Literasi', 'Jl. Margonda Raya No. 312, Beji, Depok, Jawa Barat 16424', 'Depok', 'Jawa Barat', '785 km', '09.00 - 18.00', 4.5),
  ('jakarta-senayan', 'Perpustakaan Senayan Literasi', 'Jl. Gerbang Pemuda No. 3, Senayan, Jakarta Pusat 10270', 'Jakarta', 'DKI Jakarta', '805 km', '08.00 - 19.00', 4.8),
  ('jakarta-kota-baca', 'Perpustakaan Kota Baca Jakarta', 'Jl. Cikini Raya No. 73, Menteng, Jakarta Pusat 10330', 'Jakarta', 'DKI Jakarta', '806 km', '08.00 - 18.00', 4.7),
  ('semarang-aksara', 'Perpustakaan Aksara Kota Semarang', 'Jl. Pandanaran No. 39, Mugassari, Semarang, Jawa Tengah 50249', 'Semarang', 'Jawa Tengah', '312 km', '08.00 - 17.00', 4.7),
  ('solo-saraswati', 'Perpustakaan Saraswati Solo', 'Jl. Slamet Riyadi No. 210, Sriwedari, Surakarta, Jawa Tengah 57141', 'Solo', 'Jawa Tengah', '260 km', '08.00 - 18.00', 4.6),
  ('denpasar-widya', 'Perpustakaan Widya Mandala Denpasar', 'Jl. Puputan Renon No. 14, Denpasar, Bali 80235', 'Denpasar', 'Bali', '430 km', '08.00 - 17.00', 4.7),
  ('medan-literasi', 'Perpustakaan Literasi Medan', 'Jl. Sei Deli No. 18, Medan Barat, Medan, Sumatera Utara 20114', 'Medan', 'Sumatera Utara', '2.630 km', '08.30 - 17.00', 4.5),
  ('palembang-sriwijaya', 'Perpustakaan Sriwijaya Reading Corner', 'Jl. Kapten A. Rivai No. 44, Palembang, Sumatera Selatan 30129', 'Palembang', 'Sumatera Selatan', '1.510 km', '08.00 - 16.00', 4.5),
  ('banjarmasin-ilmu', 'Perpustakaan Ilmu Banjarmasin', 'Jl. Lambung Mangkurat No. 23, Banjarmasin, Kalimantan Selatan 70111', 'Banjarmasin', 'Kalimantan Selatan', '920 km', '08.00 - 16.30', 4.4),
  ('makassar-pustaka-bahari', 'Perpustakaan Pustaka Bahari Makassar', 'Jl. Penghibur No. 12, Ujung Pandang, Makassar, Sulawesi Selatan 90111', 'Makassar', 'Sulawesi Selatan', '1.050 km', '08.00 - 17.00', 4.6),
  ('pontianak-khatulistiwa', 'Perpustakaan Khatulistiwa Pontianak', 'Jl. Ahmad Yani No. 99, Pontianak, Kalimantan Barat 78124', 'Pontianak', 'Kalimantan Barat', '1.180 km', '08.00 - 16.00', 4.4)
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  city = excluded.city,
  province = excluded.province,
  distance = excluded.distance,
  open_hours = excluded.open_hours,
  rating = excluded.rating,
  updated_at = now();

insert into public.books (
  id, title, author, publisher, publish_date, isbn, pages, cover_url,
  category, type, section, borrow_price, description, synopsis, year, cover_tone
) values
  ('merawat-luka-batin', 'Merawat Luka Batin', 'Jiemi Ardian', 'Gramedia Digital', '-', '-', 0, 'https://image.gramedia.net/plain/https://ebooks.gramedia.com/ebook-covers/73122/image_highres/BLK_MLB2022784545.jpg', 'Kesehatan Mental', 'buku', 'Buku Populer', 15000, 'Koleksi kesehatan mental LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi kesehatan mental LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('gadis-kretek', 'Gadis Kretek', 'Ratih Kumala', 'Gramedia Digital', '-', '-', 0, 'https://image.gramedia.net/plain/https://ebooks.gramedia.com/ebook-covers/6634/image_highres/ID_GPU2013MTH07GKRER.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('atomic-habits', 'Atomic Habits', 'James Clear', 'Gramedia Digital', '-', '-', 0, 'https://image.gramedia.net/plain/https://ebooks.gramedia.com/ebook-covers/49184/thumb_image_normal/ID_AHPK2019MTH09AHP.jpg', 'Self Improvement', 'buku', 'Buku Populer', 18000, 'Koleksi self improvement LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi self improvement LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('filosofi-teras', 'Filosofi Teras', 'Henry Manampiring', 'Gramedia Digital', '-', '-', 0, 'https://image.gramedia.net/plain/https://ebooks.gramedia.com/ebook-covers/106221/image_highres/BLK_FT21761806894098.jpg', 'Self Improvement', 'buku', 'Buku Populer', 18000, 'Koleksi self improvement LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi self improvement LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('berani-tidak-disukai', 'Berani Tidak Disukai', 'Ichiro Kishimi & Fumitake Koga', 'Gramedia Digital', '-', '-', 0, 'https://gpu.id/data-gpu/images/img-book/93954/623221003.jpg', 'Self Improvement', 'buku', 'Buku Populer', 18000, 'Koleksi self improvement LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi self improvement LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('the-subtle-art-of-not-giving-a-f-ck', 'The Subtle Art of Not Giving a F*ck', 'Mark Manson', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/products/acnf-3-05-.jpg', 'Self Improvement', 'buku', 'Buku Populer', 18000, 'Koleksi self improvement LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi self improvement LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('it-ends-with-us', 'It Ends with Us', 'Colleen Hoover', 'Gramedia Digital', '-', '-', 0, 'https://www.colleenhoover.com/cdn/shop/files/it-ends-with-us-special-collectors-edition-9781668021040_hr_1200x1200_crop_center.jpg?v=1695914336', 'Novel Terjemahan', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel terjemahan LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel terjemahan LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('perempuan-yang-menangis-kepada-bulan-hitam', 'Perempuan yang Menangis kepada Bulan Hitam', 'Dian Purnomo', 'Gramedia Digital', '-', '-', 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHeEE903SAidvUMluxvPJf3fliYrg133bOcA&s', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('terdidik-educated', 'Terdidik (Educated)', 'Tara Westover', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/items/9786020650357_educated_cov.jpg', 'Memoar', 'buku', 'Buku Populer', 15000, 'Koleksi memoar LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi memoar LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('resign', 'Resign!', 'Almira Bastari', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/images/1/41482/image_highres/ID_GPU2018MTH02MRES.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('wedding-agreement', 'Wedding Agreement', 'Mia Chuz', 'Gramedia Digital', '-', '-', 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT931rDGRYxdHQtBZPDOKpvyXUmkMbG7Ub7Wg&s', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('game-over', 'Game Over', 'Valerie Patkar', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/items/Game_over_new_cover.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('pelukis-bisu', 'Pelukis Bisu', 'Alex Michaelides', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/items/9786020633909_THE_SILENT_PATIENCE.jpg', 'Thriller', 'buku', 'Buku Populer', 17000, 'Koleksi thriller LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi thriller LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('laut-bercerita', 'Laut Bercerita', 'Leila S. Chudori', 'Gramedia Digital', '-', '-', 0, 'https://www.gramedia.com/blog/content/images/2020/08/laut-bercerita-leila-s-chudori_gramedia.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('pulang', 'Pulang', 'Leila S. Chudori', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/picture_meta/2023/12/20/xoid3bznddxudnurccgqxi.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('bumi-manusia', 'Bumi Manusia', 'Pramoedya Ananta Toer', 'Gramedia Digital', '-', '-', 0, 'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1565658920i/1398034.jpg', 'Sastra', 'buku', 'Buku Populer', 17000, 'Koleksi sastra LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi sastra LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('anak-semua-bangsa', 'Anak Semua Bangsa', 'Pramoedya Ananta Toer', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/product-metas/na3avd-dns.jpg', 'Sastra', 'buku', 'Buku Populer', 17000, 'Koleksi sastra LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi sastra LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('jejak-langkah', 'Jejak Langkah', 'Pramoedya Ananta Toer', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/items/JEJAK-LANGKAH-edit.jpg', 'Sastra', 'buku', 'Buku Populer', 17000, 'Koleksi sastra LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi sastra LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('rumah-kaca', 'Rumah Kaca', 'Pramoedya Ananta Toer', 'Gramedia Digital', '-', '-', 0, 'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1360646538i/1353452.jpg', 'Sastra', 'buku', 'Buku Populer', 17000, 'Koleksi sastra LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi sastra LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('laskar-pelangi', 'Laskar Pelangi', 'Andrea Hirata', 'Gramedia Digital', '-', '-', 0, 'https://upload.wikimedia.org/wikipedia/id/8/8e/Laskar_pelangi_sampul.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('sang-pemimpi', 'Sang Pemimpi', 'Andrea Hirata', 'Gramedia Digital', '-', '-', 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqtLW261TUb5NxUQdrRdclOSSuJGZbkfp-Xw&s', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('edensor', 'Edensor', 'Andrea Hirata', 'Gramedia Digital', '-', '-', 0, 'https://perpustakaan.jakarta.go.id/catalog-dispusip/uploaded_files/sampul_koleksi/original/SumberElektronik/236127.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('negeri-5-menara', 'Negeri 5 Menara', 'Ahmad Fuadi', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/items/9789792248616_negeri-5-menara-_cu-cover-baru_.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('ranah-3-warna', 'Ranah 3 Warna', 'Ahmad Fuadi', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/picture_meta/2023/3/9/zjcyzwxyrem9jecnszaxva.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('cantik-itu-luka', 'Cantik Itu Luka', 'Eka Kurniawan', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/items/9786020366517_Cantik-Itu-Luka-Hard-Cover---Limited-Edition.jpg', 'Sastra', 'buku', 'Buku Populer', 17000, 'Koleksi sastra LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi sastra LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('seperti-dendam-rindu-harus-dibayar-tuntas', 'Seperti Dendam, Rindu Harus Dibayar Tuntas', 'Eka Kurniawan', 'Gramedia Digital', '-', '-', 0, 'https://image.gramedia.net/plain/https://ebooks.gramedia.com/ebook-covers/10084/image_highres/GPU_SDRHD2019MTH03SDRHD9.jpg', 'Sastra', 'buku', 'Buku Populer', 17000, 'Koleksi sastra LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi sastra LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('aroma-karsa', 'Aroma Karsa', 'Dee Lestari', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/items/aroma-karsa-1_mfyoNpI.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('perahu-kertas', 'Perahu Kertas', 'Dee Lestari', 'Gramedia Digital', '-', '-', 0, 'https://static.mizanstore.com/d/img/book/cover/covBT-543.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('supernova-ksatria-puteri-dan-bintang-jatuh', 'Supernova: Ksatria, Puteri, dan Bintang Jatuh', 'Dee Lestari', 'Gramedia Digital', '-', '-', 0, 'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1249473779i/994156.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('ayat-ayat-cinta', 'Ayat-Ayat Cinta', 'Habiburrahman El Shirazy', 'Gramedia Digital', '-', '-', 0, 'https://upload.wikimedia.org/wikipedia/id/b/b4/Ayatayatcinta.jpg', 'Novel Religi', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel religi LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel religi LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('ketika-cinta-bertasbih', 'Ketika Cinta Bertasbih', 'Habiburrahman El Shirazy', 'Gramedia Digital', '-', '-', 0, 'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1489046749i/1456628.jpg', 'Novel Religi', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel religi LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel religi LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('hujan', 'Hujan', 'Tere Liye', 'Gramedia Digital', '-', '-', 0, 'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1451905281i/28446637.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('pulang-tere-liye', 'Pulang', 'Tere Liye', 'Gramedia Digital', '-', '-', 0, 'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1441194791i/26211806.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('pergi', 'Pergi', 'Tere Liye', 'Gramedia Digital', '-', '-', 0, 'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1522123452i/39643727.jpg', 'Novel', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('bumi', 'Bumi', 'Tere Liye', 'Gramedia Digital', '-', '-', 0, 'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1508413738i/31339471.jpg', 'Novel Remaja', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel remaja LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel remaja LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('bulan', 'Bulan', 'Tere Liye', 'Gramedia Digital', '-', '-', 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsQjWLQrV32AZgmWlLhH-wHPqbeeYrOtZlMg&s', 'Novel Remaja', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel remaja LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel remaja LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('matahari', 'Matahari', 'Tere Liye', 'Gramedia Digital', '-', '-', 0, 'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1467429925i/30827710.jpg', 'Novel Remaja', 'buku', 'Novel Rekomendasi', 17000, 'Koleksi novel remaja LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi novel remaja LiteraGo dengan referensi katalog Gramedia Digital.', null, 'cream'),
  ('koala-kumal', 'Koala Kumal', 'Raditya Dika', 'Gramedia Digital', '-', '-', 0, 'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1417492522i/23645640.jpg', 'Humor', 'buku', 'Buku Populer', 15000, 'Koleksi humor LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi humor LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('manusia-setengah-salmon', 'Manusia Setengah Salmon', 'Raditya Dika', 'Gramedia Digital', '-', '-', 0, 'https://upload.wikimedia.org/wikipedia/id/4/43/Manusia_Setengah_Salmon_film.jpg', 'Humor', 'buku', 'Buku Populer', 15000, 'Koleksi humor LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi humor LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('cinta-brontosaurus', 'Cinta Brontosaurus', 'Raditya Dika', 'Gramedia Digital', '-', '-', 0, 'https://upload.wikimedia.org/wikipedia/id/a/ad/Cinta_Brontosaurus_2.jpg', 'Humor', 'buku', 'Buku Populer', 15000, 'Koleksi humor LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi humor LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('home-cooking-ala-xander-s-kitchen', 'Home Cooking ala Xander''s Kitchen', 'Junita', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/items/9786020379074_Home-Cooking-ala-Xanders-Kitchen_100-Resep-Hits-di-Instagram.jpg', 'Kuliner', 'buku', 'Buku Populer', 15000, 'Koleksi kuliner LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi kuliner LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('kaum-supertajir-indonesia', 'Kaum Supertajir Indonesia', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://bintangpusnas.perpusnas.go.id/api25/public/api/get-image/979-168-093-0.jpg', 'Bisnis', 'buku', 'Buku Populer', 15000, 'Koleksi bisnis LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi bisnis LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('101-peluang-bisnis-sampingan-bagi-karyawan', '101 Peluang Bisnis Sampingan Bagi Karyawan', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://bukukita.com/babacms/displaybuku/22532.jpg', 'Bisnis', 'buku', 'Buku Populer', 15000, 'Koleksi bisnis LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi bisnis LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('mastering-facilitation', 'Mastering Facilitation', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJPFP6Qu2MniYJG2FwcOiQYszbB6VDITybpg&s', 'Bisnis', 'buku', 'Buku Populer', 15000, 'Koleksi bisnis LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi bisnis LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('teori-hukum-dari-eksistensi-ke-rekonstruksi', 'Teori Hukum: Dari Eksistensi ke Rekonstruksi', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCIBLdoP8z0BCwTJ82AR483PjI-gnetrAfMw&s', 'Hukum', 'buku', 'Buku Populer', 15000, 'Koleksi hukum LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi hukum LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('kisah-dan-hikmah-mikraj-rasulullah', 'Kisah dan Hikmah Mikraj Rasulullah', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/items/ID_SIS2015MTH08KDHMR_C.jpg', 'Religi', 'buku', 'Buku Populer', 15000, 'Koleksi religi LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi religi LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('sajen-dan-ritual-orang-jawa', 'Sajen dan Ritual Orang Jawa', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://image.gramedia.net/plain/https://s3-ap-southeast-1.amazonaws.com/ebook-previews/716/4172/1.jpg', 'Budaya', 'buku', 'Buku Populer', 15000, 'Koleksi budaya LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi budaya LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('love-chemistry', 'Love Chemistry', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://m.media-amazon.com/images/I/71PcV8jRAbL._UF1000,1000_QL80_.jpg', 'Psikologi', 'buku', 'Buku Populer', 15000, 'Koleksi psikologi LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi psikologi LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('super-top-no-1-tpa-dan-psikotes-masuk-smp-sma', 'Super Top No.1: TPA dan Psikotes Masuk SMP & SMA', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://bukukita.com/babacms/displaybuku/63771_f.jpg', 'Pendidikan', 'buku', 'Buku Populer', 15000, 'Koleksi pendidikan LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi pendidikan LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('why-series', 'Why? Series', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/items/9789792745436_Why-Series_The-Sea-Laut.jpg', 'Anak / Edukasi', 'buku', 'Buku Populer', 15000, 'Koleksi anak / edukasi LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi anak / edukasi LiteraGo dengan referensi katalog Gramedia Digital.', null, 'blue'),
  ('bobo', 'Bobo', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://imgx.gridstore.id/gridstore/frontend/asset/upload/emagz/bobo/cover/medium/bobo-22-2025-1756979191-bobo.webp', 'Majalah Anak', 'majalah', 'Majalah Populer', 8000, 'Koleksi majalah anak LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi majalah anak LiteraGo dengan referensi katalog Gramedia Digital.', null, 'green'),
  ('national-geographic-indonesia', 'National Geographic Indonesia', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/product-metas/rd591ppa-p.jpg', 'Majalah Pengetahuan', 'majalah', 'Majalah Populer', 8000, 'Koleksi majalah pengetahuan LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi majalah pengetahuan LiteraGo dengan referensi katalog Gramedia Digital.', null, 'green'),
  ('intisari', 'Intisari', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://upload.wikimedia.org/wikipedia/id/a/ac/Intisari_Januari_2012.jpg', 'Majalah Umum', 'majalah', 'Majalah Populer', 8000, 'Koleksi majalah umum LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi majalah umum LiteraGo dengan referensi katalog Gramedia Digital.', null, 'green'),
  ('trubus', 'Trubus', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://cdn.gramedia.com/uploads/items/Bundel_Trubus_2021_Vol.1.jpg', 'Majalah Hobi', 'majalah', 'Majalah Populer', 8000, 'Koleksi majalah hobi LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi majalah hobi LiteraGo dengan referensi katalog Gramedia Digital.', null, 'green'),
  ('otomotif', 'Otomotif', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://image.gramedia.net/plain/https://ebooks.gramedia.com/ebook-covers/2370/image_highres/ID_OTOM2025MTH02ED39.jpg', 'Majalah Otomotif', 'majalah', 'Majalah Populer', 8000, 'Koleksi majalah otomotif LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi majalah otomotif LiteraGo dengan referensi katalog Gramedia Digital.', null, 'green'),
  ('idea', 'Idea', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://a.cdn-myedisi.com/zine/cover/idea-a_5d429b76b4d11223680180.jpg', 'Majalah Rumah', 'majalah', 'Majalah Populer', 8000, 'Koleksi majalah rumah LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi majalah rumah LiteraGo dengan referensi katalog Gramedia Digital.', null, 'green'),
  ('saji', 'Saji', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://imgx.gridstore.id/gridstore/frontend/asset/upload/emagz/saji/body/862d8b666617e56c78a55ea399b3cfa5_img_0.jpg', 'Majalah Kuliner', 'majalah', 'Majalah Populer', 8000, 'Koleksi majalah kuliner LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi majalah kuliner LiteraGo dengan referensi katalog Gramedia Digital.', null, 'green'),
  ('nakita', 'Nakita', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj-jmhXAbHilTDWfpVbX1guuwbFfRhZYPg5PsSU7H52w2z8FeNgCEACw-X3CZ62qwelFKWsmrsA0vnjjsDsbD4jrsuApOvaH4HJK65m7zjtS8zv5np4sfP208EQpFqeGP9x_OGhsNzQMUM/s1600/parenting.JPG', 'Majalah Parenting', 'majalah', 'Majalah Populer', 8000, 'Koleksi majalah parenting LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi majalah parenting LiteraGo dengan referensi katalog Gramedia Digital.', null, 'green'),
  ('nova', 'Nova', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpvEZH6MG3XRSWyDobCREuIV0FbS1fwPxu0g&s', 'Majalah Wanita', 'majalah', 'Majalah Populer', 8000, 'Koleksi majalah wanita LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi majalah wanita LiteraGo dengan referensi katalog Gramedia Digital.', null, 'green'),
  ('kontan', 'Kontan', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://image.gramedia.net/plain/https://s3-ap-southeast-1.amazonaws.com/ebook-previews/482/326552/1.jpg', 'Majalah Bisnis', 'majalah', 'Majalah Populer', 8000, 'Koleksi majalah bisnis LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi majalah bisnis LiteraGo dengan referensi katalog Gramedia Digital.', null, 'green'),
  ('marketing', 'Marketing', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://online.fliphtml5.com/xzfda/tgca/files/thumb/f27bbb3cd56a091fb691b40f304ae4da.webp?1688800130', 'Majalah Bisnis', 'majalah', 'Majalah Populer', 8000, 'Koleksi majalah bisnis LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi majalah bisnis LiteraGo dengan referensi katalog Gramedia Digital.', null, 'green'),
  ('chip', 'Chip', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://library.polsri.ac.id/lib/minigalnano/createthumb.php?filename=images/docs/majalah245.jpg.jpg&width=200', 'Majalah Teknologi', 'majalah', 'Majalah Populer', 8000, 'Koleksi majalah teknologi LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi majalah teknologi LiteraGo dengan referensi katalog Gramedia Digital.', null, 'green'),
  ('kompas', 'Kompas', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://image.gramedia.net/plain/https://ebooks.gramedia.com/ebook-covers/1498/image_highres/ID_KOMPAS2026MTH03DT18U.jpg', 'Koran Nasional', 'koran', 'Koran Populer', 5000, 'Koleksi koran nasional LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi koran nasional LiteraGo dengan referensi katalog Gramedia Digital.', null, 'slate'),
  ('kontan-harian', 'Kontan Harian', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://fs-media.kontan.co.id/kstore/upload/brand_images/e5f3fd589afd66b07d4e43ae683baf65.jpg', 'Koran Bisnis', 'koran', 'Koran Populer', 5000, 'Koleksi koran bisnis LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi koran bisnis LiteraGo dengan referensi katalog Gramedia Digital.', null, 'slate'),
  ('tribun-jabar', 'Tribun Jabar', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvZO0Fl_yEoABf6FiQ-Yx3B_qzpPcYdZRosYoTR5vDQw&s', 'Koran Nasional', 'koran', 'Koran Populer', 5000, 'Koleksi koran nasional LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi koran nasional LiteraGo dengan referensi katalog Gramedia Digital.', null, 'slate'),
  ('jawa-pos', 'Jawa Pos', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://upload.wikimedia.org/wikipedia/id/6/64/Indonesia-jawa-pos.jpg', 'Koran Nasional', 'koran', 'Koran Populer', 5000, 'Koleksi koran nasional LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi koran nasional LiteraGo dengan referensi katalog Gramedia Digital.', null, 'slate'),
  ('warta-kota', 'Warta Kota', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShekhYupTjTf0oTxQcOzYpnKLmPgRViNibxg&s', 'Koran Daerah', 'koran', 'Koran Populer', 5000, 'Koleksi koran daerah LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi koran daerah LiteraGo dengan referensi katalog Gramedia Digital.', null, 'slate'),
  ('harian-surya', 'Harian Surya', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://image.gramedia.net/plain/https://ebooks.gramedia.com/ebook-covers/633/image_highres/ID_SURYA2025MTH10DT24.jpg', 'Koran Daerah', 'koran', 'Koran Populer', 5000, 'Koleksi koran daerah LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi koran daerah LiteraGo dengan referensi katalog Gramedia Digital.', null, 'slate'),
  ('sriwijaya-post', 'Sriwijaya Post', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://image.gramedia.net/plain/https://ebooks.gramedia.com/ebook-covers/632/image_highres/ID_SRIW2026MTH04DT13.jpg', 'Koran Daerah', 'koran', 'Koran Populer', 5000, 'Koleksi koran daerah LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi koran daerah LiteraGo dengan referensi katalog Gramedia Digital.', null, 'slate'),
  ('banjarmasin-post', 'Banjarmasin Post', 'Redaksi Gramedia Digital', 'Gramedia Digital', '-', '-', 0, 'https://image.gramedia.net/plain/https://ebooks.gramedia.com/ebook-covers/628/image_highres/ID_BJMP2026MTH04DT25.jpg', 'Koran Daerah', 'koran', 'Koran Populer', 5000, 'Koleksi koran daerah LiteraGo dengan referensi katalog Gramedia Digital.', 'Koleksi koran daerah LiteraGo dengan referensi katalog Gramedia Digital.', null, 'slate')
on conflict (id) do update set
  title = excluded.title,
  author = excluded.author,
  publisher = excluded.publisher,
  publish_date = excluded.publish_date,
  isbn = excluded.isbn,
  pages = excluded.pages,
  cover_url = excluded.cover_url,
  category = excluded.category,
  type = excluded.type,
  section = excluded.section,
  borrow_price = excluded.borrow_price,
  description = excluded.description,
  synopsis = excluded.synopsis,
  year = excluded.year,
  cover_tone = excluded.cover_tone,
  updated_at = now();

-- Stok otomatis dibuat untuk setiap item di semua perpustakaan.
insert into public.library_books (book_id, library_id, stock_total, stock_available)
select
  b.id,
  l.id,
  ((abs(hashtext(b.id || ':' || l.id)::bigint) % 5) + 1)::integer as stock_total,
  ((abs(hashtext(b.id || ':' || l.id)::bigint) % 5) + 1)::integer as stock_available
from public.books b
cross join public.libraries l
on conflict (book_id, library_id) do update set
  stock_total = excluded.stock_total,
  stock_available = least(public.library_books.stock_available, excluded.stock_total),
  updated_at = now();

commit;

-- Cek cepat setelah run:
-- select type, count(*) from public.books group by type order by type;
-- select count(*) as total_libraries from public.libraries;
-- select count(*) as total_stock_rows from public.library_books;

