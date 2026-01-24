import { NextRequest, NextResponse } from "next/server";
import { db } from "@/hooks/db";
import { getSession } from "@/lib/session";

// GET /api/books/[id] - Get a single book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const book = await db.book.findUnique({ where: { id } });

    if (!book) {
      return NextResponse.json(
        { error: "Buku tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({ book });
  } catch (error) {
    console.error("Get book error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/books/[id] - Update a book (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      isbn,
      title,
      author,
      publisher,
      year,
      category,
      stock,
      coverImage,
    } = body;

    // Validation
    if (
      !isbn ||
      !title ||
      !author ||
      !publisher ||
      !year ||
      !category ||
      stock === undefined
    ) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 },
      );
    }

    if (stock < 0) {
      return NextResponse.json(
        { error: "Stok tidak boleh negatif" },
        { status: 400 },
      );
    }

    // Check if ISBN already exists (excluding current book)
    const existingBook = await db.book.findFirst({
      where: {
        isbn,
        NOT: { id },
      },
    });

    if (existingBook) {
      return NextResponse.json(
        { error: "ISBN sudah terdaftar" },
        { status: 400 },
      );
    }

    const book = await db.book.update({
      where: { id },
      data: {
        isbn,
        title,
        author,
        publisher,
        year,
        category,
        stock,
        coverImage: coverImage || null,
      },
    });

    return NextResponse.json({ book });
  } catch (error) {
    console.error("Update book error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/books/[id] - Delete a book (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if book has active borrowings
    const activeBorrowings = await db.borrowing.count({
      where: {
        bookId: id,
        status: "ACTIVE",
      },
    });

    if (activeBorrowings > 0) {
      return NextResponse.json(
        { error: "Buku tidak dapat dihapus karena masih ada peminjaman aktif" },
        { status: 400 },
      );
    }

    await db.book.delete({ where: { id } });

    return NextResponse.json({ message: "Buku berhasil dihapus" });
  } catch (error) {
    console.error("Delete book error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
