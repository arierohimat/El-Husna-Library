import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Bookmark, AlertCircle, Calendar } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export default async function MemberDashboard() {
  const session = await getSession();

  if (!session || session.role !== "MEMBER") {
    redirect("/");
  }

  // Get member's borrowing data
  const [activeBorrowings, completedBorrowings, overdueBorrowings] =
    await Promise.all([
      db.borrowing.count({
        where: {
          userId: session.userId,
          status: "ACTIVE",
        },
      }),
      db.borrowing.count({
        where: {
          userId: session.userId,
          status: "RETURNED",
        },
      }),
      db.borrowing.count({
        where: {
          userId: session.userId,
          status: "ACTIVE",
          dueDate: { lt: new Date() },
        },
      }),
    ]);

  // Get recent borrowings
  const recentBorrowings = await db.borrowing.findMany({
    where: {
      userId: session.userId,
    },
    include: {
      book: true,
    },
    orderBy: {
      borrowDate: "desc",
    },
    take: 5,
  });
  const overdueDetails = await db.borrowing.findMany({
    where: {
      userId: session.userId,
      status: "ACTIVE",
      dueDate: { lt: new Date() },
    },
    include: {
      book: true,
    },
    orderBy: {
      dueDate: "asc",
    },
    take: 5,
  });

  return (
    <DashboardLayout userRole={session.role} userName={session.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Anggota
          </h1>
          <p className="text-gray-600 mt-1">Selamat datang, {session.name}!</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informasi Akun
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Nama Lengkap</p>
              <p className="font-medium">{session.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{session.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Username</p>
              <p className="font-medium">{session.username}</p>
            </div>
            {session.kelas && (
              <div>
                <p className="text-sm text-gray-500">Kelas</p>
                <p className="font-medium">{session.kelas}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-50">
                Peminjaman Aktif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{activeBorrowings}</div>
                  <p className="text-xs text-green-50 mt-1">Buku dipinjam</p>
                </div>
                <Bookmark className="w-10 h-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-50">
                Riwayat Peminjaman
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">
                    {completedBorrowings}
                  </div>
                  <p className="text-xs text-blue-50 mt-1">
                    Buku selesai dipinjam
                  </p>
                </div>
                <Calendar className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-50">
                Jatuh Tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{overdueBorrowings}</div>
                  <p className="text-xs text-orange-50 mt-1">
                    Perlu dikembalikan
                  </p>
                </div>
                <AlertCircle className="w-10 h-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Notifikasi Keterlambatan */}
        {overdueDetails.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                Peringatan Keterlambatan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-red-700">
                Anda memiliki <strong>{overdueDetails.length}</strong> buku yang
                sudah melewati tanggal jatuh tempo. Harap segera dikembalikan.
              </p>

              <div className="space-y-2">
                {overdueDetails.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center bg-white rounded-md p-3 border border-red-200 text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.book.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        Jatuh tempo:{" "}
                        {new Date(item.dueDate).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-red-600">
                      Terlambat
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Borrowings */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Peminjaman Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recentBorrowings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Belum ada riwayat peminjaman.
              </p>
            ) : (
              <div className="space-y-4">
                {recentBorrowings.map((borrowing) => (
                  <div
                    key={borrowing.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-gray-200"
                  >
                    <div className="w-12 h-16 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                      <Bookmark className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">
                        {borrowing.book.title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {borrowing.book.author}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>
                          Pinjam:{" "}
                          {new Date(borrowing.borrowDate).toLocaleDateString(
                            "id-ID",
                          )}
                        </span>
                        <span>
                          Jatuh Tempo:{" "}
                          {new Date(borrowing.dueDate).toLocaleDateString(
                            "id-ID",
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${borrowing.status === "ACTIVE"
                            ? "bg-blue-100 text-blue-700"
                            : borrowing.status === "RETURNED"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                      >
                        {borrowing.status === "ACTIVE"
                          ? "Aktif"
                          : borrowing.status === "RETURNED"
                            ? "Dikembalikan"
                            : "Terlambat"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
