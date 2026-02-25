import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, name, kelas, password } = body;

    // Basic validation
    if (!email || !username || !name || !password) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password minimal 8 karakter" },
        { status: 400 },
      );
    }

    // Check existing user
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email: email }, { username: username }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email atau username sudah digunakan" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await db.user.create({
      data: {
        email,
        username,
        name,
        kelas: kelas || null,
        password: hashedPassword,
        role: "MEMBER", // default role
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        kelas: true,
        role: true,
      },
    });

    return NextResponse.json(
      {
        message: "Registrasi berhasil",
        user: newUser,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
