import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/monitoring - Get monitoring data for wali kelas
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session || (session.role !== "WALIKELAS" && session.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const kelas = searchParams.get("kelas") || session.kelas || "";

        if (!kelas) {
            return NextResponse.json(
                { error: "Kelas tidak ditentukan" },
                { status: 400 },
            );
        }

        // Get all students in the class
        const students = await db.user.findMany({
            where: {
                role: "MEMBER",
                kelas: kelas,
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                kelas: true,
                borrowings: {
                    select: {
                        id: true,
                        status: true,
                        borrowDate: true,
                        dueDate: true,
                        returnDate: true,
                        fine: true,
                        book: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                            },
                        },
                    },
                    orderBy: { borrowDate: "desc" },
                },
                readingProgress: {
                    select: {
                        id: true,
                        currentPage: true,
                        totalPages: true,
                        notes: true,
                        updatedAt: true,
                        book: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                            },
                        },
                    },
                    orderBy: { updatedAt: "desc" },
                },
            },
            orderBy: { name: "asc" },
        });

        // Transform data for monitoring
        const monitoringData = students.map((student) => {
            const totalBorrowed = student.borrowings.length;
            const booksReturned = student.borrowings.filter(
                (b) => b.status === "RETURNED",
            ).length;
            const booksActive = student.borrowings.filter(
                (b) => b.status === "ACTIVE",
            ).length;
            const booksOverdue = student.borrowings.filter(
                (b) =>
                    b.status === "ACTIVE" && new Date(b.dueDate) < new Date(),
            ).length;
            const totalFine = student.borrowings.reduce(
                (sum, b) => sum + (b.fine || 0),
                0,
            );

            return {
                id: student.id,
                name: student.name,
                username: student.username,
                email: student.email,
                kelas: student.kelas,
                stats: {
                    totalBorrowed,
                    booksReturned,
                    booksActive,
                    booksOverdue,
                    totalFine,
                },
                borrowings: student.borrowings,
                readingProgress: student.readingProgress,
            };
        });

        return NextResponse.json({
            kelas,
            totalStudents: students.length,
            students: monitoringData,
        });
    } catch (error) {
        console.error("Get monitoring error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
