"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  BookOpen,
  Loader2,
  Package,
  Library,
  BookMarked,
  Filter,
  ChevronDown,
  AlertCircle,
  Upload,
} from "lucide-react";

interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  year: number;
  category: string;
  stock: number;
  coverImage?: string | null;
  bookshelfId?: string | null;
  bookshelf?: { id: string; name: string } | null;
}

interface Bookshelf {
  id: string;
  name: string;
}

const CATEGORIES = [
  "Fiksi",
  "Sastra",
  "Pengembangan Diri",
  "Sains",
  "Sejarah",
  "Teknologi",
  "Lainnya",
];

// Komponen Form terpisah agar tidak dibuat ulang setiap render
interface BookFormProps {
  onSubmit: (e: React.FormEvent) => void;
  label: string;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  error: string;
  isSubmitting: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  bookshelves: Bookshelf[];
}

function BookForm({
  onSubmit,
  label,
  formData,
  setFormData,
  error,
  isSubmitting,
  handleFileChange,
  bookshelves,
}: BookFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-1">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            ISBN
          </label>
          <input
            required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
            placeholder="978-..."
            value={formData.isbn}
            onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Kategori
          </label>
          <select
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all cursor-pointer"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Judul Buku
        </label>
        <input
          required
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
          placeholder="Judul lengkap buku"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Penulis
        </label>
        <input
          required
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
          placeholder="Nama penulis"
          value={formData.author}
          onChange={(e) => setFormData({ ...formData, author: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Penerbit
          </label>
          <input
            required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
            placeholder="Nama penerbit"
            value={formData.publisher}
            onChange={(e) =>
              setFormData({ ...formData, publisher: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Tahun Terbit
          </label>
          <input
            required
            type="number"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
            placeholder="2024"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Jumlah Stok
          </label>
          <input
            required
            type="number"
            min="0"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
            placeholder="0"
            value={formData.stock}
            onChange={(e) =>
              setFormData({ ...formData, stock: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Upload Cover
          </label>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer flex-1">
              <div className="flex items-center gap-2 px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all">
                <Upload size={16} className="text-gray-500" />
                <span className="text-gray-600 truncate">
                  {formData.coverImage ? "Gambar dipilih" : "Pilih file..."}
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {formData.coverImage && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, coverImage: "" })}
                className="text-xs text-red-600 hover:underline"
              >
                Hapus
              </button>
            )}
          </div>
          {formData.coverImage && (
            <img
              src={formData.coverImage}
              alt="Preview"
              className="mt-2 w-16 h-20 object-cover rounded-lg shadow-sm"
            />
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Rak Buku
        </label>
        <select
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all cursor-pointer"
          value={formData.bookshelfId}
          onChange={(e) =>
            setFormData({ ...formData, bookshelfId: e.target.value })
          }
        >
          <option value="">-- Tanpa Rak --</option>
          {bookshelves.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full mt-1 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Menyimpan...
          </>
        ) : (
          label
        )}
      </button>
    </form>
  );
}

export default function BooksPage() {
  const [user, setUser] = useState<any>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookshelves, setBookshelves] = useState<Bookshelf[]>([]);
  const [bookshelfFilter, setBookshelfFilter] = useState("all");

  const emptyForm = {
    isbn: "",
    title: "",
    author: "",
    publisher: "",
    year: "",
    category: "Fiksi",
    stock: "",
    coverImage: "",
    bookshelfId: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchBooks, 400);
    return () => clearTimeout(t);
  }, [search, category, bookshelfFilter]);

  useEffect(() => {
    fetchBookshelves();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search.trim()) p.append("search", search.trim());
      if (category !== "all") p.append("category", category);
      if (bookshelfFilter !== "all") p.append("bookshelfId", bookshelfFilter);
      const res = await fetch(`/api/books?${p}`);
      const data = await res.json();
      setBooks(data.books || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookshelves = async () => {
    try {
      const res = await fetch("/api/bookshelves");
      const data = await res.json();
      setBookshelves(data.bookshelves?.map((s: any) => ({ id: s.id, name: s.name })) || []);
    } catch { }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setError("");
  };

  // Validasi client-side yang lebih ketat
  const validateForm = (isEdit: boolean) => {
    if (!formData.isbn.trim()) return "ISBN harus diisi";
    if (!formData.title.trim()) return "Judul buku harus diisi";
    if (!formData.author.trim()) return "Penulis harus diisi";
    if (!formData.publisher.trim()) return "Penerbit harus diisi";

    if (!formData.year.trim()) return "Tahun terbit harus diisi";
    const yearNum = parseInt(formData.year);
    if (
      isNaN(yearNum) ||
      yearNum < 1000 ||
      yearNum > new Date().getFullYear() + 5
    ) {
      return "Tahun terbit tidak valid";
    }

    if (!formData.stock.trim()) return "Stok harus diisi";
    const stockNum = parseInt(formData.stock);
    if (isNaN(stockNum) || stockNum < 0) return "Stok harus angka positif";

    return null;
  };

  // Helper untuk mengambil pesan error dari response
  const getErrorMessage = (data: any, defaultMsg: string): string => {
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (typeof data === "string") return data;
    return defaultMsg;
  };

  // Konversi file ke base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi ukuran (maks 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, coverImage: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm(false);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      ...formData,
      year: parseInt(formData.year),
      stock: parseInt(formData.stock),
      coverImage: formData.coverImage || null,
    };

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("Response add:", { status: res.status, data });

      if (!res.ok) {
        setError(getErrorMessage(data, "Gagal menambahkan buku"));
        return;
      }

      setIsAddOpen(false);
      resetForm();
      fetchBooks();
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan jaringan. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    setError("");

    const validationError = validateForm(true);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      ...formData,
      year: parseInt(formData.year),
      stock: parseInt(formData.stock),
      coverImage: formData.coverImage || null,
    };

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/books/${selectedBook.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("Response edit:", { status: res.status, data });

      if (!res.ok) {
        setError(getErrorMessage(data, "Gagal mengupdate buku"));
        return;
      }

      setIsEditOpen(false);
      setSelectedBook(null);
      resetForm();
      fetchBooks();
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan jaringan. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBook) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/books/${selectedBook.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(getErrorMessage(data, "Gagal menghapus buku"));
        return;
      }

      setIsDeleteOpen(false);
      setSelectedBook(null);
      fetchBooks();
    } catch (err) {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (book: Book) => {
    setSelectedBook(book);
    setFormData({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      year: book.year.toString(),
      category: book.category,
      stock: book.stock.toString(),
      coverImage: book.coverImage || "",
      bookshelfId: book.bookshelfId || "",
    });
    setError("");
    setIsEditOpen(true);
  };

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const totalTitles = books.length;
  const totalStock = books.reduce((a, b) => a + b.stock, 0);
  const availableBooks = books.filter((b) => b.stock > 0).length;

  if (!user) return null;

  return (
    <DashboardLayout userRole={user.role} userName={user.name}>
      <div className="space-y-6">
        {/* Stat Cards (tetap sama) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <Library className="w-6 h-6 text-emerald-600" strokeWidth={2} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Total Judul</p>
              <p className="text-2xl font-bold text-gray-900">{totalTitles}</p>
              <p className="text-xs text-gray-500">Koleksi perpustakaan</p>
            </div>
          </div>

          <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Package className="w-6 h-6 text-blue-600" strokeWidth={2} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Total Stok</p>
              <p className="text-2xl font-bold text-gray-900">{totalStock}</p>
              <p className="text-xs text-gray-500">Seluruh eksemplar</p>
            </div>
          </div>

          <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-amber-50 rounded-xl">
                <BookOpen className="w-6 h-6 text-amber-600" strokeWidth={2} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Tersedia</p>
              <p className="text-2xl font-bold text-gray-900">
                {availableBooks}
              </p>
              <p className="text-xs text-gray-500">Judul siap dipinjam</p>
            </div>
          </div>
        </div>

        {/* Filter Bar (tetap sama) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all placeholder:text-gray-400"
                placeholder="Cari judul, penulis, atau ISBN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                className="pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none cursor-pointer min-w-[180px]"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">Semua Kategori</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <select
                className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none cursor-pointer min-w-[180px]"
                value={bookshelfFilter}
                onChange={(e) => setBookshelfFilter(e.target.value)}
              >
                <option value="all">Semua Rak</option>
                {bookshelves.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm shadow-emerald-500/20 hover:shadow-md whitespace-nowrap"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Tambah Buku
              </button>
            )}
          </div>
        </div>

        {/* Table Card (tetap sama) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Daftar Koleksi
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {loading ? "Memuat..." : `${books.length} judul ditemukan`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 size={28} className="animate-spin text-emerald-500" />
              <p className="text-sm">Memuat data koleksi...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-4 bg-gray-100 rounded-2xl">
                <BookMarked size={32} className="text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">
                  Tidak ada buku ditemukan
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Coba ubah kata kunci atau filter kategori
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="h-14">
                    <th className="px-6 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider align-middle">
                      Cover
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider align-middle">
                      Judul & ISBN
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider align-middle">
                      Penulis
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider align-middle">
                      Kategori
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider align-middle">
                      Rak Buku
                    </th>
                    <th className="px-6 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider align-middle">
                      Stok
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider align-middle">
                      Status
                    </th>
                    {isAdmin && (
                      <th className="px-8 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider align-middle">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {books.map((book) => (
                    <tr
                      key={book.id}
                      className="h-16 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-3">
                        {book.coverImage ? (
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            className="w-9 h-12 object-cover rounded-lg shadow-sm"
                          />
                        ) : (
                          <div className="w-9 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center">
                            <BookOpen size={14} className="text-emerald-500" />
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">
                          {book.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">
                          {book.isbn}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">{book.author}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {book.year}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                          {book.category}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">
                          {book.bookshelf?.name || "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold text-gray-700">
                          {book.stock}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {book.stock > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Tersedia
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Habis
                          </span>
                        )}
                      </td>

                      {isAdmin && (
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(book)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-150"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBook(book);
                                setIsDeleteOpen(true);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all duration-150"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(o) => {
          setIsAddOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Tambah Buku Baru
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Isi informasi lengkap buku untuk ditambahkan ke katalog
              perpustakaan
            </DialogDescription>
          </DialogHeader>
          <BookForm
            onSubmit={handleAdd}
            label="Simpan ke Katalog"
            formData={formData}
            setFormData={setFormData}
            error={error}
            isSubmitting={isSubmitting}
            handleFileChange={handleFileChange}
            bookshelves={bookshelves}
          />
        </DialogContent>
      </Dialog>
      {/* Edit Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(o) => {
          setIsEditOpen(o);
          if (!o) {
            setSelectedBook(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Edit Data Buku
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Perbarui informasi buku yang dipilih
            </DialogDescription>
          </DialogHeader>
          <BookForm
            onSubmit={handleEdit}
            label="Simpan Perubahan"
            formData={formData}
            setFormData={setFormData}
            error={error}
            isSubmitting={isSubmitting}
            handleFileChange={handleFileChange}
            bookshelves={bookshelves}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-gray-900">
              Hapus Buku?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600">
              Anda akan menghapus{" "}
              <span className="font-semibold text-gray-800">
                "{selectedBook?.title}"
              </span>{" "}
              secara permanen dari katalog. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-gray-200 text-sm font-medium">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-sm shadow-red-500/20"
            >
              Ya, Hapus Buku
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
