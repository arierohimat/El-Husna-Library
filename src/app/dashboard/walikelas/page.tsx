"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
    BookOpen,
    Users,
    AlertCircle,
    Loader2,
    BookMarked,
    TrendingUp,
    LayoutDashboard,
    ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface StudentStats {
    totalBorrowed: number;
    booksReturned: number;
    booksActive: number;
    booksOverdue: number;
    totalFine: number;
}

interface Student {
    id: string;
    name: string;
    stats: StudentStats;
}

interface MonitoringData {
    kelas: string;
    totalStudents: number;
    students: Student[];
}

export default function WalikelasDashboard() {
    const [user, setUser] = useState<any>(null);
    const [data, setData] = useState<MonitoringData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/auth/session")
            .then((r) => r.json())
            .then((d) => setUser(d.user))
            .catch(() => setUser(null));
    }, []);

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

    if (!user || user.role !== "WALIKELAS") return null;

    // Derived stats
    const totalBorrowings = data?.students?.reduce((sum, s) => sum + s.stats.totalBorrowed, 0) || 0;
    const totalReturned = data?.students?.reduce((sum, s) => sum + s.stats.booksReturned, 0) || 0;
    const totalActive = data?.students?.reduce((sum, s) => sum + s.stats.booksActive, 0) || 0;
    const totalOverdue = data?.students?.reduce((sum, s) => sum + s.stats.booksOverdue, 0) || 0;
    const totalFines = data?.students?.reduce((sum, s) => sum + s.stats.totalFine, 0) || 0;

    // Top performers (most returned/read)
    const topStudents = data?.students ? [...data.students]
        .sort((a, b) => b.stats.booksReturned - a.stats.booksReturned)
        .slice(0, 5) : [];

    return (
        <DashboardLayout userRole={user.role} userName={user.name}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Dashboard Wali Kelas
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Ringkasan aktivitas literasi kelas <span className="font-semibold text-emerald-600">{data?.kelas || user.kelas}</span>
                        </p>
                    </div>
                    <Link
                        href="/dashboard/walikelas/monitoring"
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-emerald-200"
                    >
                        Buka Monitoring Detail
                        <ArrowRight size={16} />
                    </Link>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 size={32} className="animate-spin text-emerald-500" />
                        <p className="text-sm text-gray-400 font-medium">Memuat data dashboard...</p>
                    </div>
                ) : (
                    <>
                        {/* Highlights */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-500">Siswa Aktif</p>
                                    <Users className="w-5 h-5 text-emerald-500" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{data?.totalStudents || 0}</p>
                            </div>

                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-500">Total Pinjam</p>
                                    <BookOpen className="w-5 h-5 text-blue-500" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{totalBorrowings}</p>
                            </div>

                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-500">Buku Selesai</p>
                                    <BookMarked className="w-5 h-5 text-amber-500" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{totalReturned}</p>
                            </div>

                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-500">Terlambat</p>
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{totalOverdue}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Performance List */}
                            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-gray-900">Siswa Paling Aktif</h3>
                                        <p className="text-xs text-gray-500">Berdasarkan jumlah buku yang selesai dibaca</p>
                                    </div>
                                    <TrendingUp className="text-emerald-500 w-5 h-5" />
                                </div>

                                <div className="space-y-4">
                                    {topStudents.map((student, idx) => (
                                        <div key={student.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500 rounded-full"
                                                            style={{ width: `${Math.min((student.stats.booksReturned / 10) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400">{student.stats.booksReturned} Buku</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {topStudents.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-10 italic">Belum ada data aktivitas</p>
                                    )}
                                </div>
                            </div>

                            {/* Summary Table or Quick Facts */}
                            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-lg shadow-emerald-200 relative overflow-hidden flex flex-col justify-between">
                                <div className="absolute top-0 right-0 p-10 opacity-10">
                                    <LayoutDashboard size={120} />
                                </div>

                                <div>
                                    <h3 className="text-2xl font-bold mb-2">Statistik Kelas</h3>
                                    <p className="text-emerald-100 text-sm mb-8">Berikut adalah ringkasan kinerja literasi kelas Anda periode ini.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-white/20 pb-4">
                                        <span className="text-emerald-50 text-sm">Rata-rata Baca</span>
                                        <span className="text-xl font-bold">{(totalReturned / (data?.totalStudents || 1)).toFixed(1)} <span className="text-xs font-normal">Buku</span></span>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-white/20 pb-4">
                                        <span className="text-emerald-50 text-sm">Total Denda</span>
                                        <span className="text-xl font-bold">Rp {totalFines.toLocaleString("id-ID")}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-emerald-50 text-sm">Tingkat Kembali</span>
                                        <span className="text-xl font-bold">{totalBorrowings ? Math.round((totalReturned / totalBorrowings) * 100) : 0}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
