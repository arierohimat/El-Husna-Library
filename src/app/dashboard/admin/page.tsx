export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  BookOpen,
  Users,
  Bookmark,
  BookCopy,
  AlertCircle,
  TrendingUp,
  Clock,
} from "lucide-react";
import { TopBorrowersChart } from "@/components/charts/top-borrowers-chart";

import { db } from "@/lib/db";
import { getSession, SessionUser } from "@/lib/session";

export default async function AdminDashboard() {
  let session: SessionUser | null = null;

  try {
    session = await getSession();
  } catch {
    redirect("/");
  }

  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  const [
    totalBooks,
    totalMembers,
    activeBorrowings,
    availableBooks,
    overdueBorrowings,
    overdueDetails,
    topBorrowGroups,
  ] = await Promise.all([
    db.book.count(),
    db.user.count({ where: { role: "MEMBER" } }),
    db.borrowing.count({ where: { status: "ACTIVE" } }),
    db.book.aggregate({ _sum: { stock: true } }),
    db.borrowing.count({
      where: {
        status: "ACTIVE",
        dueDate: { lt: new Date() },
      },
    }),
    db.borrowing.findMany({
      where: {
        status: "ACTIVE",
        dueDate: { lt: new Date() },
      },
      include: {
        user: true,
        book: true,
      },
      take: 5,
      orderBy: {
        dueDate: "asc",
      },
    }),
    db.borrowing.groupBy({
      by: ["userId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  const topUserIds = topBorrowGroups.map((b) => b.userId);

  const topUsers = await db.user.findMany({
    where: { id: { in: topUserIds } },
  });

  const topBorrowers = topBorrowGroups.map((item) => {
    const user = topUsers.find((u) => u.id === item.userId);
    return {
      name: user?.name ?? "Unknown",
      total: item._count.id,
    };
  });

  const totalStock = availableBooks._sum.stock ?? 0;
  const borrowRate =
    totalStock > 0 ? Math.round((activeBorrowings / totalStock) * 100) : 0;
  const availableRate =
    totalStock > 0
      ? Math.round(((totalStock - activeBorrowings) / totalStock) * 100)
      : 0;

  return (
    <DashboardLayout userRole={session.role} userName={session.name}>
      <div className="space-y-6">
        {/* Stats Overview - Clean Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Buku */}
          <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <BookOpen
                  className="w-6 h-6 text-emerald-600"
                  strokeWidth={2}
                />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Total Buku</p>
              <p className="text-2xl font-bold text-gray-900">{totalBooks}</p>
              <p className="text-xs text-gray-500">Judul koleksi</p>
            </div>
          </div>

          {/* Total Anggota */}
          <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" strokeWidth={2} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Anggota</p>
              <p className="text-2xl font-bold text-gray-900">{totalMembers}</p>
              <p className="text-xs text-gray-500">Member aktif</p>
            </div>
          </div>

          {/* Sedang Dipinjam */}
          <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-amber-50 rounded-xl">
                <Bookmark className="w-6 h-6 text-amber-600" strokeWidth={2} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Dipinjam</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeBorrowings}
              </p>
              <p className="text-xs text-gray-500">Sedang aktif</p>
            </div>
          </div>

          {/* Stok Tersedia */}
          <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-violet-50 rounded-xl">
                <BookCopy className="w-6 h-6 text-violet-600" strokeWidth={2} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Tersedia</p>
              <p className="text-2xl font-bold text-gray-900">{totalStock}</p>
              <p className="text-xs text-gray-500">Siap dipinjam</p>
            </div>
          </div>
        </div>

        {/* Alert Section - Minimalist */}
        {overdueBorrowings > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-red-500">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Peminjaman Terlambat
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {overdueBorrowings} peminjaman melewati tenggat waktu
                    </p>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 text-sm font-semibold">
                    {overdueBorrowings}
                  </span>
                </div>
                <div className="space-y-2">
                  {overdueDetails.map((item) => {
                    const daysOverdue = Math.floor(
                      (Date.now() - new Date(item.dueDate).getTime()) /
                        (1000 * 60 * 60 * 24),
                    );

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.user.name}
                          </p>
                          <p className="text-xs text-gray-600 truncate mt-0.5">
                            {item.book.title}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right ml-4">
                          <p className="text-xs text-gray-500">
                            {new Date(item.dueDate).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                              },
                            )}
                          </p>
                          <p className="text-xs font-medium text-red-600 mt-0.5">
                            +{daysOverdue} hari
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section - 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Anggota Paling Aktif
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Berdasarkan jumlah peminjaman
                </p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="h-[320px]">
              <TopBorrowersChart data={topBorrowers} />
            </div>
          </div>

          {/* Stats Cards - 1 column */}
          <div className="space-y-4">
            {/* Tingkat Peminjaman */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">
                  Tingkat Peminjaman
                </p>
                <span className="text-lg font-bold text-emerald-600">
                  {borrowRate}%
                </span>
              </div>
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-700"
                  style={{ width: `${borrowRate}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {activeBorrowings} dari {totalStock} eksemplar
              </p>
            </div>

            {/* Ketersediaan */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">
                  Ketersediaan Stok
                </p>
                <span className="text-lg font-bold text-violet-600">
                  {availableRate}%
                </span>
              </div>
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full transition-all duration-700"
                  style={{ width: `${availableRate}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {totalStock - activeBorrowings} buku siap dipinjam
              </p>
            </div>

            {/* Status Keterlambatan */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">
                    Status Pengembalian
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Tepat waktu</span>
                  <span className="text-sm font-semibold text-emerald-600">
                    {activeBorrowings - overdueBorrowings}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Terlambat</span>
                  <span className="text-sm font-semibold text-red-600">
                    {overdueBorrowings}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
