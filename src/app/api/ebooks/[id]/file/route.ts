import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import path from "path";
import os from "os";
import { access, readFile } from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ebook = await db.eBook.findUnique({
    where: { id },
    omit: { coverImage: true },
  });
  if (!ebook) return NextResponse.json({ error: "E-Book tidak ditemukan" }, { status: 404 });

  try {
    try {
      await db.eBookAccess.upsert({
        where: { ebookId_userId: { ebookId: ebook.id, userId: session.userId } },
        create: { ebookId: ebook.id, userId: session.userId },
        update: { accessCount: { increment: 1 }, lastReadAt: new Date() },
      });
    } catch (dbErr) {
      console.error("Failed to update eBookAccess:", dbErr);
    }

    if (ebook.filePath.startsWith("http://") || ebook.filePath.startsWith("https://")) {
      return NextResponse.redirect(ebook.filePath, 307);
    }

    const cleanPath = ebook.filePath.startsWith("/") ? ebook.filePath : `/${ebook.filePath}`;
    const publicPath = path.join(process.cwd(), "public", cleanPath.replace(/^\//, ""));
    const tmpPath = path.join(os.tmpdir(), "uploads", "ebooks", path.basename(ebook.filePath));

    // 1. Try public static path first (fastest via CDN)
    try {
      await access(publicPath);
      const targetUrl = new URL(cleanPath, request.url);
      return NextResponse.redirect(targetUrl, 307);
    } catch {
      // 2. If not in public (e.g. uploaded in serverless session), try /tmp
      try {
        await access(tmpPath);
        const data = await readFile(tmpPath);
        return new NextResponse(data, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${encodeURIComponent(ebook.fileName || 'ebook.pdf')}"`,
          },
        });
      } catch {
        // 3. Fallback to redirecting to public CDN URL
        const targetUrl = new URL(cleanPath, request.url);
        return NextResponse.redirect(targetUrl, 307);
      }
    }
  } catch (err) {
    console.error("Read eBook file error:", err);
    return NextResponse.json({ error: "Gagal memproses tautan E-Book" }, { status: 500 });
  }
}

