import { NextRequest, NextResponse } from "next/server";
import { db } from "@/hooks/db";
import { getSession } from "@/lib/session";

// GET /api/reports/export - Export data (Excel/CSV)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "books";
    const format = searchParams.get("format") || "csv";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let data: any[] = [];
    let filename = "report";
    let headers: string[] = [];

    if (type === "books") {
      const books = await db.book.findMany({
        orderBy: { title: "asc" },
      });
      data = books.map((book) => ({
        ISBN: book.isbn,
        Judul: book.title,
        Penulis: book.author,
        Penerbit: book.publisher,
        "Tahun Terbit": book.year,
        Kategori: book.category,
        Stok: book.stock,
      }));
      filename = "data-buku";
      headers = [
        "ISBN",
        "Judul",
        "Penulis",
        "Penerbit",
        "Tahun Terbit",
        "Kategori",
        "Stok",
      ];
    } else if (type === "members") {
      if (session.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const members = await db.user.findMany({
        where: { role: "MEMBER" },
        orderBy: { name: "asc" },
      });
      data = members.map((member) => ({
        Nama: member.name,
        Email: member.email,
        Username: member.username,
        "NIS/NIM": member.nisNim || "-",
        Telepon: member.phone || "-",
        Alamat: member.address || "-",
        Terdaftar: new Date(member.createdAt).toLocaleDateString("id-ID"),
      }));
      filename = "data-anggota";
      headers = [
        "Nama",
        "Email",
        "Username",
        "NIS/NIM",
        "Telepon",
        "Alamat",
        "Terdaftar",
      ];
    } else if (type === "borrowings") {
      const where: any = {};

      // Members can only export their own borrowings
      if (session.role === "MEMBER") {
        where.userId = session.userId;
      }

      // Date filter
      if (startDate || endDate) {
        where.borrowDate = {};
        if (startDate) where.borrowDate.gte = new Date(startDate);
        if (endDate) where.borrowDate.lte = new Date(endDate);
      }

      const borrowings = await db.borrowing.findMany({
        where,
        include: {
          book: true,
          user:
            session.role === "ADMIN"
              ? { select: { name: true, email: true } }
              : undefined,
        },
        orderBy: { borrowDate: "desc" },
      });

      if (session.role === "ADMIN") {
        data = borrowings.map((b) => ({
          "Judul Buku": b.book.title,
          Penulis: b.book.author,
          Peminjam: b.user?.name || "-",
          "Tanggal Pinjam": new Date(b.borrowDate).toLocaleDateString("id-ID"),
          "Jatuh Tempo": new Date(b.dueDate).toLocaleDateString("id-ID"),
          "Tanggal Kembali": b.returnDate
            ? new Date(b.returnDate).toLocaleDateString("id-ID")
            : "-",
          Status:
            b.status === "ACTIVE"
              ? "Aktif"
              : b.status === "RETURNED"
                ? "Dikembalikan"
                : "Terlambat",
          Denda: b.fine > 0 ? `Rp ${b.fine.toLocaleString("id-ID")}` : "Rp 0",
        }));
        headers = [
          "Judul Buku",
          "Penulis",
          "Peminjam",
          "Tanggal Pinjam",
          "Jatuh Tempo",
          "Tanggal Kembali",
          "Status",
          "Denda",
        ];
      } else {
        data = borrowings.map((b) => ({
          "Judul Buku": b.book.title,
          Penulis: b.book.author,
          "Tanggal Pinjam": new Date(b.borrowDate).toLocaleDateString("id-ID"),
          "Jatuh Tempo": new Date(b.dueDate).toLocaleDateString("id-ID"),
          "Tanggal Kembali": b.returnDate
            ? new Date(b.returnDate).toLocaleDateString("id-ID")
            : "-",
          Status:
            b.status === "ACTIVE"
              ? "Aktif"
              : b.status === "RETURNED"
                ? "Dikembalikan"
                : "Terlambat",
          Denda: b.fine > 0 ? `Rp ${b.fine.toLocaleString("id-ID")}` : "Rp 0",
        }));
        headers = [
          "Judul Buku",
          "Penulis",
          "Tanggal Pinjam",
          "Jatuh Tempo",
          "Tanggal Kembali",
          "Status",
          "Denda",
        ];
      }
      filename = "riwayat-peminjaman";
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data untuk diekspor" },
        { status: 404 },
      );
    }

    // Generate CSV
    if (format === "csv") {
      const csvContent = [
        headers.join(","),
        ...data.map((row) =>
          headers.map((header) => `"${row[header] || ""}"`).join(","),
        ),
      ].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Format tidak didukung" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
