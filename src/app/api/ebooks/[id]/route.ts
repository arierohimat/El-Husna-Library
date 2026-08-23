import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ebook = await db.eBook.findUnique({ where: { id }, omit: { coverImage: true } });
  if (!ebook) return NextResponse.json({ error: "E-Book tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ ebook });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Hanya admin yang dapat memperbarui E-Book" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.eBook.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "E-Book tidak ditemukan" }, { status: 404 });
    }

    const form = await request.formData();
    const title = String(form.get("title") || "").trim();
    const author = String(form.get("author") || "").trim();
    const category = String(form.get("category") || "").trim();
    const file = form.get("file");

    if (!title || !author || !category) {
      return NextResponse.json({ error: "Judul, penulis, dan kategori wajib diisi" }, { status: 400 });
    }

    let filePath = existing.filePath;
    let fileName = existing.fileName;
    let fileSize = existing.fileSize;

    if (file instanceof File && file.size > 0) {
      if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json({ error: "Berkas E-Book harus berformat PDF" }, { status: 400 });
      }
      if (file.size > 4.5 * 1024 * 1024) {
        return NextResponse.json({ error: "Ukuran PDF maksimal 4.5 MB untuk lingkungan serverless" }, { status: 413 });
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "ebooks");
      const tmpUploadDir = path.join(os.tmpdir(), "uploads", "ebooks");
      const storedName = `${randomUUID()}.pdf`;
      const buffer = Buffer.from(await file.arrayBuffer());

      try {
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, storedName), buffer);
      } catch (fsErr: any) {
        console.warn("Public upload dir read-only, falling back to tmpdir:", fsErr.message);
        try {
          await mkdir(tmpUploadDir, { recursive: true });
          await writeFile(path.join(tmpUploadDir, storedName), buffer);
        } catch (tmpErr: any) {
          console.error("Tmpdir write error:", tmpErr);
        }
      }

      try {
        await unlink(path.join(process.cwd(), "public", existing.filePath.replace(/^\//, "")));
      } catch {
        /* ignore if missing */
      }

      filePath = `/uploads/ebooks/${storedName}`;
      fileName = file.name;
      fileSize = file.size;
    }

    const rawCover = String(form.get("coverImage") || "").trim();
    const coverImage = rawCover.length > 50000 ? null : (rawCover || null);

    const ebook = await db.eBook.update({
      where: { id },
      data: {
        title,
        author,
        category,
        publisher: String(form.get("publisher") || "").trim() || null,
        year: form.get("year") ? Number(form.get("year")) : null,
        description: String(form.get("description") || "").trim() || null,
        coverImage,
        filePath,
        fileName,
        fileSize,
      },
    });

    return NextResponse.json({ ebook, message: "E-Book berhasil diperbarui" });
  } catch (error) {
    console.error("Update ebook error:", error);
    return NextResponse.json({ error: "Gagal memperbarui E-Book" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const ebook = await db.eBook.findUnique({ where: { id } });
  if (!ebook) return NextResponse.json({ error: "E-Book tidak ditemukan" }, { status: 404 });
  await db.eBook.delete({ where: { id } });
  try {
    await unlink(path.join(process.cwd(), "public", ebook.filePath.replace(/^\//, "")));
  } catch {
    /* file may already be absent */
  }
  return NextResponse.json({ message: "E-Book berhasil dihapus" });
}

