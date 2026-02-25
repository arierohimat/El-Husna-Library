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
    Loader2,
    Library,
    MapPin,
    BookOpen,
    AlertCircle,
} from "lucide-react";

interface Bookshelf {
    id: string;
    name: string;
    location: string | null;
    description: string | null;
    _count: { books: number };
}

export default function BookshelvesPage() {
    const [user, setUser] = useState<any>(null);
    const [bookshelves, setBookshelves] = useState<Bookshelf[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selected, setSelected] = useState<Bookshelf | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const emptyForm = { name: "", location: "", description: "" };
    const [formData, setFormData] = useState(emptyForm);

    const isAdmin = user?.role === "ADMIN";

    useEffect(() => {
        fetch("/api/auth/session")
            .then((r) => r.json())
            .then((d) => setUser(d.user))
            .catch(() => setUser(null));
    }, []);

    useEffect(() => {
        if (user) fetchBookshelves();
    }, [user]);

    const fetchBookshelves = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/bookshelves");
            const data = await res.json();
            setBookshelves(data.bookshelves || []);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData(emptyForm);
        setError("");
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!formData.name.trim()) {
            setError("Nama rak buku wajib diisi");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/bookshelves", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Gagal menambahkan rak buku");
                return;
            }
            setIsAddOpen(false);
            resetForm();
            fetchBookshelves();
        } catch {
            setError("Terjadi kesalahan jaringan");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected) return;
        setError("");
        if (!formData.name.trim()) {
            setError("Nama rak buku wajib diisi");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/bookshelves/${selected.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Gagal mengupdate rak buku");
                return;
            }
            setIsEditOpen(false);
            setSelected(null);
            resetForm();
            fetchBookshelves();
        } catch {
            setError("Terjadi kesalahan jaringan");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selected) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/bookshelves/${selected.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Gagal menghapus rak buku");
                return;
            }
            setIsDeleteOpen(false);
            setSelected(null);
            fetchBookshelves();
        } catch {
            alert("Terjadi kesalahan jaringan");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) return null;

    return (
        <DashboardLayout userRole={user.role} userName={user.name}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Rak Buku</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Kelola rak buku perpustakaan
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => {
                                resetForm();
                                setIsAddOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Rak
                        </button>
                    )}
                </div>

                {/* Grid View */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="animate-spin text-emerald-500" size={28} />
                    </div>
                ) : bookshelves.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Library size={48} className="text-gray-300" />
                        <p className="text-sm text-gray-600">Belum ada rak buku</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bookshelves.map((shelf) => (
                            <div
                                key={shelf.id}
                                className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-emerald-50 rounded-xl">
                                        <Library className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    {isAdmin && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setSelected(shelf);
                                                    setFormData({
                                                        name: shelf.name,
                                                        location: shelf.location || "",
                                                        description: shelf.description || "",
                                                    });
                                                    setError("");
                                                    setIsEditOpen(true);
                                                }}
                                                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 transition"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelected(shelf);
                                                    setIsDeleteOpen(true);
                                                }}
                                                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-red-50 hover:text-red-600 transition"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <h3 className="text-base font-semibold text-gray-900 mb-1">
                                    {shelf.name}
                                </h3>

                                {shelf.location && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                                        <MapPin className="w-3 h-3" />
                                        {shelf.location}
                                    </p>
                                )}

                                {shelf.description && (
                                    <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                                        {shelf.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                    <BookOpen className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-semibold text-gray-700">
                                        {shelf._count.books} buku
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ADD / EDIT DIALOG */}
            <Dialog
                open={isAddOpen || isEditOpen}
                onOpenChange={(o) => {
                    if (!o) {
                        setIsAddOpen(false);
                        setIsEditOpen(false);
                        setSelected(null);
                        resetForm();
                    }
                }}
            >
                <DialogContent className="rounded-2xl max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900">
                            {isEditOpen ? "Edit Rak Buku" : "Tambah Rak Buku"}
                        </DialogTitle>
                        <DialogDescription>
                            Isi informasi rak buku perpustakaan
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <form
                        onSubmit={isEditOpen ? handleEdit : handleAdd}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Nama Rak <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                placeholder="Contoh: Rak A - Fiksi"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Lokasi
                            </label>
                            <input
                                value={formData.location}
                                onChange={(e) =>
                                    setFormData({ ...formData, location: e.target.value })
                                }
                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                placeholder="Contoh: Lantai 1, Baris 1"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Deskripsi
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                rows={3}
                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none"
                                placeholder="Deskripsi singkat rak buku"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold disabled:opacity-50"
                        >
                            {isSubmitting
                                ? "Menyimpan..."
                                : isEditOpen
                                    ? "Update Rak Buku"
                                    : "Simpan Rak Buku"}
                        </button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRMATION */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Rak Buku?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Anda yakin ingin menghapus "{selected?.name}"? Rak yang masih
                            memiliki buku tidak dapat dihapus.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isSubmitting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isSubmitting ? "Menghapus..." : "Hapus"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
}
