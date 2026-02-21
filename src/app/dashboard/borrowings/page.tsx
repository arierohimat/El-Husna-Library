"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Loader2,
  BookOpen,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

interface Book {
  id: string;
  title: string;
  stock: number;
}

interface Borrowing {
  id: string;
  dueDate: string;
  status: "ACTIVE" | "RETURNED" | "OVERDUE";
  penaltyType?: "ANALYSIS_TASK" | null;
  penaltyBook?: { title: string } | null;
  book: { title: string };
  user?: { name: string };
}

export default function BorrowingsPage() {
  const [user, setUser] = useState<any>(null);
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const [borrowOpen, setBorrowOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [selected, setSelected] = useState<Borrowing | null>(null);

  const [borrowBookId, setBorrowBookId] = useState("");
  const [borrowDate, setBorrowDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [penaltyBookId, setPenaltyBookId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "ADMIN";

  // Helper untuk format tanggal
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Helper untuk mengambil pesan error dari response
  const getErrorMessage = (data: any, defaultMsg: string): string => {
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (typeof data === "string") return data;
    return defaultMsg;
  };

  const isOverdue = (b?: Borrowing | null) =>
    !!b && b.status !== "RETURNED" && new Date(b.dueDate) < new Date();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadBorrowings();
    loadBooks();
  }, [user, search, status]);

  const loadBorrowings = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.append("search", search);
      if (status !== "all") p.append("status", status);

      const r = await fetch(`/api/borrowings?${p}`);
      const d = await r.json();
      setBorrowings(d.borrowings || []);
    } finally {
      setLoading(false);
    }
  };

  const loadBooks = async () => {
    try {
      const r = await fetch("/api/books?limit=100");
      const d = await r.json();
      setBooks(d.books || []);
    } catch (err) {
      console.error("Gagal memuat buku:", err);
    }
  };

  // Validasi form peminjaman
  const validateBorrowForm = () => {
    if (!borrowBookId) return "Pilih buku yang akan dipinjam";
    if (!borrowDate) return "Pilih tanggal peminjaman";
    if (!dueDate) return "Pilih tanggal jatuh tempo";
    if (new Date(borrowDate) > new Date(dueDate)) {
      return "Tanggal jatuh tempo harus setelah tanggal peminjaman";
    }
    return null;
  };

  const confirmBorrow = async () => {
    setError("");
    const validationError = validateBorrowForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/borrowings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: borrowBookId, borrowDate, dueDate }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(getErrorMessage(data, "Gagal meminjam buku"));
        return;
      }

      setBorrowOpen(false);
      setBorrowBookId("");
      setBorrowDate("");
      setDueDate("");
      setError("");
      loadBorrowings();
    } catch (err) {
      setError("Terjadi kesalahan jaringan. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmReturn = async () => {
    if (!selected) return;
    setError("");

    // Validasi untuk admin jika buku terlambat
    if (isAdmin && isOverdue(selected) && !penaltyBookId) {
      setError(
        "Pilih buku untuk tugas analisis sebagai konsekuensi keterlambatan",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/borrowings/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ penaltyBookId: penaltyBookId || null }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(getErrorMessage(data, "Gagal mengembalikan buku"));
        return;
      }

      setReturnOpen(false);
      setSelected(null);
      setPenaltyBookId("");
      setError("");
      loadBorrowings();
    } catch (err) {
      setError("Terjadi kesalahan jaringan. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hitung statistik
  const totalBorrowings = borrowings.length;
  const activeCount = borrowings.filter(
    (b) => b.status === "ACTIVE" && !isOverdue(b),
  ).length;
  const overdueCount = borrowings.filter((b) => isOverdue(b)).length;
  const returnedCount = borrowings.filter(
    (b) => b.status === "RETURNED",
  ).length;

  if (!user) return null;

  return (
    <DashboardLayout userRole={user.role} userName={user.name}>
      <div className="space-y-6">
        {/* STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<BookOpen className="text-emerald-600" />}
            label="Total Peminjaman"
            value={totalBorrowings}
          />
          <StatCard
            icon={<CheckCircle className="text-blue-600" />}
            label="Aktif"
            value={activeCount}
          />
          <StatCard
            icon={<AlertCircle className="text-orange-600" />}
            label="Terlambat"
            value={overdueCount}
          />
          <StatCard
            icon={<Clock className="text-gray-600" />}
            label="Dikembalikan"
            value={returnedCount}
          />
        </div>

        {/* FILTER BAR */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all placeholder:text-gray-400"
                placeholder="Cari buku atau anggota..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none cursor-pointer min-w-[160px]"
              >
                <option value="all">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="OVERDUE">Terlambat</option>
                <option value="RETURNED">Dikembalikan</option>
              </select>
            </div>

            {user.role === "MEMBER" && (
              <button
                onClick={() => {
                  setBorrowOpen(true);
                  setError("");
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm shadow-emerald-500/20 hover:shadow-md whitespace-nowrap"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Pinjam Buku
              </button>
            )}
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Daftar Peminjaman
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {loading
                  ? "Memuat..."
                  : `${borrowings.length} peminjaman ditemukan`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 size={28} className="animate-spin text-emerald-500" />
              <p className="text-sm">Memuat data peminjaman...</p>
            </div>
          ) : borrowings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-4 bg-gray-100 rounded-2xl">
                <BookOpen size={32} className="text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">
                  Belum ada data peminjaman
                </p>
                {user.role === "MEMBER" && (
                  <p className="text-xs text-gray-400 mt-1">
                    Klik tombol "Pinjam Buku" untuk meminjam
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="h-14">
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Buku
                    </th>

                    {isAdmin && (
                      <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Anggota
                      </th>
                    )}

                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Jatuh Tempo
                    </th>

                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>

                    {isAdmin && (
                      <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Konsekuensi
                      </th>
                    )}

                    {isAdmin && (
                      <th className="px-6 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {borrowings.map((b) => (
                    <tr key={b.id} className="h-16 hover:bg-gray-50 transition">
                      <td className="px-6 py-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {b.book.title}
                        </p>
                      </td>

                      {isAdmin && (
                        <td className="px-6 py-3 text-sm text-gray-700">
                          {b.user?.name}
                        </td>
                      )}

                      <td className="px-6 py-3 text-sm text-gray-700">
                        {formatDate(b.dueDate)}
                      </td>

                      <td className="px-6 py-3">
                        {b.status === "RETURNED" ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Dikembalikan
                          </span>
                        ) : isOverdue(b) ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
                            Terlambat
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            Aktif
                          </span>
                        )}
                      </td>

                      {isAdmin && (
                        <td className="px-6 py-3">
                          {b.penaltyType === "ANALYSIS_TASK" &&
                          b.penaltyBook ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-100">
                              Analisis: {b.penaltyBook.title}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      )}

                      {isAdmin && (
                        <td className="px-6 py-3 text-center">
                          {b.status !== "RETURNED" && (
                            <button
                              onClick={() => {
                                setSelected(b);
                                setPenaltyBookId("");
                                setError("");
                                setReturnOpen(true);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-150"
                            >
                              Kembalikan
                            </button>
                          )}
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

      {/* DIALOG PEMINJAMAN */}
      <Dialog
        open={borrowOpen}
        onOpenChange={(o) => {
          setBorrowOpen(o);
          if (!o) {
            setBorrowBookId("");
            setBorrowDate("");
            setDueDate("");
            setError("");
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Pinjam Buku
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Pilih buku dan tanggal peminjaman
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Pilih Buku
              </label>
              <select
                value={borrowBookId}
                onChange={(e) => setBorrowBookId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
              >
                <option value="">-- Pilih buku --</option>
                {books
                  .filter((b) => b.stock > 0)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} (Stok: {b.stock})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Tanggal Pinjam
              </label>
              <input
                type="date"
                value={borrowDate}
                onChange={(e) => setBorrowDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Jatuh Tempo
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
              />
            </div>

            <button
              onClick={confirmBorrow}
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Memproses...
                </>
              ) : (
                "Pinjam Buku"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG PENGEMBALIAN */}
      <AlertDialog open={returnOpen} onOpenChange={setReturnOpen}>
        <AlertDialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-gray-900">
              Konfirmasi Pengembalian
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600">
              {selected?.book.title}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 mt-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {isAdmin && isOverdue(selected) && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Buku Analisis <span className="text-red-500">*</span>
              </label>

              <select
                value={penaltyBookId}
                onChange={(e) => setPenaltyBookId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
              >
                <option value="">-- Pilih buku konsekuensi --</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>

              <p className="text-xs text-gray-400">
                Anggota wajib membuat analisis buku sebagai konsekuensi
                keterlambatan.
              </p>
            </div>
          )}

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel
              disabled={isSubmitting}
              className="rounded-xl border-gray-200 text-sm font-medium"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReturn}
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm shadow-emerald-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Memproses...
                </>
              ) : (
                "Konfirmasi Pengembalian"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

/* KOMPONEN STAT CARD */
function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="p-3 bg-gray-50 rounded-xl">{icon}</div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
