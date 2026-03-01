import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      kelas: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // 🔎 Validasi dasar
    if (!body.name || !body.email || !body.username || !body.password) {
      return NextResponse.json(
        { message: "Semua field wajib diisi." },
        { status: 400 },
      );
    }

    if (body.password.length < 6) {
      return NextResponse.json(
        { message: "Password minimal 6 karakter." },
        { status: 400 },
      );
    }

    // 🔎 Cek duplikasi sebelum create
    const existing = await db.user.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.username }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Email atau username sudah digunakan." },
        { status: 400 },
      );
    }

    const hashed = await bcrypt.hash(body.password, 10);

    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        username: body.username,
        password: hashed,
        kelas: body.kelas || null,
        role: body.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        kelas: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    // 🔥 Safety net untuk Prisma P2002
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Email atau username sudah digunakan." },
        { status: 400 },
      );
    }

    console.error("CREATE USER ERROR:", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
