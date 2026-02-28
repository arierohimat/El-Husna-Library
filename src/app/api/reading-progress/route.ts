import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /api/reading-progress - Get reading progress
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || session.userId;

        // MEMBER can only see their own progress
        if (session.role === "MEMBER" && userId !== session.userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const progress = await db.readingProgress.findMany({
            where: { userId },
            include: {
                book: {
                    select: {
                        id: true,
                        title: true,
                        author: true,
                        coverImage: true,
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json({ progress });
    } catch (error) {
        console.error("Get reading progress error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// POST /api/reading-progress - Create or update reading progress
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { bookId, currentPage, totalPages, notes } = body;

        if (!bookId) {
            return NextResponse.json(
                { error: "Book ID wajib diisi" },
                { status: 400 },
            );
        }

        if (currentPage < 0 || totalPages < 0) {
            return NextResponse.json(
                { error: "Halaman tidak valid" },
                { status: 400 },
            );
        }

        // Upsert - create if not exists, update if exists
        const progress = await db.readingProgress.upsert({
            where: {
                userId_bookId: {
                    userId: session.userId,
                    bookId,
                },
            },
            update: {
                currentPage: currentPage ?? 0,
                totalPages: totalPages ?? 0,
                notes: notes || null,
            },
            create: {
                userId: session.userId,
                bookId,
                currentPage: currentPage ?? 0,
                totalPages: totalPages ?? 0,
                notes: notes || null,
            },
            include: {
                book: {
                    select: {
                        id: true,
                        title: true,
                        author: true,
                    },
                },
            },
        });

        return NextResponse.json({ progress }, { status: 201 });
    } catch (error) {
        console.error("Update reading progress error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
