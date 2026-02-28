"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
    BookOpen,
    TrendingUp,
    Loader2,
    BookMarked,
    Clock,
    Plus,
    CheckCircle2,
    AlertCircle,
    Save,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

interface Book {
    id: string;
    title: string;
    author: string;
}

interface ReadingProgress {
    id: string;
    bookId: string;
    currentPage: number;
    totalPages: number;
    notes: string | null;
    updatedAt: string;
    book: Book;
}

interface Borrowing {
    id: string;
    bookId: string;
    status: string;
    book: Book;
}

export default function ReadingProgressPage() {
    const [user, setUser] = useState<any>(null);
    const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
    const [progressList, setProgressList] = useState<ReadingProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState<{ id: string, title: string } | null>(null);
    const [formData, setFormData] = useState({
        currentPage: "",
        totalPages: "",
        notes: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const router = useRouter();

    useEffect(() => {
        fetch("/api/auth/session")
            .then((r) => r.json())
            .then((d) => {
                if (!d.user) {
                    router.push("/");
                } else if (d.user.role !== "MEMBER") {
                    router.push("/dashboard/walikelas");
                } else {
                    setUser(d.user);
                }
            })
            .catch(() => router.push("/"));
    }, [router]);

    useEffect(() => {
        if (user?.role === "MEMBER") loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch active borrowings
            const bRes = await fetch("/api/borrowings?status=ACTIVE", { cache: "no-store" });
            const bData = await bRes.json();
            setBorrowings(bData.borrowings || []);

            // Fetch current progress
            const pRes = await fetch("/api/reading-progress", { cache: "no-store" });
            const pData = await pRes.json();
            setProgressList(pData.progress || []);
        } finally {
            setLoading(false);
        }
    };

    const openUpdate = (bookId: string, title: string) => {
        const current = progressList.find(p => p.bookId === bookId);
        setSelectedBook({ id: bookId, title });
        setFormData({
            currentPage: current?.currentPage.toString() || "",
            totalPages: current?.totalPages.toString() || "200", // Default or current
            notes: current?.notes || "",
        });
        setError("");
        setIsUpdateOpen(true);
    };

    const handleUpdateProgress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBook) return;

        const curr = parseInt(formData.currentPage);
        const total = parseInt(formData.totalPages);

        if (isNaN(curr) || isNaN(total)) {
            setError("Halaman harus berupa angka");
            return;
        }

        if (curr > total) {
            setError("Halaman saat ini tidak boleh lebih dari total halaman");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const res = await fetch("/api/reading-progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookId: selectedBook.id,
                    currentPage: curr,
                    totalPages: total,
                    notes: formData.notes,
                }),
            });

            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || "Gagal mengupdate progress");
            }

            setIsUpdateOpen(false);
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) return null;

    return (
        <DashboardLayout userRole={user.role} userName={user.name}>
            <div className="space-y-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                        <Loader2 size={32} className="animate-spin text-emerald-500" />
                        <p className="text-sm">Memuat data...</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {/* active readings */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <BookOpen className="text-emerald-600 w-5 h-5" />
                                Buku yang Sedang Dipinjam
                            </h3>

                            {borrowings.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <BookMarked className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500 font-medium">Anda tidak memiliki peminjaman aktif</p>
                                    <p className="text-xs text-gray-400 mt-1">Silakan pinjam buku di perpustakaan!</p>
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {borrowings.map((b) => {
                                        const progress = progressList.find(p => p.bookId === b.bookId);
                                        const percent = progress ? Math.round((progress.currentPage / progress.totalPages) * 100) : 0;

                                        return (
                                            <div key={b.id} className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-gray-900 truncate">{b.book.title}</h4>
                                                        <p className="text-xs text-gray-500 truncate">{b.book.author}</p>
                                                    </div>
                                                    <div className={`p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300`}>
                                                        {percent === 100 ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end mb-1">
                                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Progress</span>
                                                        <span className="text-xs font-bold text-gray-900">{percent}%</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-gray-400">
                                                        <span>{progress ? `${progress.currentPage} / ${progress.totalPages} Hal` : "0 / ? Hal"}</span>
                                                        <span>{progress ? `Terakhir: ${new Date(progress.updatedAt).toLocaleDateString("id-ID")}` : "Baru Pinjam"}</span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => openUpdate(b.bookId, b.book.title)}
                                                    className="w-full mt-6 py-2.5 bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 text-xs font-bold rounded-xl border border-gray-100 hover:border-emerald-100 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Plus size={14} />
                                                    {progress ? "Update Halaman" : "Mulai Catat"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* other reading hist */}
                        {progressList.filter(p => !borrowings.find(b => b.bookId === p.bookId)).length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Clock className="text-gray-400 w-5 h-5" />
                                    Buku yang Sudah Dikembalikan
                                </h3>
                                <div className="space-y-3">
                                    {progressList
                                        .filter(p => !borrowings.find(b => b.bookId === p.bookId))
                                        .map(p => (
                                            <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-50 bg-gray-50/30">
                                                <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center">
                                                    <BookOpen className="text-gray-300 w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-700 truncate">{p.book.title}</p>
                                                    <p className="text-[10px] text-gray-400">{p.book.author} • Selesai dibaca</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-bold text-emerald-600">{Math.round((p.currentPage / p.totalPages) * 100)}%</span>
                                                    <p className="text-[10px] text-gray-400">{p.currentPage}/{p.totalPages} Hal</p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* update dialog */}
            <Dialog
                open={isUpdateOpen}
                onOpenChange={(o) => {
                    setIsUpdateOpen(o);
                    if (!o) setSelectedBook(null);
                }}
            >
                <DialogContent className="rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900">Update Progress Baca</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            Masukkan halaman terakhir yang Anda baca untuk buku <span className="font-semibold text-emerald-600">"{selectedBook?.title}"</span>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateProgress} className="space-y-4 pt-2">
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                                <AlertCircle size={14} />
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Halaman Saat Ini</label>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
                                    placeholder="0"
                                    value={formData.currentPage}
                                    onChange={(e) => setFormData({ ...formData, currentPage: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Total Halaman</label>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
                                    placeholder="200"
                                    value={formData.totalPages}
                                    onChange={(e) => setFormData({ ...formData, totalPages: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Catatan Singkat (Opsional)</label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium resize-none"
                                placeholder="Apa yang Anda pelajari hari ini?"
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <button
                            disabled={isSubmitting}
                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            Simpan Progress
                        </button>
                    </form>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
