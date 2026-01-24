import { NextRequest, NextResponse } from "next/server";
import { db } from "@/hooks/db";
import { getSession } from "@/lib/session";

// GET /api/borrowings/[id] - Get a single borrowing
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

    const where: any = { id };

    // Members can only see their own borrowings
    if (session.role === "MEMBER") {
      where.userId = session.userId;
    }

    const borrowing = await db.borrowing.findFirst({
      where,
      include: {
        book: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!borrowing) {
      return NextResponse.json(
        { error: "Peminjaman tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({ borrowing });
  } catch (error) {
    console.error("Get borrowing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/borrowings/[id] - Return a book
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fine } = body;

    // Get borrowing
    const borrowing = await db.borrowing.findUnique({
      where: { id },
      include: {
        book: true,
      },
    });

    if (!borrowing) {
      return NextResponse.json(
        { error: "Peminjaman tidak ditemukan" },
        { status: 404 },
      );
    }

    if (borrowing.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Buku sudah dikembalikan" },
        { status: 400 },
      );
    }

    // Calculate fine if not provided
    let calculatedFine = fine || 0;
    if (!fine && borrowing.dueDate < new Date()) {
      const overdueDays = Math.floor(
        (Date.now() - new Date(borrowing.dueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      calculatedFine = overdueDays * 1000; // Rp 1.000 per day
    }

    // Update borrowing and increase book stock
    const updatedBorrowing = await db.$transaction(async (tx) => {
      const updated = await tx.borrowing.update({
        where: { id },
        data: {
          status: "RETURNED",
          returnDate: new Date(),
          fine: calculatedFine,
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

      // Increase book stock
      await tx.book.update({
        where: { id: borrowing.bookId },
        data: { stock: { increment: 1 } },
      });

      return updated;
    });

    return NextResponse.json({ borrowing: updatedBorrowing });
  } catch (error) {
    console.error("Return book error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
