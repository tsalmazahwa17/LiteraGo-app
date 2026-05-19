import { isSupabaseConfigured, supabase } from "./supabase";
import { paymentMethods, userProfile } from "./data";

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di .env.local.");
  }
}

function getErrorMessage(error) {
  return error?.message || "Supabase belum dapat diakses.";
}

export function shouldUseSupabase() {
  return Boolean(isSupabaseConfigured && supabase);
}

export async function getSupabaseUser() {
  if (!shouldUseSupabase()) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user || null;
}

async function requireUser(message = "Silakan login terlebih dahulu.") {
  ensureSupabase();
  const authUser = await getSupabaseUser();
  if (!authUser) throw new Error(message);
  return authUser;
}

function titleCaseType(type = "Buku") {
  const value = String(type || "Buku").toLowerCase();
  if (value.includes("majalah")) return "Majalah";
  if (value.includes("koran") || value.includes("newspaper")) return "Koran";
  return "Buku";
}

function defaultSection(row) {
  const type = titleCaseType(row?.type || row?.collection_type);
  const category = row?.category || "";
  if (type === "Majalah") return "Majalah Populer";
  if (type === "Koran") return "Koran Populer";
  if (String(category).toLowerCase().includes("komik")) return "Komik Rekomendasi";
  if (String(category).toLowerCase().includes("novel")) return "Novel Rekomendasi";
  return "Buku Populer";
}

function normalizeLibrary(row = {}) {
  return {
    id: row.id,
    name: row.name || row.nama || "Perpustakaan",
    city: row.city || row.kota || "",
    province: row.province || row.provinsi || "",
    distance: row.distance || row.jarak || "-",
    address: row.address || row.alamat || "Alamat belum diisi",
    open: row.open || row.open_hours || row.jam_buka || "08.00 - 16.00",
    rating: Number(row.rating || 4.5)
  };
}

function getStockRows(row = {}) {
  const direct = row.library_books || row.libraryBooks || row.stocks || row.library_stock || [];
  return Array.isArray(direct) ? direct : [];
}

export function normalizeBook(row = {}) {
  const stockRows = getStockRows(row);
  const libraryIdsFromRows = stockRows
    .map((item) => item.library_id || item.libraryId || item.libraries?.id || item.library?.id)
    .filter(Boolean);
  const libraryIds = row.libraryIds || row.library_ids || libraryIdsFromRows;
  const libraryStocks = stockRows.reduce((acc, item) => {
    const id = item.library_id || item.libraryId || item.libraries?.id || item.library?.id;
    if (id) acc[id] = Number(item.stock_available ?? item.stock ?? item.available_stock ?? 0);
    return acc;
  }, row.libraryStocks || row.library_stocks || {});
  const totalStock = Object.values(libraryStocks).reduce((total, value) => total + Number(value || 0), 0);
  const publishDate = row.publishDate || row.publish_date || row.published_date || row.tanggal_terbit || "-";
  const year = row.year || (String(publishDate).match(/\d{4}/)?.[0] || "");

  return {
    id: row.id,
    title: row.title || row.judul || "Tanpa Judul",
    author: row.author || row.penulis || "Penulis belum diisi",
    category: row.category || row.kategori || "Umum",
    type: titleCaseType(row.type || row.collection_type || row.jenis),
    section: row.section || row.section_name || defaultSection(row),
    libraryIds,
    libraryStocks,
    stock: Number(row.stock ?? row.stock_available ?? totalStock ?? 0),
    price: Number(row.price ?? row.borrow_price ?? row.biaya_pinjam ?? 0),
    year,
    publisher: row.publisher || row.penerbit || "Penerbit belum diisi",
    publishDate,
    isbn: row.isbn || "-",
    pages: row.pages || row.halaman || row.page_count || 0,
    coverTone: row.coverTone || row.cover_tone || "blue",
    coverImage: row.coverImage || row.cover_url || row.cover || row.image_url || "",
    description: row.description || row.sinopsis || "",
    synopsis: row.synopsis || row.description || row.sinopsis || "",
    tags: row.tags || []
  };
}

export async function fetchBooks({ libraryId, type, category, section, query, limit } = {}) {
  ensureSupabase();

  let request = supabase
    .from("books")
    .select(`
      *,
      library_books (
        stock_available,
        stock_total,
        library_id,
        libraries (id, name, address, city, province, distance, open_hours, rating)
      )
    `)
    .order("title", { ascending: true });

  if (type && type !== "Semua") request = request.eq("type", type.toLowerCase());
  if (category && category !== "Semua") request = request.eq("category", category);
  if (section && section !== "Semua") request = request.eq("section", section);
  if (query?.trim()) {
    const q = query.trim().replaceAll(",", " ");
    request = request.or(`title.ilike.%${q}%,author.ilike.%${q}%,publisher.ilike.%${q}%,category.ilike.%${q}%,isbn.ilike.%${q}%`);
  }
  if (limit) request = request.limit(limit);

  const { data, error } = await request;
  if (error) throw error;

  let normalized = (data || []).map(normalizeBook);
  if (libraryId) normalized = normalized.filter((book) => book.libraryIds.includes(libraryId));
  return normalized;
}

export async function fetchBookById(id) {
  ensureSupabase();
  const { data, error } = await supabase
    .from("books")
    .select(`
      *,
      library_books (
        stock_available,
        stock_total,
        library_id,
        libraries (id, name, address, city, province, distance, open_hours, rating)
      )
    `)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeBook(data) : null;
}

export async function fetchLibraries() {
  ensureSupabase();
  const { data, error } = await supabase.from("libraries").select("*").order("province", { ascending: true }).order("city", { ascending: true }).order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizeLibrary);
}

export async function fetchLibraryById(id) {
  if (!id) return null;
  ensureSupabase();
  const { data, error } = await supabase.from("libraries").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeLibrary(data) : null;
}

export async function getSelectedLibraryDb() {
  ensureSupabase();
  const authUser = await getSupabaseUser();
  if (authUser) {
    const { data, error } = await supabase
      .from("profiles")
      .select("selected_library_id")
      .eq("id", authUser.id)
      .maybeSingle();
    if (!error && data?.selected_library_id) {
      const selected = await fetchLibraryById(data.selected_library_id);
      if (selected) return selected;
    }
  }

  const { data, error } = await supabase.from("libraries").select("*").order("name", { ascending: true }).limit(1);
  if (error) throw error;
  return data?.[0] ? normalizeLibrary(data[0]) : null;
}

export async function setSelectedLibraryDb(library) {
  const authUser = await requireUser("Silakan login terlebih dahulu untuk memilih perpustakaan.");
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: authUser.id, selected_library_id: library.id, email: authUser.email }, { onConflict: "id" });
  if (error) throw error;
  return library;
}

export function getBookStock(book, libraryId) {
  if (!book || !libraryId) return 0;
  return Number(book.libraryStocks?.[libraryId] ?? book.stock_available ?? book.stock ?? 0);
}

export function getTotalStock(book) {
  if (!book) return 0;
  const values = Object.values(book.libraryStocks || {});
  if (values.length) return values.reduce((total, value) => total + Number(value || 0), 0);
  return Number(book.stock_available ?? book.stock ?? 0);
}

export async function fetchCurrentUser() {
  ensureSupabase();
  const authUser = await getSupabaseUser();
  if (!authUser) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
  if (error) throw error;
  const metadata = authUser.user_metadata || {};
  return {
    ...userProfile,
    id: authUser.id,
    username: data?.username || metadata.username || metadata.name || metadata.full_name || authUser.email?.split("@")[0] || "User",
    name: data?.name || metadata.full_name || metadata.name || authUser.email?.split("@")[0] || "User",
    email: authUser.email || data?.email || "",
    phone: data?.phone || "",
    birthDate: data?.birth_date || "",
    avatarUrl: data?.avatar_url || metadata.avatar_url || metadata.picture || "",
    provider: authUser.app_metadata?.provider || "supabase"
  };
}

export async function updateCurrentUser(profile) {
  const authUser = await requireUser("Silakan login terlebih dahulu untuk memperbarui profil.");
  const payload = {
    id: authUser.id,
    username: profile.username || authUser.email?.split("@")[0] || "User",
    name: profile.name || profile.username || authUser.email?.split("@")[0] || "User",
    email: authUser.email || profile.email || "",
    phone: profile.phone || "",
    birth_date: profile.birthDate || null,
    avatar_url: profile.avatarUrl || null
  };
  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) throw error;
  return { ...profile, id: authUser.id, email: payload.email };
}

export async function fetchWishlistIds() {
  const authUser = await getSupabaseUser();
  if (!authUser) return [];
  const { data, error } = await supabase
    .from("wishlists")
    .select("book_id")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((item) => item.book_id);
}

export async function toggleWishlistDb(bookId) {
  const authUser = await requireUser("Silakan login terlebih dahulu untuk memakai wishlist.");
  const { data: existing, error: checkError } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", authUser.id)
    .eq("book_id", bookId)
    .maybeSingle();
  if (checkError) throw checkError;

  if (existing?.id) {
    const { error } = await supabase.from("wishlists").delete().eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("wishlists").insert({ user_id: authUser.id, book_id: bookId });
    if (error) throw error;
  }
  return fetchWishlistIds();
}

export async function setWishlistDb(ids) {
  const authUser = await requireUser("Silakan login terlebih dahulu untuk mengubah wishlist.");
  const { error: deleteError } = await supabase.from("wishlists").delete().eq("user_id", authUser.id);
  if (deleteError) throw deleteError;
  if (ids.length) {
    const { error } = await supabase.from("wishlists").insert(ids.map((bookId) => ({ user_id: authUser.id, book_id: bookId })));
    if (error) throw error;
  }
  return ids;
}

export async function fetchCartItems() {
  const authUser = await getSupabaseUser();
  if (!authUser) return [];
  const { data, error } = await supabase
    .from("cart_items")
    .select("book_id, library_id, qty, return_date")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((item) => ({
    bookId: item.book_id,
    libraryId: item.library_id,
    qty: item.qty || 1,
    returnDate: item.return_date
  }));
}

async function fetchAvailableStock(bookId, libraryId) {
  const { data, error } = await supabase
    .from("library_books")
    .select("stock_available")
    .eq("book_id", bookId)
    .eq("library_id", libraryId)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.stock_available || 0);
}

export async function addToCartDb(bookId, libraryId) {
  const authUser = await requireUser("Silakan login terlebih dahulu sebelum meminjam item.");
  const defaultReturnDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const availableStock = await fetchAvailableStock(bookId, libraryId);
  if (availableStock <= 0) throw new Error("Stok item sudah habis di perpustakaan ini.");

  const { data: existing, error: checkError } = await supabase
    .from("cart_items")
    .select("qty, library_id")
    .eq("user_id", authUser.id)
    .eq("book_id", bookId)
    .maybeSingle();
  if (checkError) throw checkError;

  if (existing) {
    const maxAllowed = Math.min(availableStock, 3);
    const nextQty = Number(existing.qty || 1) + 1;
    if (nextQty > maxAllowed) {
      throw new Error(`Stok item di perpustakaan ini hanya ${availableStock} pcs.`);
    }
    const { error } = await supabase
      .from("cart_items")
      .update({ qty: nextQty, library_id: libraryId })
      .eq("user_id", authUser.id)
      .eq("book_id", bookId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("cart_items").insert({
      user_id: authUser.id,
      book_id: bookId,
      library_id: libraryId,
      qty: 1,
      return_date: defaultReturnDate
    });
    if (error) throw error;
  }
  return fetchCartItems();
}

export async function updateCartItemDb(bookId, updates) {
  const authUser = await requireUser("Silakan login terlebih dahulu untuk mengubah keranjang.");
  const { data: current, error: currentError } = await supabase
    .from("cart_items")
    .select("library_id")
    .eq("user_id", authUser.id)
    .eq("book_id", bookId)
    .maybeSingle();
  if (currentError) throw currentError;

  const targetLibraryId = updates.libraryId || current?.library_id;
  const payload = {};
  if (updates.qty !== undefined) {
    const availableStock = await fetchAvailableStock(bookId, targetLibraryId);
    const maxAllowed = Math.min(Math.max(availableStock, 1), 3);
    if (availableStock <= 0) throw new Error("Stok item sudah habis di perpustakaan ini.");
    if (Number(updates.qty) > maxAllowed) throw new Error(`Stok item di perpustakaan ini hanya ${availableStock} pcs.`);
    payload.qty = Number(updates.qty);
  }
  if (updates.returnDate !== undefined) payload.return_date = updates.returnDate;
  if (updates.libraryId !== undefined) payload.library_id = updates.libraryId;
  const { error } = await supabase.from("cart_items").update(payload).eq("user_id", authUser.id).eq("book_id", bookId);
  if (error) throw error;
  return fetchCartItems();
}

export async function removeCartItemDb(bookId) {
  const authUser = await requireUser("Silakan login terlebih dahulu untuk menghapus item keranjang.");
  const { error } = await supabase.from("cart_items").delete().eq("user_id", authUser.id).eq("book_id", bookId);
  if (error) throw error;
  return fetchCartItems();
}

export async function saveCheckoutDraftDb(payload) {
  const authUser = await requireUser("Silakan login terlebih dahulu untuk melanjutkan checkout.");
  const { error } = await supabase.from("checkout_sessions").upsert({
    user_id: authUser.id,
    payload
  }, { onConflict: "user_id" });
  if (error) throw error;
  return payload;
}

export async function getCheckoutDraftDb() {
  const authUser = await getSupabaseUser();
  if (!authUser) return null;
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select("payload")
    .eq("user_id", authUser.id)
    .maybeSingle();
  if (error) throw error;
  return data?.payload || null;
}

export async function clearCheckoutDraftDb() {
  const authUser = await getSupabaseUser();
  if (!authUser) return;
  await supabase.from("checkout_sessions").delete().eq("user_id", authUser.id);
}

export async function checkoutWithSupabase(draft, methodLabel) {
  await requireUser("Kamu harus login memakai Supabase Auth dulu agar stok database bisa otomatis berkurang.");
  const items = draft.items || [];
  if (!items.length) throw new Error("Keranjang kosong.");

  const { data, error } = await supabase.rpc("checkout_cart", {
    p_items: items.map((item) => ({
      book_id: item.bookId,
      library_id: item.libraryId || draft.libraryId,
      qty: item.qty || 1,
      return_date: item.returnDate
    })),
    p_pickup_date: draft.pickupDate,
    p_pickup_time: draft.pickupTime,
    p_payment_method: methodLabel
  });

  if (error) throw error;
  await clearCartDb();
  await clearCheckoutDraftDb();
  return data;
}

export async function clearCartDb() {
  const authUser = await getSupabaseUser();
  if (!authUser) return;
  const { error } = await supabase.from("cart_items").delete().eq("user_id", authUser.id);
  if (error) throw error;
}

export async function fetchBorrowings() {
  const authUser = await getSupabaseUser();
  if (!authUser) return [];
  const { data, error } = await supabase
    .from("borrowings")
    .select(`
      *,
      books (*),
      libraries (*)
    `)
    .eq("user_id", authUser.id)
    .order("borrowed_at", { ascending: false });
  if (error) throw error;

  return (data || []).map((item) => ({
    id: item.id,
    status: item.status === "active" ? "Lunas" : item.status || "Lunas",
    paymentMethod: item.payment_method || item.paymentMethod || "-",
    libraryId: item.library_id,
    createdAt: String(item.borrowed_at || item.created_at || "").slice(0, 10),
    pickupDate: item.pickup_date || item.pickupDate || String(item.borrowed_at || "").slice(0, 10),
    pickupTime: item.pickup_time || item.pickupTime || "12:00",
    returnDate: item.return_date || item.due_at || "",
    subtotal: item.price || 0,
    total: item.total || item.price || 0,
    items: [item.book_id].filter(Boolean),
    books: item.books ? [normalizeBook(item.books)] : [],
    library: item.libraries ? normalizeLibrary(item.libraries) : null
  }));
}

export async function fetchLastInvoice() {
  const borrowings = await fetchBorrowings();
  return borrowings?.[0] || null;
}

export async function fetchNotifications() {
  const authUser = await getSupabaseUser();
  if (!authUser) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body || item.message,
    date: item.date || new Intl.DateTimeFormat("id-ID").format(new Date(item.created_at || Date.now())),
    type: item.type || "success"
  }));
}

export { paymentMethods, getErrorMessage };
