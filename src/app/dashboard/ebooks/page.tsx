"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Edit, FileText, Loader2, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { safeFetch } from "@/lib/safe-fetch";

type EBook = {
  id: string;
  title: string;
  author: string;
  publisher?: string | null;
  year?: number | null;
  category: string;
  description?: string | null;
  coverImage?: string | null;
  fileSize: number;
  fileName: string;
  accesses: { id: string }[];
  uploadedBy: { name: string };
};

const categories = ["Fiksi", "Sastra", "Pengembangan Diri", "Sains", "Sejarah", "Teknologi", "Pendidikan", "Lainnya"];

export default function EbooksPage() {
  const [user, setUser] = useState<any>(null);
  const [ebooks, setEbooks] = useState<EBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<EBook | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    author: "",
    publisher: "",
    year: "",
    category: categories[0],
    description: "",
    coverImage: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (query) params.set("search", query);
      if (category) params.set("category", category);
      const { ok, data } = await safeFetch(`/api/ebooks?${params}`);
      if (!ok) throw new Error(data.error || "Gagal memuat E-Book");
      setEbooks(data.ebooks || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || data.ebooks?.length || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    safeFetch("/api/auth/session").then(({ data }) => {
      if (data.user) setUser(data.user);
      else window.location.href = "/";
    });
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, category, page]);

  const filtered = useMemo(
    () =>
      ebooks.filter(
        (book) =>
          !query || `${book.title} ${book.author}`.toLowerCase().includes(query.toLowerCase())
      ),
    [ebooks, query]
  );

  const openAddForm = () => {
    setEditingBook(null);
    setForm({
      title: "",
      author: "",
      publisher: "",
      year: "",
      category: categories[0],
      description: "",
      coverImage: "",
    });
    setFile(null);
    setError("");
    setShowForm(true);
  };

  const openEditForm = (book: EBook) => {
    setEditingBook(book);
    setForm({
      title: book.title || "",
      author: book.author || "",
      publisher: book.publisher || "",
      year: book.year ? String(book.year) : "",
      category: book.category || categories[0],
      description: book.description || "",
      coverImage: book.coverImage || "",
    });
    setFile(null);
    setError("");
    setShowForm(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingBook && !file) {
      setError("Pilih berkas PDF terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    setError("");

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.set(key, value));
    if (file) {
      data.set("file", file);
    }

    try {
      const url = editingBook ? `/api/ebooks/${editingBook.id}` : "/api/ebooks";
      const method = editingBook ? "PUT" : "POST";
      const { ok, data: body } = await safeFetch(url, { method, body: data });

      if (!ok) throw new Error(body.error || "Proses simpan E-Book gagal");

      setShowForm(false);
      setEditingBook(null);
      setFile(null);
      setForm({
        title: "",
        author: "",
        publisher: "",
        year: "",
        category: categories[0],
        description: "",
        coverImage: "",
      });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus E-Book ini? Berkas PDF juga akan dihapus.")) return;
    const { ok, data } = await safeFetch(`/api/ebooks/${id}`, { method: "DELETE" });
    if (!ok) {
      setError(data.error || "Gagal menghapus E-Book");
      return;
    }
    load();
  };

  if (!user) return null;

  return (
    <DashboardLayout userRole={user.role} userName={user.name}>
      <div className="space-y-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Koleksi E-Book</h1>
            <p className="mt-1 text-gray-500">Baca koleksi digital perpustakaan dalam format PDF.</p>
          </div>
          {user.role === "ADMIN" && (
            <button
              onClick={openAddForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all"
            >
              <Plus className="h-5 w-5" /> Unggah E-Book
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
              placeholder="Cari judul atau penulis..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          >
            <option value="">Semua kategori</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white py-20 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 font-medium text-gray-600">Belum ada E-Book yang ditemukan.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((book) => (
                <article
                  key={book.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex h-44 items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
                      {book.coverImage ? (
                        <img src={book.coverImage} alt={book.title} className="h-full w-full object-cover" />
                      ) : (
                        <FileText className="h-16 w-16 text-emerald-500" />
                      )}
                    </div>
                    <div className="p-5">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {book.category}
                      </span>
                      <h2 className="mt-3 line-clamp-2 text-lg font-bold text-gray-900">{book.title}</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        {book.author}
                        {book.year ? ` · ${book.year}` : ""}
                      </p>
                      <p className="mt-3 text-xs text-gray-400">
                        PDF · {(book.fileSize / 1024 / 1024).toFixed(1)} MB{" "}
                        {book.accesses && book.accesses.length > 0 && "· Pernah dibaca"}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="mt-4 flex gap-2">
                      {user.role === "ADMIN" ? (
                        <>
                          <button
                            onClick={() => openEditForm(book)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <Edit className="h-4 w-4" /> Edit
                          </button>
                          <button
                            onClick={() => remove(book.id)}
                            className="rounded-xl border border-red-200 px-3 text-red-600 hover:bg-red-50 transition-colors"
                            aria-label="Hapus E-Book"
                            title="Hapus E-Book"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <Link
                          href={`/dashboard/ebooks/${book.id}`}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <BookOpen className="h-4 w-4" /> Baca E-Book
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalCount}
              itemsPerPage={10}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
          <form
            onSubmit={submit}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-bold">
                  {editingBook ? "Edit E-Book" : "Unggah E-Book"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {editingBook
                    ? "Ubah informasi E-Book atau ganti berkas PDF (opsional)."
                    : "Hanya PDF hingga 4.5 MB yang didukung (Serverless)."}
                </p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["title", "Judul"],
                ["author", "Penulis"],
                ["publisher", "Penerbit"],
                ["year", "Tahun terbit"],
              ].map(([key, label]) => (
                <label key={key} className="text-sm font-medium text-gray-700">
                  {label}
                  <input
                    required={key === "title" || key === "author"}
                    type={key === "year" ? "number" : "text"}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                  />
                </label>
              ))}

              <label className="text-sm font-medium text-gray-700">
                Kategori
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                >
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-gray-700">
                URL Cover Image (opsional)
                <input
                  value={form.coverImage}
                  onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                  placeholder="https://..."
                />
              </label>

              <label className="sm:col-span-2 text-sm font-medium text-gray-700">
                Deskripsi (opsional)
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1.5 min-h-20 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="sm:col-span-2 cursor-pointer rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors block">
                <Upload className="mx-auto mb-2 h-6 w-6" />
                {file
                  ? file.name
                  : editingBook
                  ? `Pilih berkas PDF baru jika ingin mengganti (${editingBook.fileName})`
                  : "Pilih berkas PDF"}
                <input
                  required={!editingBook}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    const picked = e.target.files?.[0] || null;
                    if (picked && picked.size > 4.5 * 1024 * 1024) {
                      setError("Ukuran berkas PDF melebihi 4.5 MB (Batas Serverless Vercel).");
                      setFile(null);
                      e.target.value = "";
                    } else {
                      setError("");
                      setFile(picked);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <div className="pt-4 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                disabled={submitting}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {submitting
                  ? "Menyimpan..."
                  : editingBook
                  ? "Update E-Book"
                  : "Simpan E-Book"}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}

