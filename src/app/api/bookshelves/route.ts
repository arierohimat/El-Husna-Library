import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/bookshelves - List all bookshelves
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const bookshelves = await db.bookshelf.findMany({
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: { books: true },
                },
            },
        });

        return NextResponse.json({ bookshelves });
    } catch (error) {
        console.error("Get bookshelves error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// POST /api/bookshelves - Create a new bookshelf (Admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, location, description } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Nama rak buku wajib diisi" },
                { status: 400 },
            );
        }

        // Check if name already exists
        const existing = await db.bookshelf.findUnique({ where: { name } });
        if (existing) {
            return NextResponse.json(
                { error: "Nama rak buku sudah terdaftar" },
                { status: 400 },
            );
        }

        const bookshelf = await db.bookshelf.create({
            data: {
                name,
                location: location || null,
                description: description || null,
            },
        });

        return NextResponse.json({ bookshelf }, { status: 201 });
    } catch (error) {
        console.error("Create bookshelf error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
