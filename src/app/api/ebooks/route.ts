import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const where = {
      ...(category ? { category } : {}),
      ...(search
        ? { OR: [{ title: { contains: search } }, { author: { contains: search } }] }
        : {}),
    };

    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10") || 10);

    const [ebooks, total] = await Promise.all([
      db.eBook.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          author: true,
          publisher: true,
          year: true,
          category: true,
          description: true,
          fileSize: true,
          fileName: true,
          createdAt: true,
          uploadedBy: { select: { name: true } },
          accesses: { where: { userId: session.userId }, select: { id: true, lastReadAt: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.eBook.count({ where }),
    ]);

    const sanitized = ebooks;

    return NextResponse.json({
      ebooks: sanitized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Get ebooks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Hanya admin yang dapat mengunggah E-Book" }, { status: 403 });
    }

    const form = await request.formData();
    const title = String(form.get("title") || "").trim();
    const author = String(form.get("author") || "").trim();
    const category = String(form.get("category") || "").trim();
    const file = form.get("file");
    if (!title || !author || !category || !(file instanceof File)) {
      return NextResponse.json({ error: "Judul, penulis, kategori, dan berkas PDF wajib diisi" }, { status: 400 });
    }
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Berkas E-Book harus berformat PDF" }, { status: 400 });
    }
    if (file.size > 4.5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran PDF maksimal 4.5 MB untuk lingkungan serverless" }, { status: 413 });
    }

    const rawCover = String(form.get("coverImage") || "").trim();
    const coverImage = rawCover.length > 50000 ? null : (rawCover || null);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "ebooks");
    await mkdir(uploadDir, { recursive: true });
    const storedName = `${randomUUID()}.pdf`;
    await writeFile(path.join(uploadDir, storedName), Buffer.from(await file.arrayBuffer()));

    const ebook = await db.eBook.create({
      data: {
        title, author, category,
        publisher: String(form.get("publisher") || "").trim() || null,
        year: form.get("year") ? Number(form.get("year")) : null,
        description: String(form.get("description") || "").trim() || null,
        coverImage,
        filePath: `/uploads/ebooks/${storedName}`,
        fileName: file.name,
        fileSize: file.size,
        uploadedById: session.userId,
      },
    });
    return NextResponse.json({ ebook }, { status: 201 });
  } catch (error) {
    console.error("Upload ebook error:", error);
    return NextResponse.json({ error: "Gagal mengunggah E-Book" }, { status: 500 });
  }
}
