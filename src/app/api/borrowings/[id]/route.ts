import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { BorrowStatus } from "@prisma/client";

// Tarif denda: Rp 1.000 per hari keterlambatan
const FINE_PER_DAY = 1000;

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

    const { id } = await params;

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

    // Hitung denda otomatis (Rp 1.000 per hari keterlambatan)
    let fineAmount = 0;
    if (isOverdue) {
      const diffTime = now.getTime() - borrowing.dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fineAmount = diffDays * FINE_PER_DAY;
    }

    /* ================= TRANSACTION ================= */

    await db.$transaction(async (tx) => {
      // update peminjaman
      await tx.borrowing.update({
        where: { id },
        data: {
          returnDate: now,
          status: BorrowStatus.RETURNED,
          fine: fineAmount,
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

    return NextResponse.json({
      success: true,
      fine: fineAmount,
      message: isOverdue
        ? `Buku dikembalikan dengan denda Rp ${fineAmount.toLocaleString("id-ID")}`
        : "Buku berhasil dikembalikan",
    });
  } catch (error) {
    console.error("Return borrowing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
