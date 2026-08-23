import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const cleanIdentifier = (email || "").trim();
    const cleanPassword = (password || "").trim();

    // Validation
    if (!cleanIdentifier || !cleanPassword) {
      return NextResponse.json(
        { error: "Email/Username dan password wajib diisi" },
        { status: 400 },
      );
    }

    if (cleanPassword.length < 8) {
      return NextResponse.json(
        { error: "Password minimal 8 karakter" },
        { status: 400 },
      );
    }

    const underscoreIdentifier = cleanIdentifier.toLowerCase().replace(/\s+/g, "_");

    // Find user by email, username, or name (case-insensitive)
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanIdentifier, mode: "insensitive" } },
          { username: { equals: cleanIdentifier, mode: "insensitive" } },
          { username: { equals: underscoreIdentifier, mode: "insensitive" } },
          { name: { equals: cleanIdentifier, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        kelas: true,
        role: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Email/Username atau password salah" },
        { status: 401 },
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(cleanPassword, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Email/Username atau password salah" },
        { status: 401 },
      );
    }

    // Create session
    const sessionData = {
      userId: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      kelas: user.kelas,
      role: user.role,
    };

    const response = NextResponse.json({
      message: "Login berhasil",
      user: sessionData,
    });

    // Set session cookie
    response.cookies.set("session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
