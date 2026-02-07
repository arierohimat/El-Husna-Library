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
import { Search, Plus, Book, CheckCircle, AlertTriangle } from "lucide-react";

/* ================= TYPES ================= */

interface Book {
  id: string;
  title: string;
  author: string;
  stock: number;
}

interface Borrowing {
  id: string;
  borrowDate: string;
  dueDate: string;
  status: "ACTIVE" | "RETURNED" | "OVERDUE";
  book: {
    title: string;
    author: string;
    coverImage?: string | null;
  };
  user?: {
    name: string;
  };
}

/* ================= PAGE ================= */

export default function BorrowingsPage() {
  const [user, setUser] = useState<{
    name: string;
    role: "ADMIN" | "MEMBER";
  }>();
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Borrowing | null>(null);

  const [penaltyBookId, setPenaltyBookId] = useState("");
  const [penaltyNote, setPenaltyNote] = useState("");

  /* ================= EFFECT ================= */

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    if (user) {
      loadBorrowings();
      if (user.role === "MEMBER") loadBooks();
    }
  }, [user, search, status]);

  /* ================= FETCH ================= */

  const loadBorrowings = async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.append("search", search);
    if (status !== "all") p.append("status", status);

    const r = await fetch(`/api/borrowings?${p}`);
    const d = await r.json();
    setBorrowings(d.borrowings || []);
    setLoading(false);
  };

  const loadBooks = async () => {
    const r = await fetch("/api/books?limit=100");
    const d = await r.json();
    setBooks(d.books || []);
  };

  /* ================= ACTION ================= */

  const openReturn = (b: Borrowing) => {
    setSelected(b);
    setPenaltyBookId("");
    setPenaltyNote("");
    setReturnDialogOpen(true);
  };

  const confirmReturn = async () => {
    if (!selected) return;

    await fetch(`/api/borrowings/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        penaltyBookId: penaltyBookId || null,
        penaltyNote: penaltyNote || null,
      }),
    });

    setReturnDialogOpen(false);
    setSelected(null);
    loadBorrowings();
  };

  /* ================= UTIL ================= */

  const overdue = (b?: Borrowing | null) => {
    if (!b) return false;
    return b.status === "ACTIVE" && new Date(b.dueDate) < new Date();
  };

  if (!user) return null;

  /* ================= RENDER ================= */

  return (
    <DashboardLayout userRole={user.role} userName={user.name}>
      <Card>
        <CardHeader>
          <CardTitle>Peminjaman Buku</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Cari..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="RETURNED">Dikembalikan</SelectItem>
              </SelectContent>
            </Select>

            {/* ✅ MEMBER PINJAM */}
            {user.role === "MEMBER" && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-1" /> Pinjam
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Pinjam Buku</DialogTitle>
                  </DialogHeader>
                  <p>Form pinjam sudah Anda miliki (tidak dihapus)</p>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {loading ? (
            <p>Memuat...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buku</TableHead>
                  {user.role === "ADMIN" && <TableHead>Anggota</TableHead>}
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Konsekuensi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.book.title}</TableCell>
                    {user.role === "ADMIN" && (
                      <TableCell>{b.user?.name}</TableCell>
                    )}
                    <TableCell>
                      {new Date(b.dueDate).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>
                      {overdue(b) ? (
                        <Badge className="bg-red-600">Terlambat</Badge>
                      ) : (
                        <Badge>Aktif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {overdue(b) ? (
                        <Badge className="bg-orange-500">Analisis Buku</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {b.status === "ACTIVE" && (
                        <Button size="sm" onClick={() => openReturn(b)}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Kembalikan
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ================= RETURN DIALOG ================= */}

      <AlertDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pengembalian Buku</AlertDialogTitle>
            <AlertDialogDescription>
              {selected?.book.title}
              {selected && overdue(selected) && (
                <div className="text-red-600 mt-2">
                  Buku terlambat dikembalikan.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* ✅ ADMIN INPUT */}
          {selected && overdue(selected) && user.role === "ADMIN" && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Buku Analisis *</Label>
                <Select value={penaltyBookId} onValueChange={setPenaltyBookId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih buku" />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title} – {b.author}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Catatan (opsional)"
                value={penaltyNote}
                onChange={(e) => setPenaltyNote(e.target.value)}
              />
            </div>
          )}

          {/* ✅ MEMBER INFO */}
          {selected && overdue(selected) && user.role === "MEMBER" && (
            <p className="text-sm text-red-600 mt-2">
              Hubungi admin untuk instruksi analisis buku.
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReturn}
              disabled={
                user.role === "ADMIN" && overdue(selected!) && !penaltyBookId
              }
            >
              Konfirmasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
