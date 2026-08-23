import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ebook = await db.eBook.findUnique({ where: { id } });
  if (!ebook) return NextResponse.json({ error: "E-Book tidak ditemukan" }, { status: 404 });

  try {
    const cleanPath = ebook.filePath.replace(/^\//, "");
    const fullPath = path.join(process.cwd(), "public", cleanPath);
    const file = await readFile(fullPath);

    try {
      await db.eBookAccess.upsert({
        where: { ebookId_userId: { ebookId: ebook.id, userId: session.userId } },
        create: { ebookId: ebook.id, userId: session.userId },
        update: { accessCount: { increment: 1 }, lastReadAt: new Date() },
      });
    } catch (dbErr) {
      console.error("Failed to update eBookAccess:", dbErr);
    }

    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(ebook.fileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("Read eBook file error:", err);
    return NextResponse.json({ error: "Berkas PDF tidak ditemukan di server" }, { status: 404 });
  }
}

