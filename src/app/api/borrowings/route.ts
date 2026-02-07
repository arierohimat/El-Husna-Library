import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    const where: any = {};

    // 🔒 MEMBER hanya melihat miliknya
    if (session.role === "MEMBER") {
      where.userId = session.userId;
    }

    // 🔍 Search
    if (search) {
      where.OR = [
        { book: { title: { contains: search, mode: "insensitive" } } },
        { book: { author: { contains: search, mode: "insensitive" } } },
        ...(session.role === "ADMIN"
          ? [{ user: { name: { contains: search, mode: "insensitive" } } }]
          : []),
      ];
    }

    // ⚠️ STATUS FILTER (OVERDUE tidak ada di DB)
    if (status !== "all" && status !== "OVERDUE") {
      where.status = status;
    }

    const borrowings = await db.borrowing.findMany({
      where,
      orderBy: { borrowDate: "desc" },
      include: {
        book: true,
        user:
          session.role === "ADMIN"
            ? { select: { id: true, name: true, email: true } }
            : false,
      },
    });

    // 🔄 Normalisasi OVERDUE (virtual)
    const normalized = borrowings
      .map((b) => {
        const isOverdue =
          b.status === "ACTIVE" && new Date(b.dueDate) < new Date();

        return {
          ...b,
          status: isOverdue ? "OVERDUE" : b.status,
        };
      })
      // filter OVERDUE jika dipilih
      .filter((b) => (status === "OVERDUE" ? b.status === "OVERDUE" : true));

    return NextResponse.json({ borrowings: normalized });
  } catch (error) {
    console.error("Get borrowings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId, borrowDate, dueDate } = await request.json();

    if (!bookId || !borrowDate || !dueDate) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 },
      );
    }

    // 🕒 validasi tanggal
    if (new Date(dueDate) <= new Date(borrowDate)) {
      return NextResponse.json(
        { error: "Tanggal jatuh tempo tidak valid" },
        { status: 400 },
      );
    }

    // 🔒 MEMBER maksimal 1 peminjaman aktif
    if (session.role === "MEMBER") {
      const activeCount = await db.borrowing.count({
        where: {
          userId: session.userId,
          status: "ACTIVE",
        },
      });

      if (activeCount >= 1) {
        return NextResponse.json(
          { error: "Anda masih memiliki peminjaman aktif" },
          { status: 400 },
        );
      }
    }

    const book = await db.book.findUnique({ where: { id: bookId } });
    if (!book || book.stock <= 0) {
      return NextResponse.json(
        { error: "Buku tidak tersedia" },
        { status: 400 },
      );
    }

    const borrowing = await db.$transaction(async (tx) => {
      const created = await tx.borrowing.create({
        data: {
          userId: session.userId,
          bookId,
          borrowDate: new Date(borrowDate),
          dueDate: new Date(dueDate),
          status: "ACTIVE",
        },
      });

      await tx.book.update({
        where: { id: bookId },
        data: { stock: { decrement: 1 } },
      });

      return created;
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
