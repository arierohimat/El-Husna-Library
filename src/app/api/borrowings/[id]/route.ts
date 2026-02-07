import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ WAJIB: unwrap params
    const { id } = await params;

    // body boleh kosong (MEMBER)
    let penaltyBookId: string | null = null;
    let penaltyNote: string | null = null;

    try {
      const body = await request.json();
      penaltyBookId = body.penaltyBookId ?? null;
      penaltyNote = body.penaltyNote ?? null;
    } catch {
      // body kosong → valid untuk MEMBER
    }

    const borrowing = await db.borrowing.findUnique({
      where: { id },
    });

    if (!borrowing) {
      return NextResponse.json(
        { error: "Peminjaman tidak ditemukan" },
        { status: 404 },
      );
    }

    // 🔒 MEMBER hanya boleh mengembalikan miliknya sendiri
    if (session.role === "MEMBER" && borrowing.userId !== session.userId) {
      return NextResponse.json(
        { error: "Anda tidak berhak mengakses peminjaman ini" },
        { status: 403 },
      );
    }

    if (borrowing.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Buku sudah dikembalikan" },
        { status: 400 },
      );
    }

    const now = new Date();
    const isOverdue = now > borrowing.dueDate;

    // 🔐 RULE KONSEKUENSI
    if (session.role === "MEMBER") {
      if (penaltyBookId || penaltyNote) {
        return NextResponse.json(
          { error: "Aksi tidak diizinkan" },
          { status: 403 },
        );
      }
    }

    if (isOverdue && session.role === "ADMIN" && !penaltyBookId) {
      return NextResponse.json(
        { error: "Buku tugas analisis wajib dipilih" },
        { status: 400 },
      );
    }

    await db.$transaction(async (tx) => {
      await tx.borrowing.update({
        where: { id },
        data: {
          returnDate: now,
          status: isOverdue ? "OVERDUE" : "RETURNED",
          penaltyType:
            isOverdue && session.role === "ADMIN" ? "ANALYSIS_TASK" : "NONE",
          penaltyBookId:
            isOverdue && session.role === "ADMIN" ? penaltyBookId : null,
          penaltyNote:
            isOverdue && session.role === "ADMIN" ? penaltyNote : null,
        },
      });

      await tx.book.update({
        where: { id: borrowing.bookId },
        data: { stock: { increment: 1 } },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Return borrowing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
