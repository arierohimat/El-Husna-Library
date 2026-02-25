import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/bookshelves/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const bookshelf = await db.bookshelf.findUnique({
            where: { id },
            include: {
                books: {
                    select: {
                        id: true,
                        title: true,
                        author: true,
                        isbn: true,
                        stock: true,
                    },
                },
                _count: { select: { books: true } },
            },
        });

        if (!bookshelf) {
            return NextResponse.json(
                { error: "Rak buku tidak ditemukan" },
                { status: 404 },
            );
        }

        return NextResponse.json({ bookshelf });
    } catch (error) {
        console.error("Get bookshelf error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// PUT /api/bookshelves/[id] - Update bookshelf (Admin only)
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
        const { name, location, description } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Nama rak buku wajib diisi" },
                { status: 400 },
            );
        }

        // Check if name already exists (excluding current)
        const existing = await db.bookshelf.findFirst({
            where: { name, NOT: { id } },
        });
        if (existing) {
            return NextResponse.json(
                { error: "Nama rak buku sudah terdaftar" },
                { status: 400 },
            );
        }

        const bookshelf = await db.bookshelf.update({
            where: { id },
            data: {
                name,
                location: location || null,
                description: description || null,
            },
        });

        return NextResponse.json({ bookshelf });
    } catch (error) {
        console.error("Update bookshelf error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// DELETE /api/bookshelves/[id] - Delete bookshelf (Admin only)
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

        // Check if bookshelf has books
        const bookCount = await db.book.count({ where: { bookshelfId: id } });
        if (bookCount > 0) {
            return NextResponse.json(
                { error: "Rak buku tidak dapat dihapus karena masih memiliki buku" },
                { status: 400 },
            );
        }

        await db.bookshelf.delete({ where: { id } });
        return NextResponse.json({ message: "Rak buku berhasil dihapus" });
    } catch (error) {
        console.error("Delete bookshelf error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
