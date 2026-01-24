import { NextRequest, NextResponse } from "next/server";
import { db } from "@/hooks/db";
import { getSession } from "@/lib/session";

// GET /api/members - Get all members (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: any = { role: "MEMBER" };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { username: { contains: search } },
        { nisNim: { contains: search } },
      ];
    }

    const [members, total] = await Promise.all([
      db.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          nisNim: true,
          phone: true,
          address: true,
          createdAt: true,
          _count: {
            select: {
              borrowings: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/members - Create a new member (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, username, password, name, nisNim, phone, address } = body;

    // Validation
    if (!email || !username || !password || !name) {
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Format email tidak valid" },
        { status: 400 },
      );
    }

    // Phone validation if provided
    if (phone) {
      const phoneRegex = /^62\d{8,}$/;
      if (!phoneRegex.test(phone)) {
        return NextResponse.json(
          { error: "Format nomor telepon tidak valid. Gunakan format 62xxx" },
          { status: 400 },
        );
      }
    }

    // Check if email or username already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email atau username sudah terdaftar" },
        { status: 400 },
      );
    }

    // Hash password
    const bcrypt = (await import("bcryptjs")).default;
    const hashedPassword = await bcrypt.hash(password, 10);

    const member = await db.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name,
        nisNim,
        phone,
        address,
        role: "MEMBER",
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        nisNim: true,
        phone: true,
        address: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error("Create member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
