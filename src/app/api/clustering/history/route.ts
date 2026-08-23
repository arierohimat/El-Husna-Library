import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/clustering/history - List all historical clustering runs
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const runs = await db.clusteringRun.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        totalProcessed: true,
        iterations: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ runs });
  } catch (error: any) {
    console.error("GET /api/clustering/history error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
