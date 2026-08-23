import { db } from "@/lib/db";

export interface SiswaActivityData {
  userId: string;
  name: string;
  email: string;
  kelas: string | null;
  totalBorrow: number;
  totalReturn: number;
  totalEbook: number;
}

export interface KPoint {
  userId: string;
  name: string;
  email: string;
  kelas: string | null;
  vector: [number, number, number]; // [totalBorrow, totalReturn, totalEbook]
  clusterIndex: number;
  clusterLabel: "Tinggi" | "Sedang" | "Rendah";
  distance: number;
}

export interface ClusteringRunSummary {
  runId: string;
  totalProcessed: number;
  iterations: number;
  centroids: Array<{
    label: "Tinggi" | "Sedang" | "Rendah";
    vector: [number, number, number];
    count: number;
  }>;
  results: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
    kelas: string | null;
    totalBorrow: number;
    totalReturn: number;
    totalEbook: number;
    clusterLabel: "Tinggi" | "Sedang" | "Rendah";
    clusterIndex: number;
  }>;
  createdAt: Date;
}

/**
 * Menghitung Euclidean Distance antara 2 vektor 3D
 */

export function euclideanDistance(a: [number, number, number], b: [number, number, number]): number {
  const d0 = a[0] - b[0];
  const d1 = a[1] - b[1];
  const d2 = a[2] - b[2];
  return Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2);
}

/**
 * Mengambil dataset aktivitas seluruh siswa dari basis data
 */
export async function getSiswaActivityDataset(): Promise<SiswaActivityData[]> {
  const siswaList = await db.user.findMany({
    where: { role: "SISWA" },

    select: {
      id: true,
      name: true,
      email: true,
      kelas: true,
      borrowings: {
        select: {
          status: true,
          returnDate: true,
        },
      },
      readingProgress: {
        select: {
          id: true,
        },
      },
      ebookAccesses: {
        select: {
          id: true,
          accessCount: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return siswaList.map((m) => {
    const totalBorrow = m.borrowings.length;
    const totalReturn = m.borrowings.filter(
      (b) => b.status === "RETURNED" || b.returnDate !== null
    ).length;
    // Physical reading progress + total E-Book access counts
    const totalEbookAccesses = m.ebookAccesses.reduce(
      (sum, acc) => sum + (acc.accessCount || 1),
      0
    );
    const totalEbook = m.readingProgress.length + totalEbookAccesses;

    return {
      userId: m.id,
      name: m.name,
      email: m.email,
      kelas: m.kelas,
      totalBorrow,
      totalReturn,
      totalEbook,
    };
  });
}

/**
 * Jalankan Algoritma K-Means Clustering dengan K = 3
 */
export async function executeKMeansClustering(): Promise<ClusteringRunSummary> {
  const dataset = await getSiswaActivityDataset();

  if (dataset.length === 0) {
    throw new Error("Data siswa belum tersedia di basis data.");
  }

  const points: KPoint[] = dataset.map((d) => ({
    userId: d.userId,
    name: d.name,
    email: d.email,
    kelas: d.kelas,
    vector: [d.totalBorrow, d.totalReturn, d.totalEbook],
    clusterIndex: 0,
    clusterLabel: "Rendah",
    distance: 0,
  }));

  const K = Math.min(3, points.length);

  // 1. Inisialisasi Centroid Awal
  // Urutkan data berdasarkan jumlah nilai aktivitas composite
  const sortedPoints = [...points].sort(
    (a, b) =>
      a.vector[0] + a.vector[1] + a.vector[2] - (b.vector[0] + b.vector[1] + b.vector[2])
  );

  let centroids: [number, number, number][] = [];

  if (K === 1) {
    centroids = [[...sortedPoints[0].vector]];
  } else if (K === 2) {
    centroids = [
      [...sortedPoints[0].vector],
      [...sortedPoints[sortedPoints.length - 1].vector],
    ];
  } else {
    // K = 3: Min, Median, Max activity points
    const midIdx = Math.floor(sortedPoints.length / 2);
    centroids = [
      [...sortedPoints[0].vector],
      [...sortedPoints[midIdx].vector],
      [...sortedPoints[sortedPoints.length - 1].vector],
    ];
  }

  let iterations = 0;
  const maxIterations = 100;
  let changed = true;

  // 2. Iterasi K-Means
  while (changed && iterations < maxIterations) {
    iterations++;
    changed = false;

    // Assignment step: tentukan cluster terdekat per point
    for (const point of points) {
      let minDistance = Infinity;
      let closestCluster = 0;

      for (let k = 0; k < centroids.length; k++) {
        const dist = euclideanDistance(point.vector, centroids[k]);
        if (dist < minDistance) {
          minDistance = dist;
          closestCluster = k;
        }
      }

      if (point.clusterIndex !== closestCluster) {
        point.clusterIndex = closestCluster;
        changed = true;
      }
      point.distance = minDistance;
    }

    // Update step: hitung ulang centroid
    const newCentroids: [number, number, number][] = centroids.map(() => [0, 0, 0]);
    const clusterCounts = centroids.map(() => 0);

    for (const point of points) {
      const c = point.clusterIndex;
      newCentroids[c][0] += point.vector[0];
      newCentroids[c][1] += point.vector[1];
      newCentroids[c][2] += point.vector[2];
      clusterCounts[c]++;
    }

    for (let k = 0; k < centroids.length; k++) {
      if (clusterCounts[k] > 0) {
        newCentroids[k][0] = parseFloat((newCentroids[k][0] / clusterCounts[k]).toFixed(2));
        newCentroids[k][1] = parseFloat((newCentroids[k][1] / clusterCounts[k]).toFixed(2));
        newCentroids[k][2] = parseFloat((newCentroids[k][2] / clusterCounts[k]).toFixed(2));
      } else {
        // jika cluster kosong, pertahankan centroid lama
        newCentroids[k] = [...centroids[k]];
      }
    }

    centroids = newCentroids;
  }

  // 3. Pemetaan Label Cluster berdasarkan Skor Composite Aktivitas Centroid
  // Centroid dengan sum aktivitas terbanyak = "Tinggi", tengah = "Sedang", terendah = "Rendah"
  const centroidScores = centroids.map((c, idx) => ({
    index: idx,
    score: c[0] + c[1] + c[2],
    centroid: c,
  }));

  centroidScores.sort((a, b) => b.score - a.score);

  const labelMapping: Record<number, "Tinggi" | "Sedang" | "Rendah"> = {};
  const sortedLabels: ("Tinggi" | "Sedang" | "Rendah")[] = ["Tinggi", "Sedang", "Rendah"];

  centroidScores.forEach((cs, rank) => {
    labelMapping[cs.index] = sortedLabels[rank] || "Rendah";
  });

  // Assign label ke setiap point
  for (const point of points) {
    point.clusterLabel = labelMapping[point.clusterIndex];
  }

  // Format statistik centroid untuk disimpan
  const finalCentroidsSummary = centroidScores.map((cs) => {
    const label = labelMapping[cs.index];
    const count = points.filter((p) => p.clusterLabel === label).length;
    return {
      label,
      vector: cs.centroid,
      count,
    };
  });

  // 4. Simpan Hasil Clustering ke Database dalam Transaksi Prisma
  const run = await db.$transaction(async (tx) => {
    const clusteringRun = await tx.clusteringRun.create({
      data: {
        totalProcessed: points.length,
        iterations,
        centroids: finalCentroidsSummary,
      },
    });

    const resultsData = points.map((p) => ({
      clusteringRunId: clusteringRun.id,
      userId: p.userId,
      totalBorrow: p.vector[0],
      totalReturn: p.vector[1],
      totalEbook: p.vector[2],
      clusterLabel: p.clusterLabel,
      clusterIndex: p.clusterIndex,
    }));

    await tx.clusteringResult.createMany({
      data: resultsData,
    });

    return tx.clusteringRun.findUnique({
      where: { id: clusteringRun.id },
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
        },
      },
    });
  });

  if (!run) {
    throw new Error("Gagal menyimpan hasil clustering.");
  }

  return {
    runId: run.id,
    totalProcessed: run.totalProcessed,
    iterations: run.iterations,
    centroids: finalCentroidsSummary,
    createdAt: run.createdAt,
    results: run.results.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.user.name,
      email: r.user.email,
      kelas: r.user.kelas,
      totalBorrow: r.totalBorrow,
      totalReturn: r.totalReturn,
      totalEbook: r.totalEbook,
      clusterLabel: r.clusterLabel as "Tinggi" | "Sedang" | "Rendah",
      clusterIndex: r.clusterIndex,
    })),
  };
}
