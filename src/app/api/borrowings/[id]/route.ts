import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { BorrowStatus } from "@prisma/client";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    /* ================= AUTH ================= */

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ================= PARAM ================= */

    // ⚠️ Next.js App Router: params adalah Promise
    const { id } = await params;

    /* ================= BODY ================= */

    let penaltyBookId: string | null = null;
    let penaltyNote: string | null = null;

    try {
      const body = await request.json();
      penaltyBookId = body.penaltyBookId ?? null;
      penaltyNote = body.penaltyNote ?? null;
    } catch {
      // body kosong → valid (MEMBER)
    }

    /* ================= DATA ================= */

    const borrowing = await db.borrowing.findUnique({
      where: { id },
    });

    if (!borrowing) {
      return NextResponse.json(
        { error: "Peminjaman tidak ditemukan" },
        { status: 404 },
      );
    }

    /* ================= AUTHZ ================= */

    // MEMBER hanya boleh mengembalikan miliknya sendiri
    if (session.role === "MEMBER" && borrowing.userId !== session.userId) {
      return NextResponse.json(
        { error: "Anda tidak berhak mengakses peminjaman ini" },
        { status: 403 },
      );
    }

    // ❗ HANYA RETURNED yang ditolak
    if (borrowing.status === BorrowStatus.RETURNED) {
      return NextResponse.json(
        { error: "Buku sudah dikembalikan" },
        { status: 400 },
      );
    }

    /* ================= LOGIC ================= */

    const now = new Date();
    const isOverdue = now > borrowing.dueDate;

    // MEMBER tidak boleh mengirim penalty apapun
    if (session.role === "MEMBER" && (penaltyBookId || penaltyNote)) {
      return NextResponse.json(
        { error: "Aksi tidak diizinkan" },
        { status: 403 },
      );
    }

    // ADMIN wajib pilih buku analisis jika terlambat
    if (isOverdue && session.role === "ADMIN" && !penaltyBookId) {
      return NextResponse.json(
        { error: "Buku tugas analisis wajib dipilih" },
        { status: 400 },
      );
    }

    /* ================= TRANSACTION ================= */

    await db.$transaction(async (tx) => {
      // update peminjaman
      await tx.borrowing.update({
        where: { id },
        data: {
          returnDate: now,
          status: BorrowStatus.RETURNED,
          penaltyType:
            isOverdue && session.role === "ADMIN" ? "ANALYSIS_TASK" : null,
          penaltyBookId:
            isOverdue && session.role === "ADMIN" ? penaltyBookId : null,
          penaltyNote:
            isOverdue && session.role === "ADMIN" ? penaltyNote : null,
        },
      });

      // kembalikan stok buku utama
      await tx.book.update({
        where: { id: borrowing.bookId },
        data: {
          stock: { increment: 1 },
        },
      });
    });

    /* ================= RESPONSE ================= */

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Return borrowing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
