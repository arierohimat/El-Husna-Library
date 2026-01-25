import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Bookmark, BookCopy, AlertCircle } from "lucide-react";
import { TopBorrowersChart } from "@/components/charts/top-borrowers-chart";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await getSession();

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

  return (
    <DashboardLayout userRole={session.role} userName={session.name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
          <p className="text-gray-600 mt-1">
            Selamat datang kembali, {session.name}!
          </p>
        </div>

        {/* Statistik */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Total Buku</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div>
                <p className="text-3xl font-bold">{totalBooks}</p>
                <p className="text-xs">Judul buku</p>
              </div>
              <BookOpen className="w-10 h-10 opacity-80" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Total Anggota</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div>
                <p className="text-3xl font-bold">{totalMembers}</p>
                <p className="text-xs">Member</p>
              </div>
              <Users className="w-10 h-10 opacity-80" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sedang Dipinjam</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div>
                <p className="text-3xl font-bold">{activeBorrowings}</p>
                <p className="text-xs">Buku</p>
              </div>
              <Bookmark className="w-10 h-10 opacity-80" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Stok Tersedia</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <div>
                <p className="text-3xl font-bold">
                  {availableBooks._sum.stock ?? 0}
                </p>
                <p className="text-xs">Eksemplar</p>
              </div>
              <BookCopy className="w-10 h-10 opacity-80" />
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Anggota Paling Aktif</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <TopBorrowersChart data={topBorrowers} />
          </CardContent>
        </Card>

        {/* Notifikasi Terlambat */}
        {overdueBorrowings > 0 && (
          <Card className="bg-red-50 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                Peminjaman Terlambat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overdueDetails.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between border-b pb-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{item.user.name}</p>
                    <p className="text-gray-600 text-xs">{item.book.title}</p>
                  </div>
                  <span className="text-red-600 text-xs">
                    Jatuh tempo:{" "}
                    {new Date(item.dueDate).toLocaleDateString("id-ID")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
