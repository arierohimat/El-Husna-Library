"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Download,
  Calendar,
  BookOpen,
  Users,
  BookMarked,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface BorrowingReportSummary {
  totalBorrowings: number;
  activeBorrowings: number;
  returnedBorrowings: number;
  overdueBorrowings: number;
}

interface BorrowingReportData {
  title: string;
  date: string;
  summary: BorrowingReportSummary;
  borrowings: Array<{
    Judul: string;
    Penulis: string;
    ISBN: string;
    Peminjam: string;
    "Tanggal Pinjam": string;
    "Jatuh Tempo": string;
    "Tanggal Kembali": string;
    Status: string;
    Konsekuensi: string; // Sekarang berisi "Analisis: Judul Buku" atau "-"
  }>;
}

interface BookReportData {
  title: string;
  date: string;
  totalBooks: number;
  totalStock: number;
  books: Array<{
    ISBN: string;
    Judul: string;
    Penulis: string;
    Penerbit: string;
    "Tahun Terbit": number;
    Kategori: string;
    Stok: number;
  }>;
}

interface MemberReportData {
  title: string;
  date: string;
  totalMembers: number;
  members: Array<{
    Nama: string;
    Email: string;
    Username: string;
    Telepon: string;
    Alamat: string;
    "Total Peminjaman": number;
    "Terdaftar Pada": string;
  }>;
}

type ReportData =
  | BookReportData
  | MemberReportData
  | BorrowingReportData
  | null;

const defaultSummary: BorrowingReportSummary = {
  totalBorrowings: 0,
  activeBorrowings: 0,
  returnedBorrowings: 0,
  overdueBorrowings: 0,
};

export default function ReportsPage() {
  const [user, setUser] = useState<{
    name: string;
    role: "ADMIN" | "MEMBER";
  } | null>(null);
  const [reportType, setReportType] = useState("books");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ReportData>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user && reportType) {
      fetchReport();
    }
  }, [reportType, startDate, endDate, user]);

  const fetchUser = () => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        setUser(null);
      });
  };

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        type: reportType,
        format: "json",
      });

      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/reports?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengambil laporan");
      }

      setData(result.data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengambil laporan");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        type: reportType,
        format: "excel",
      });

      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/reports?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Gagal mengunduh laporan");
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error("File laporan kosong");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-${reportType}-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === "ADMIN";

  if (!user) return null;

  // Statistik untuk laporan buku
  const renderBooksStats = () => {
    const bookData = data as BookReportData;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
          <p className="text-sm font-medium text-emerald-700">Total Judul</p>
          <p className="text-2xl font-bold text-emerald-800">
            {bookData?.totalBooks ?? 0}
          </p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <p className="text-sm font-medium text-blue-700">Total Stok</p>
          <p className="text-2xl font-bold text-blue-800">
            {bookData?.totalStock ?? 0}
          </p>
        </div>
      </div>
    );
  };

  // Statistik untuk laporan anggota
  const renderMembersStats = () => {
    const memberData = data as MemberReportData;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
          <p className="text-sm font-medium text-emerald-700">Total Anggota</p>
          <p className="text-2xl font-bold text-emerald-800">
            {memberData?.totalMembers ?? 0}
          </p>
        </div>
      </div>
    );
  };

  // Statistik untuk laporan peminjaman
  const renderBorrowingsStats = () => {
    const borrowingData = data as BorrowingReportData;
    const summary = borrowingData?.summary ?? defaultSummary;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
          <p className="text-sm font-medium text-emerald-700">Total</p>
          <p className="text-2xl font-bold text-emerald-800">
            {summary.totalBorrowings}
          </p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <p className="text-sm font-medium text-blue-700">Aktif</p>
          <p className="text-2xl font-bold text-blue-800">
            {summary.activeBorrowings}
          </p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
          <p className="text-sm font-medium text-amber-700">Dikembalikan</p>
          <p className="text-2xl font-bold text-amber-800">
            {summary.returnedBorrowings}
          </p>
        </div>
        <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
          <p className="text-sm font-medium text-red-700">Terlambat</p>
          <p className="text-2xl font-bold text-red-800">
            {summary.overdueBorrowings}
          </p>
        </div>
      </div>
    );
  };

  // Tabel buku
  const renderBooksTable = () => {
    const bookData = data as BookReportData;
    if (!bookData?.books || bookData.books.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm">Tidak ada data buku</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="h-14">
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ISBN
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Judul
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Penulis
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Penerbit
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tahun
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Kategori
              </th>
              <th className="px-6 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Stok
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookData.books.map((book, index) => (
              <tr key={index} className="h-16 hover:bg-gray-50 transition">
                <td className="px-6 py-3 text-sm text-gray-600 font-mono">
                  {book.ISBN}
                </td>
                <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                  {book.Judul}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {book.Penulis}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {book.Penerbit}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {book["Tahun Terbit"]}
                </td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                    {book.Kategori}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold text-gray-700">
                    {book.Stok}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Tabel anggota
  const renderMembersTable = () => {
    const memberData = data as MemberReportData;
    if (!memberData?.members || memberData.members.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm">Tidak ada data anggota</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="h-14">
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nama
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Telepon
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Alamat
              </th>
              <th className="px-6 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Pinjam
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Terdaftar
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {memberData.members.map((member, index) => (
              <tr key={index} className="h-16 hover:bg-gray-50 transition">
                <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                  {member.Nama}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {member.Email}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {member.Username}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {member.Telepon || "-"}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {member.Alamat || "-"}
                </td>
                <td className="px-6 py-3 text-center font-semibold">
                  {member["Total Peminjaman"]}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {member["Terdaftar Pada"]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Tabel peminjaman dengan kolom Konsekuensi
  const renderBorrowingsTable = () => {
    const borrowingData = data as BorrowingReportData;
    if (!borrowingData?.borrowings || borrowingData.borrowings.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <BookMarked className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm">Tidak ada data peminjaman</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="h-14">
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Judul
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Penulis
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ISBN
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Peminjam
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tgl Pinjam
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Jatuh Tempo
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tgl Kembali
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Konsekuensi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {borrowingData.borrowings.map((borrowing, index) => (
              <tr key={index} className="h-16 hover:bg-gray-50 transition">
                <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                  {borrowing.Judul}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {borrowing.Penulis}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600 font-mono">
                  {borrowing.ISBN}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {borrowing.Peminjam}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {borrowing["Tanggal Pinjam"]}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {borrowing["Jatuh Tempo"]}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {borrowing["Tanggal Kembali"] || "-"}
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      borrowing.Status === "Aktif"
                        ? "bg-blue-100 text-blue-700"
                        : borrowing.Status === "Dikembalikan"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {borrowing.Status}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {borrowing.Konsekuensi || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderContent = () => {
    if (loading && !data) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
          <p className="text-sm">Memuat laporan...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <FileText size={32} className="text-gray-300" />
          <p className="text-sm font-medium text-gray-600">
            Pilih jenis laporan untuk melihat data
          </p>
        </div>
      );
    }

    switch (reportType) {
      case "books":
        return (
          <>
            {renderBooksStats()}
            {renderBooksTable()}
          </>
        );
      case "members":
        return (
          <>
            {renderMembersStats()}
            {renderMembersTable()}
          </>
        );
      case "borrowings":
        return (
          <>
            {renderBorrowingsStats()}
            {renderBorrowingsTable()}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout userRole={user.role} userName={user.name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laporan</h1>
          <p className="text-gray-600 mt-1">
            Generate dan unduh laporan data perpustakaan
          </p>
        </div>

        {/* Card Pilihan Laporan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5" />
              Pilih Jenis Laporan
            </CardTitle>
            <CardDescription>
              Pilih laporan yang ingin ditampilkan dan unduh dalam format Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportType">Jenis Laporan</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger id="reportType">
                    <SelectValue placeholder="Pilih jenis laporan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="books">Laporan Buku</SelectItem>
                    {isAdmin && (
                      <SelectItem value="members">Laporan Anggota</SelectItem>
                    )}
                    <SelectItem value="borrowings">
                      Laporan Peminjaman
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportType === "borrowings" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Tanggal Mulai (opsional)</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Tanggal Akhir (opsional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={fetchReport}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memuat...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Tampilkan Laporan
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownload}
                disabled={loading || !data}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Unduh Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card Hasil Laporan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              {reportType === "books" && "Laporan Buku"}
              {reportType === "members" && "Laporan Anggota"}
              {reportType === "borrowings" && "Laporan Peminjaman"}
            </CardTitle>
          </CardHeader>
          <CardContent>{renderContent()}</CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
