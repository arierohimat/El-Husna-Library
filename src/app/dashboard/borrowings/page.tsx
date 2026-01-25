"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Book,
  Calendar,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  stock: number;
}

interface Borrowing {
  id: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  fine: number;
  status: "ACTIVE" | "RETURNED" | "OVERDUE";
  book: {
    id: string;
    isbn: string;
    title: string;
    author: string;
    category: string;
    coverImage?: string | null;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function BorrowingsPage() {
  const [user, setUser] = useState<{
    name: string;
    role: "ADMIN" | "MEMBER";
    userId: string;
  } | null>(null);
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isBorrowDialogOpen, setIsBorrowDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(
    null,
  );
  const [formData, setFormData] = useState({
    bookId: "",
    borrowDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // 7 days from now
    fine: "",
  });

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchBorrowings();
      if (user.role === "MEMBER") {
        fetchAvailableBooks();
      }
    }
  }, [user, search, status, page]);

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

  const fetchBorrowings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (search) params.append("search", search);
      if (status && status !== "all") params.append("status", status);

      const response = await fetch(`/api/borrowings?${params}`);
      const data = await response.json();
      setBorrowings(data.borrowings || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching borrowings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBooks = async () => {
    try {
      const response = await fetch("/api/books?limit=100");
      const data = await response.json();
      setBooks((data.books || []).filter((book: Book) => book.stock > 0));
    } catch (error) {
      console.error("Error fetching books:", error);
    }
  };

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/borrowings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal meminjam buku");
      }

      setIsBorrowDialogOpen(false);
      resetForm();
      fetchBorrowings();
      fetchAvailableBooks();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleReturn = async () => {
    if (!selectedBorrowing) return;

    try {
      const response = await fetch(`/api/borrowings/${selectedBorrowing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fine: formData.fine ? parseFloat(formData.fine) : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal mengembalikan buku");
      }

      setIsReturnDialogOpen(false);
      setSelectedBorrowing(null);
      resetForm();
      fetchBorrowings();
      fetchAvailableBooks();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openReturnDialog = (borrowing: Borrowing) => {
    setSelectedBorrowing(borrowing);
    const overdueDays = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(borrowing.dueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    setFormData({
      ...formData,
      fine: overdueDays > 0 ? (overdueDays * 1000).toString() : "",
    });
    setIsReturnDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      bookId: "",
      borrowDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      fine: "",
    });
  };

  const isAdmin = user?.role === "ADMIN";

  if (!user) {
    return null;
  }

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status === "ACTIVE";
    const actualStatus = isOverdue ? "OVERDUE" : status;

    switch (actualStatus) {
      case "ACTIVE":
        return <Badge className="bg-blue-600">Aktif</Badge>;
      case "RETURNED":
        return <Badge className="bg-green-600">Dikembalikan</Badge>;
      case "OVERDUE":
        return <Badge className="bg-red-600">Terlambat</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout userRole={user.role} userName={user.name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Peminjaman Buku
            </h1>
            <p className="text-gray-600 mt-1">
              {isAdmin
                ? "Kelola peminjaman dan pengembalian buku"
                : "Kelola peminjaman buku Anda"}
            </p>
          </div>
          {user.role === "MEMBER" && (
            <Dialog
              open={isBorrowDialogOpen}
              onOpenChange={setIsBorrowDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Pinjam Buku
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Pinjam Buku</DialogTitle>
                  <DialogDescription>
                    Pilih buku yang ingin dipinjam
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBorrow} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="book">Pilih Buku *</Label>
                    <Select
                      value={formData.bookId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, bookId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih buku" />
                      </SelectTrigger>
                      <SelectContent>
                        {books.map((book) => (
                          <SelectItem key={book.id} value={book.id}>
                            {book.title} - {book.author} (Stok: {book.stock})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="borrowDate">Tanggal Pinjam *</Label>
                      <Input
                        id="borrowDate"
                        type="date"
                        value={formData.borrowDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            borrowDate: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Jatuh Tempo *</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) =>
                          setFormData({ ...formData, dueDate: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Pinjam Buku
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari berdasarkan judul buku, penulis, atau nama anggota..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="md:w-[200px]">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="RETURNED">Dikembalikan</SelectItem>
                  <SelectItem value="OVERDUE">Terlambat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Borrowings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Peminjaman</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Memuat data...</div>
            ) : borrowings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Tidak ada peminjaman ditemukan
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cover</TableHead>
                      <TableHead>Buku</TableHead>
                      <TableHead>Penulis</TableHead>
                      {isAdmin && <TableHead>Peminjam</TableHead>}
                      <TableHead>Tanggal Pinjam</TableHead>
                      <TableHead>Jatuh Tempo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Denda</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {borrowings.map((borrowing) => {
                      const isOverdue =
                        new Date(borrowing.dueDate) < new Date() &&
                        borrowing.status === "ACTIVE";
                      return (
                        <TableRow key={borrowing.id}>
                          <TableCell>
                            {borrowing.book.coverImage ? (
                              <img
                                src={borrowing.book.coverImage}
                                alt={borrowing.book.title}
                                className="w-12 h-16 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                                <Book className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {borrowing.book.title}
                          </TableCell>
                          <TableCell>{borrowing.book.author}</TableCell>
                          {isAdmin && borrowing.user && (
                            <TableCell>{borrowing.user.name}</TableCell>
                          )}
                          <TableCell>
                            {new Date(borrowing.borrowDate).toLocaleDateString(
                              "id-ID",
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isOverdue && (
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                              )}
                              {new Date(borrowing.dueDate).toLocaleDateString(
                                "id-ID",
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(
                              borrowing.status,
                              borrowing.dueDate,
                            )}
                          </TableCell>
                          <TableCell>
                            {borrowing.fine > 0
                              ? `Rp ${borrowing.fine.toLocaleString("id-ID")}`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {borrowing.status === "ACTIVE" && (
                              <Button
                                size="sm"
                                onClick={() => openReturnDialog(borrowing)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Kembalikan
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Sebelumnya
                </Button>
                <span className="text-sm text-gray-600">
                  Halaman {page} dari {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Selanjutnya
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Return Dialog */}
        <AlertDialog
          open={isReturnDialogOpen}
          onOpenChange={setIsReturnDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kembalikan Buku</AlertDialogTitle>
              <AlertDialogDescription>
                Konfirmasi pengembalian buku "{selectedBorrowing?.book?.title}".
                {new Date(selectedBorrowing?.dueDate || "") < new Date() && (
                  <span className="block mt-2 text-red-600 font-semibold">
                    Peringatan: Buku ini terlambat dikembalikan!
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="fine">Denda (Opsional, Rp)</Label>
              <Input
                id="fine"
                type="number"
                min="0"
                value={formData.fine}
                onChange={(e) =>
                  setFormData({ ...formData, fine: e.target.value })
                }
                placeholder="Masukkan denda jika ada"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReturn}
                className="bg-green-600 hover:bg-green-700"
              >
                Konfirmasi Pengembalian
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
