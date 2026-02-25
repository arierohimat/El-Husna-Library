"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
    BookOpen,
    Users,
    AlertCircle,
    Eye,
    Loader2,
    BookMarked,
    Clock,
    TrendingUp,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface StudentStats {
    totalBorrowed: number;
    booksReturned: number;
    booksActive: number;
    booksOverdue: number;
    totalFine: number;
}

interface ReadingProgress {
    id: string;
    currentPage: number;
    totalPages: number;
    notes: string | null;
    updatedAt: string;
    book: {
        id: string;
        title: string;
        author: string;
    };
}

interface Borrowing {
    id: string;
    status: string;
    borrowDate: string;
    dueDate: string;
    returnDate: string | null;
    fine: number;
    book: {
        id: string;
        title: string;
        author: string;
    };
}

interface Student {
    id: string;
    name: string;
    username: string;
    email: string;
    kelas: string;
    stats: StudentStats;
    borrowings: Borrowing[];
    readingProgress: ReadingProgress[];
}

interface MonitoringData {
    kelas: string;
    totalStudents: number;
    students: Student[];
}

export default function WalikelasMonitoringPage() {
    const [user, setUser] = useState<any>(null);
    const [data, setData] = useState<MonitoringData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

    const router = useRouter();

    useEffect(() => {
        fetch("/api/auth/session")
            .then((r) => r.json())
            .then((d) => {
                if (!d.user) {
                    router.push("/");
                } else if (d.user.role !== "WALIKELAS") {
                    router.push("/dashboard/" + d.user.role.toLowerCase());
                } else {
                    setUser(d.user);
                }
            })
            .catch(() => router.push("/"));
    }, [router]);

    useEffect(() => {
        if (user?.role === "WALIKELAS") loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/monitoring");
            const d = await res.json();
            setData(d);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) =>
        `Rp ${amount.toLocaleString("id-ID")}`;

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });

    const getProgressPercent = (current: number, total: number) => {
        if (total === 0) return 0;
        return Math.min(Math.round((current / total) * 100), 100);
    };

    if (!user) return null;

    return (
        <DashboardLayout userRole={user.role} userName={user.name}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Monitoring Detail Siswa
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Laporan lengkap aktivitas literasi siswa kelas <span className="font-semibold text-emerald-600">{data?.kelas || user.kelas}</span>
                        </p>
                    </div>
                </div>

                {/* Student List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">
                                Daftar Siswa
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {loading
                                    ? "Memuat..."
                                    : `${data?.totalStudents || 0} siswa terdaftar`}
                            </p>
                        </div>
                        <button
                            onClick={loadData}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Refresh Data
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 size={28} className="animate-spin text-emerald-500" />
                            <p className="text-sm text-gray-400">Memuat data monitoring...</p>
                        </div>
                    ) : !data || !data.students || data.students.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Users size={32} className="text-gray-300" />
                            <p className="text-sm text-gray-600">
                                Belum ada siswa di kelas ini atau data tidak tersedia
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {data.students.map((student) => (
                                <div key={student.id}>
                                    {/* Student Row */}
                                    <div
                                        className={`px-6 py-4 hover:bg-gray-50 transition cursor-pointer ${expandedStudent === student.id ? "bg-emerald-50/30" : ""}`}
                                        onClick={() =>
                                            setExpandedStudent(
                                                expandedStudent === student.id ? null : student.id,
                                            )
                                        }
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow">
                                                    {student.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                                        {student.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {student.username} • {student.email}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 sm:gap-6 text-center">
                                                <div className="hidden sm:block">
                                                    <p className="text-xs text-gray-500">Dipinjam</p>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {student.stats.totalBorrowed}
                                                    </p>
                                                </div>
                                                <div className="hidden sm:block">
                                                    <p className="text-xs text-gray-500">Selesai</p>
                                                    <p className="text-sm font-bold text-emerald-600">
                                                        {student.stats.booksReturned}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Aktif</p>
                                                    <p className="text-sm font-bold text-blue-600">
                                                        {student.stats.booksActive}
                                                    </p>
                                                </div>
                                                {student.stats.booksOverdue > 0 && (
                                                    <div>
                                                        <p className="text-xs text-gray-500">Terlambat</p>
                                                        <p className="text-sm font-bold text-red-600">
                                                            {student.stats.booksOverdue}
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="ml-2">
                                                    {expandedStudent === student.id ? (
                                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Detail */}
                                    {expandedStudent === student.id && (
                                        <div className="px-6 pb-6 bg-gray-50/50 border-t border-gray-100">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                                                {/* Riwayat Peminjaman */}
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4 text-emerald-600" />
                                                        Riwayat Peminjaman
                                                    </h4>
                                                    {student.borrowings.length === 0 ? (
                                                        <p className="text-xs text-gray-400 italic bg-white p-4 rounded-xl border border-gray-100">
                                                            Belum ada peminjaman
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {student.borrowings.map((b) => (
                                                                <div
                                                                    key={b.id}
                                                                    className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm"
                                                                >
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-900">
                                                                                {b.book.title}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500">
                                                                                {b.book.author}
                                                                            </p>
                                                                            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                                                                                {formatDate(b.borrowDate)} - {formatDate(b.dueDate)}
                                                                                {b.returnDate &&
                                                                                    ` • Kembali: ${formatDate(b.returnDate)}`}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <span
                                                                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.status === "RETURNED"
                                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                                    : b.status === "ACTIVE" &&
                                                                                        new Date(b.dueDate) <
                                                                                        new Date()
                                                                                        ? "bg-red-50 text-red-600"
                                                                                        : "bg-blue-50 text-blue-600"
                                                                                    }`}
                                                                            >
                                                                                {b.status === "RETURNED"
                                                                                    ? "Selesai"
                                                                                    : b.status === "ACTIVE" &&
                                                                                        new Date(b.dueDate) < new Date()
                                                                                        ? "Terlambat"
                                                                                        : "Aktif"}
                                                                            </span>
                                                                            {b.fine > 0 && (
                                                                                <span className="text-[10px] text-orange-600 font-bold">
                                                                                    {formatCurrency(b.fine)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Progress Baca */}
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                                        Progress Baca
                                                    </h4>
                                                    {student.readingProgress.length === 0 ? (
                                                        <p className="text-xs text-gray-400 italic bg-white p-4 rounded-xl border border-gray-100">
                                                            Belum ada progress baca
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {student.readingProgress.map((rp) => {
                                                                const percent = getProgressPercent(
                                                                    rp.currentPage,
                                                                    rp.totalPages,
                                                                );
                                                                return (
                                                                    <div
                                                                        key={rp.id}
                                                                        className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm"
                                                                    >
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <div>
                                                                                <p className="text-sm font-medium text-gray-900">
                                                                                    {rp.book.title}
                                                                                </p>
                                                                                <p className="text-xs text-gray-500">
                                                                                    {rp.book.author}
                                                                                </p>
                                                                            </div>
                                                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                                                {percent}%
                                                                            </span>
                                                                        </div>

                                                                        <div className="relative w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                                                                            <div
                                                                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                                                                                style={{ width: `${percent}%` }}
                                                                            />
                                                                        </div>

                                                                        <div className="flex justify-between text-[10px] text-gray-400">
                                                                            <span>
                                                                                Hal {rp.currentPage} / {rp.totalPages}
                                                                            </span>
                                                                            <span>
                                                                                Diupload: {formatDate(rp.updatedAt)}
                                                                            </span>
                                                                        </div>

                                                                        {rp.notes && (
                                                                            <p className="text-[11px] text-gray-600 mt-2 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100">
                                                                                <span className="font-semibold text-[10px] uppercase text-gray-400 block mb-0.5">Catatan:</span>
                                                                                {rp.notes}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
