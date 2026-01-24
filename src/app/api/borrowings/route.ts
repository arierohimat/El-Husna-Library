import { NextRequest, NextResponse } from "next/server";
import { db } from "@/hooks/db";
import { getSession } from "@/lib/session";

// GET /api/borrowings - Get all borrowings
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: any = {};

    // Members can only see their own borrowings
    if (session.role === "MEMBER") {
      where.userId = session.userId;
    }

    if (search) {
      where.OR = [
        { book: { title: { contains: search } } },
        { book: { author: { contains: search } } },
        { book: { isbn: { contains: search } } },
        { user: { name: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [borrowings, total] = await Promise.all([
      db.borrowing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { borrowDate: "desc" },
        include: {
          book: {
            select: {
              id: true,
              isbn: true,
              title: true,
              author: true,
              category: true,
              coverImage: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.borrowing.count({ where }),
    ]);

    return NextResponse.json({
      borrowings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get borrowings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/borrowings - Create a new borrowing
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookId, borrowDate, dueDate } = body;

    // Validation
    if (!bookId || !borrowDate || !dueDate) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 },
      );
    }

    // Check if book exists and has stock
    const book = await db.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return NextResponse.json(
        { error: "Buku tidak ditemukan" },
        { status: 404 },
      );
    }

    if (book.stock <= 0) {
      return NextResponse.json({ error: "Stok buku habis" }, { status: 400 });
    }

    // Check if user already borrowed this book (for members)
    if (session.role === "MEMBER") {
      const existingBorrowing = await db.borrowing.findFirst({
        where: {
          userId: session.userId,
          bookId,
          status: "ACTIVE",
        },
      });

      if (existingBorrowing) {
        return NextResponse.json(
          { error: "Anda sedang meminjam buku ini" },
          { status: 400 },
        );
      }
    }

    // Create borrowing
    const borrowing = await db.$transaction(async (tx) => {
      // Create borrowing record
      const newBorrowing = await tx.borrowing.create({
        data: {
          userId: session.userId,
          bookId,
          borrowDate: new Date(borrowDate),
          dueDate: new Date(dueDate),
          status: "ACTIVE",
        },
        include: {
          book: {
            select: {
              id: true,
              isbn: true,
              title: true,
              author: true,
            },
          },
        },
      });

      // Decrease book stock
      await tx.book.update({
        where: { id: bookId },
        data: { stock: { decrement: 1 } },
      });

      return newBorrowing;
    });

    return NextResponse.json({ borrowing }, { status: 201 });
  } catch (error) {
    console.error("Create borrowing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
