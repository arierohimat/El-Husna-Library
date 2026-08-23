import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { executeKMeansClustering, getSiswaActivityDataset } from "@/lib/kmeans";

// GET /api/clustering - Fetch latest or specific clustering run result
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    // Total siswa yang tersedia di database
    const siswaDataset = await getSiswaActivityDataset();
    const availableCount = siswaDataset.length;

    let run: any = null;

    if (runId) {
      run = await db.clusteringRun.findUnique({
        where: { id: runId },
        include: {
          results: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  kelas: true,
                },
              },
            },
            orderBy: {
              user: { name: "asc" },
            },
          },
        },
      });
    } else {
      // Ambil run paling terbaru
      run = await db.clusteringRun.findFirst({
        orderBy: { createdAt: "desc" },
        include: {
          results: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  kelas: true,
                },
              },
            },
            orderBy: {
              user: { name: "asc" },
            },
          },
        },
      });
    }

    let formattedRun: any = null;
    if (run) {
      formattedRun = {
        runId: run.id,
        totalProcessed: run.totalProcessed,
        iterations: run.iterations,
        centroids: run.centroids,
        createdAt: run.createdAt,
        results: run.results.map((r) => ({
          id: r.id,
          userId: r.userId,
          name: r.user?.name || "Siswa",
          email: r.user?.email || "-",
          kelas: r.user?.kelas || "-",
          totalBorrow: r.totalBorrow,
          totalReturn: r.totalReturn,
          totalEbook: r.totalEbook,
          clusterLabel: r.clusterLabel,
          clusterIndex: r.clusterIndex,
        })),
      };
    }

    return NextResponse.json({
      availableCount,
      hasData: availableCount > 0,
      run: formattedRun,
    });
  } catch (error: any) {
    console.error("GET /api/clustering error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/clustering - Execute K-Means clustering process
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validasi ketersediaan data aktivitas siswa terlebih dahulu
    const siswaDataset = await getSiswaActivityDataset();

    if (!siswaDataset || siswaDataset.length === 0) {
      return NextResponse.json(
        {
          error: "Data aktivitas siswa belum tersedia untuk diproses.",
          code: "NO_DATA",
        },
        { status: 400 }
      );
    }

    // Jalankan algoritma K-Means & simpan ke DB
    const summary = await executeKMeansClustering();

    return NextResponse.json({
      success: true,
      message: "Proses clustering berhasil dilaksanakan.",
      summary,
    });
  } catch (error: any) {
    console.error("POST /api/clustering error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan saat memproses clustering K-Means." },
      { status: 500 }
    );
  }
}
