import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

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

    // Redirect to static CDN asset so Vercel CDN streams the PDF directly without 4.5MB Serverless Function payload limits
    const cleanPath = ebook.filePath.startsWith("/") ? ebook.filePath : `/${ebook.filePath}`;
    const targetUrl = new URL(cleanPath, request.url);
    return NextResponse.redirect(targetUrl, 307);
  } catch (err) {
    console.error("Read eBook file error:", err);
    return NextResponse.json({ error: "Gagal memproses tautan E-Book" }, { status: 500 });
  }
}

