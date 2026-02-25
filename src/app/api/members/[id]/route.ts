import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

// GET /api/members/[id] - Get a single member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const member = await db.user.findFirst({
      where: { id, role: "MEMBER" },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        kelas: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            borrowings: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Anggota tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error("Get member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/members/[id] - Update a member (Admin only)
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
    const { email, username, name, kelas, password } = body;

    // Validation
    if (!email || !username || !name) {
      return NextResponse.json(
        { error: "Email, username, dan nama wajib diisi" },
        { status: 400 },
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Format email tidak valid" },
        { status: 400 },
      );
    }

    // Check if email or username already exists (excluding current member)
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email }, { username }],
        NOT: { id },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email atau username sudah terdaftar" },
        { status: 400 },
      );
    }

    // Prepare update data
    const updateData: any = {
      email,
      username,
      name,
      kelas: kelas || null,
    };

    // Hash password if provided
    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password minimal 8 karakter" },
          { status: 400 },
        );
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const member = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        kelas: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ member });
  } catch (error) {
    console.error("Update member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/members/[id] - Delete a member (Admin only)
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

    // Check if member has active borrowings
    const activeBorrowings = await db.borrowing.count({
      where: {
        userId: id,
        status: "ACTIVE",
      },
    });

    if (activeBorrowings > 0) {
      return NextResponse.json(
        {
          error:
            "Anggota tidak dapat dihapus karena masih ada peminjaman aktif",
        },
        { status: 400 },
      );
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({ message: "Anggota berhasil dihapus" });
  } catch (error) {
    console.error("Delete member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
