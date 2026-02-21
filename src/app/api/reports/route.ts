import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import ExcelJS from "exceljs";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "books";
    const format = searchParams.get("format") || "json";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let data: any = {};

    switch (type) {
      case "books":
        data = await generateBooksReport();
        break;
      case "members":
        data = await generateMembersReport();
        break;
      case "borrowings":
        data = await generateBorrowingsReport(startDate, endDate, session);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 },
        );
    }

    if (format === "excel") {
      return generateExcelReport(type, data);
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Generate report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function generateBooksReport() {
  const books = await db.book.findMany({
    orderBy: { title: "asc" },
  });

  return {
    title: "Laporan Buku",
    date: new Date().toISOString(),
    totalBooks: books.length,
    totalStock: books.reduce((sum, book) => sum + book.stock, 0),
    books: books.map((book) => ({
      ISBN: book.isbn,
      Judul: book.title,
      Penulis: book.author,
      Penerbit: book.publisher,
      "Tahun Terbit": book.year,
      Kategori: book.category,
      Stok: book.stock,
    })),
  };
}

async function generateMembersReport() {
  const members = await db.user.findMany({
    where: { role: "MEMBER" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      phone: true,
      address: true,
      createdAt: true,
      _count: {
        select: {
          borrowings: true,
        },
      },
    },
  });

  return {
    title: "Laporan Anggota",
    date: new Date().toISOString(),
    totalMembers: members.length,
    members: members.map((member) => ({
      Nama: member.name,
      Email: member.email,
      Username: member.username,
      Telepon: member.phone || "-",
      Alamat: member.address || "-",
      "Total Peminjaman": member._count.borrowings,
      "Terdaftar Pada": new Date(member.createdAt).toLocaleDateString("id-ID"),
    })),
  };
}

async function generateBorrowingsReport(
  startDate?: string | null,
  endDate?: string | null,
  session?: any,
) {
  const where: any = {};

  if (startDate || endDate) {
    where.borrowDate = {};
    if (startDate) {
      where.borrowDate.gte = new Date(startDate);
    }
    if (endDate) {
      where.borrowDate.lte = new Date(endDate);
    }
  }

  if (session?.role === "MEMBER") {
    where.userId = session.userId;
  }

  const borrowings = await db.borrowing.findMany({
    where,
    orderBy: { borrowDate: "desc" },
    include: {
      book: {
        select: {
          isbn: true,
          title: true,
          author: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      penaltyBook: {
        select: { title: true },
      },
    },
  });

  const activeBorrowings = borrowings.filter(
    (b) => b.status === "ACTIVE",
  ).length;
  const returnedBorrowings = borrowings.filter(
    (b) => b.status === "RETURNED",
  ).length;
  const overdueBorrowings = borrowings.filter(
    (b) => b.status === "ACTIVE" && new Date(b.dueDate) < new Date(),
  ).length;

  return {
    title: "Laporan Peminjaman",
    date: new Date().toISOString(),
    summary: {
      totalBorrowings: borrowings.length,
      activeBorrowings,
      returnedBorrowings,
      overdueBorrowings,
    },
    borrowings: borrowings.map((borrowing) => {
      let konsekuensi = "-";
      if (
        borrowing.status === "ACTIVE" &&
        new Date(borrowing.dueDate) < new Date()
      ) {
        if (borrowing.penaltyBook) {
          konsekuensi = `Analisis: ${borrowing.penaltyBook.title}`;
        } else {
          konsekuensi = `Denda: Rp ${borrowing.fine?.toLocaleString("id-ID") || 0}`;
        }
      }

      return {
        Judul: borrowing.book.title,
        Penulis: borrowing.book.author,
        ISBN: borrowing.book.isbn,
        Peminjam: borrowing.user.name,
        "Tanggal Pinjam": new Date(borrowing.borrowDate).toLocaleDateString(
          "id-ID",
        ),
        "Jatuh Tempo": new Date(borrowing.dueDate).toLocaleDateString("id-ID"),
        "Tanggal Kembali": borrowing.returnDate
          ? new Date(borrowing.returnDate).toLocaleDateString("id-ID")
          : "-",
        Status:
          borrowing.status === "ACTIVE"
            ? "Aktif"
            : borrowing.status === "RETURNED"
              ? "Dikembalikan"
              : "Terlambat",
        Konsekuensi: konsekuensi,
      };
    }),
  };
}

async function generateExcelReport(type: string, data: any) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan");

  // Title
  worksheet.mergeCells("A1:H1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = data.title;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: "center" };

  // Date
  worksheet.mergeCells("A2:H2");
  const dateCell = worksheet.getCell("A2");
  dateCell.value = `Tanggal: ${new Date(data.date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;
  dateCell.alignment = { horizontal: "center" };

  let rowIndex = 4;

  if (type === "books") {
    // Summary
    worksheet.getCell(`A${rowIndex}`).value = "Total Buku:";
    worksheet.getCell(`B${rowIndex}`).value = data.totalBooks;
    worksheet.getCell(`C${rowIndex}`).value = "Total Stok:";
    worksheet.getCell(`D${rowIndex}`).value = data.totalStock;
    rowIndex += 2;

    // Headers
    const headers = [
      "ISBN",
      "Judul",
      "Penulis",
      "Penerbit",
      "Tahun",
      "Kategori",
      "Stok",
    ];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(
        `${String.fromCharCode(65 + index)}${rowIndex}`,
      );
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4CAF50" },
      };
    });
    rowIndex++;

    // Data
    if (data.books && data.books.length > 0) {
      data.books.forEach((book: any) => {
        worksheet.getCell(`A${rowIndex}`).value = book.ISBN;
        worksheet.getCell(`B${rowIndex}`).value = book.Judul;
        worksheet.getCell(`C${rowIndex}`).value = book.Penulis;
        worksheet.getCell(`D${rowIndex}`).value = book.Penerbit;
        worksheet.getCell(`E${rowIndex}`).value = book["Tahun Terbit"];
        worksheet.getCell(`F${rowIndex}`).value = book.Kategori;
        worksheet.getCell(`G${rowIndex}`).value = book.Stok;
        rowIndex++;
      });
    } else {
      worksheet.mergeCells(`A${rowIndex}:G${rowIndex}`);
      worksheet.getCell(`A${rowIndex}`).value = "Tidak ada data";
      worksheet.getCell(`A${rowIndex}`).alignment = { horizontal: "center" };
    }
  } else if (type === "members") {
    // Summary
    worksheet.getCell(`A${rowIndex}`).value = "Total Anggota:";
    worksheet.getCell(`B${rowIndex}`).value = data.totalMembers;
    rowIndex += 2;

    // Headers
    const headers = [
      "Nama",
      "Email",
      "Username",
      "Telepon",
      "Alamat",
      "Total Pinjam",
      "Terdaftar",
    ];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(
        `${String.fromCharCode(65 + index)}${rowIndex}`,
      );
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4CAF50" },
      };
    });
    rowIndex++;

    if (data.members && data.members.length > 0) {
      data.members.forEach((member: any) => {
        worksheet.getCell(`A${rowIndex}`).value = member.Nama;
        worksheet.getCell(`B${rowIndex}`).value = member.Email;
        worksheet.getCell(`C${rowIndex}`).value = member.Username;
        worksheet.getCell(`D${rowIndex}`).value = member.Telepon; // kolom D
        worksheet.getCell(`E${rowIndex}`).value = member.Alamat; // kolom E
        worksheet.getCell(`F${rowIndex}`).value = member["Total Peminjaman"]; // kolom F
        worksheet.getCell(`G${rowIndex}`).value = member["Terdaftar Pada"]; // kolom G
        rowIndex++;
      });
    } else {
      worksheet.mergeCells(`A${rowIndex}:G${rowIndex}`);
      worksheet.getCell(`A${rowIndex}`).value = "Tidak ada data";
      worksheet.getCell(`A${rowIndex}`).alignment = { horizontal: "center" };
    }
  } else if (type === "borrowings") {
    // Summary
    worksheet.getCell(`A${rowIndex}`).value = "Total Peminjaman:";
    worksheet.getCell(`B${rowIndex}`).value = data.summary.totalBorrowings;
    worksheet.getCell(`C${rowIndex}`).value = "Aktif:";
    worksheet.getCell(`D${rowIndex}`).value = data.summary.activeBorrowings;
    worksheet.getCell(`E${rowIndex}`).value = "Dikembalikan:";
    worksheet.getCell(`F${rowIndex}`).value = data.summary.returnedBorrowings;
    worksheet.getCell(`G${rowIndex}`).value = "Terlambat:";
    worksheet.getCell(`H${rowIndex}`).value = data.summary.overdueBorrowings;
    rowIndex += 2;

    // Headers (9 kolom: A s/d I)
    const headers = [
      "Judul",
      "Penulis",
      "ISBN",
      "Peminjam",
      "Tanggal Pinjam",
      "Jatuh Tempo",
      "Tanggal Kembali",
      "Status",
      "Konsekuensi",
    ];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(
        `${String.fromCharCode(65 + index)}${rowIndex}`,
      );
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4CAF50" },
      };
    });
    rowIndex++;

    if (data.borrowings && data.borrowings.length > 0) {
      data.borrowings.forEach((borrowing: any) => {
        worksheet.getCell(`A${rowIndex}`).value = borrowing.Judul;
        worksheet.getCell(`B${rowIndex}`).value = borrowing.Penulis;
        worksheet.getCell(`C${rowIndex}`).value = borrowing.ISBN;
        worksheet.getCell(`D${rowIndex}`).value = borrowing.Peminjam;
        worksheet.getCell(`E${rowIndex}`).value = borrowing["Tanggal Pinjam"];
        worksheet.getCell(`F${rowIndex}`).value = borrowing["Jatuh Tempo"];
        worksheet.getCell(`G${rowIndex}`).value = borrowing["Tanggal Kembali"];
        worksheet.getCell(`H${rowIndex}`).value = borrowing.Status;
        worksheet.getCell(`I${rowIndex}`).value = borrowing.Konsekuensi;
        rowIndex++;
      });
    } else {
      worksheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
      worksheet.getCell(`A${rowIndex}`).value = "Tidak ada data";
      worksheet.getCell(`A${rowIndex}`).alignment = { horizontal: "center" };
    }
  }

  // === PERBAIKAN AUTO-FIT KOLOM ===
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    // Iterasi setiap sel dalam kolom (termasuk header)
    column.eachCell({ includeEmpty: false }, (cell) => {
      const cellValue = cell.value ? cell.value.toString() : "";
      maxLength = Math.max(maxLength, cellValue.length);
    });
    // Beri lebar minimal 10 meskipun tidak ada data
    column.width = maxLength > 0 ? Math.min(maxLength + 2, 50) : 10;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-${type}-${new Date().toISOString().split("T")[0]}.xlsx"`,
    },
  });
}
