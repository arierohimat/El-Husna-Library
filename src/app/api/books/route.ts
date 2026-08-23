import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/books - Get all books with search and filter
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const bookshelfId = searchParams.get("bookshelfId") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { author: { contains: search } },
        { isbn: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (bookshelfId) {
      where.bookshelfId = bookshelfId;
    }

    const [books, total] = await Promise.all([
      db.book.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          bookshelf: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      db.book.count({ where }),
    ]);

    return NextResponse.json({
      books,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get books error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/books - Create a new book (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      bookshelfId,
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

    // Check if ISBN already exists
    const existingBook = await db.book.findUnique({ where: { isbn } });
    if (existingBook) {
      return NextResponse.json(
        { error: "ISBN sudah terdaftar" },
        { status: 400 },
      );
    }

    const book = await db.book.create({
      data: {
        isbn,
        title,
        author,
        publisher,
        year,
        category,
        stock,
        coverImage: coverImage || null,
        bookshelfId: bookshelfId || null,
      },
      include: {
        bookshelf: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ book }, { status: 201 });
  } catch (error) {
    console.error("Create book error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
