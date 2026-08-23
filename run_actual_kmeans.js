const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const db = new PrismaClient();

function euclideanDistance(a, b) {
  const d0 = a[0] - b[0];
  const d1 = a[1] - b[1];
  const d2 = a[2] - b[2];
  return Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2);
}

async function getSiswaActivityDataset() {
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

async function main() {
  console.log("Fetching getSiswaActivityDataset() from actual database...");
  const dataset = await getSiswaActivityDataset();
  console.log(`TOTAL_SISWA_FETCHED: ${dataset.length}`);

  const points = dataset.map((d) => ({
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
  const sortedPoints = [...points].sort(
    (a, b) =>
      a.vector[0] + a.vector[1] + a.vector[2] - (b.vector[0] + b.vector[1] + b.vector[2])
  );

  let centroids = [];
  if (K === 1) {
    centroids = [[...sortedPoints[0].vector]];
  } else if (K === 2) {
    centroids = [
      [...sortedPoints[0].vector],
      [...sortedPoints[sortedPoints.length - 1].vector],
    ];
  } else {
    const midIdx = Math.floor(sortedPoints.length / 2);
    centroids = [
      [...sortedPoints[0].vector],
      [...sortedPoints[midIdx].vector],
      [...sortedPoints[sortedPoints.length - 1].vector],
    ];
  }

  console.log("INITIAL_CENTROIDS:", JSON.stringify(centroids));

  let iterations = 0;
  const maxIterations = 100;
  let changed = true;

  while (changed && iterations < maxIterations) {
    iterations++;
    changed = false;

    // Assignment step
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

    // Update step
    const newCentroids = centroids.map(() => [0, 0, 0]);
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
        newCentroids[k] = [...centroids[k]];
      }
    }

    centroids = newCentroids;
  }

  // 3. Pemetaan Label Cluster
  const centroidScores = centroids.map((c, idx) => ({
    index: idx,
    score: c[0] + c[1] + c[2],
    centroid: c,
  }));

  centroidScores.sort((a, b) => b.score - a.score);

  const labelMapping = {};
  const sortedLabels = ["Tinggi", "Sedang", "Rendah"];

  centroidScores.forEach((cs, rank) => {
    labelMapping[cs.index] = sortedLabels[rank] || "Rendah";
  });

  for (const point of points) {
    point.clusterLabel = labelMapping[point.clusterIndex];
  }

  const finalCentroidsSummary = centroidScores.map((cs) => {
    const label = labelMapping[cs.index];
    const count = points.filter((p) => p.clusterLabel === label).length;
    return {
      label,
      vector: cs.centroid,
      count,
    };
  });

  const output = {
    totalSiswa: dataset.length,
    datasetRaw: dataset,
    clusteringResult: {
      totalProcessed: points.length,
      iterations,
      centroids: finalCentroidsSummary,
      studentResults: points.map((p) => ({
        userId: p.userId,
        name: p.name,
        kelas: p.kelas,
        totalBorrow: p.vector[0],
        totalReturn: p.vector[1],
        totalEbook: p.vector[2],
        clusterIndex: p.clusterIndex,
        clusterLabel: p.clusterLabel,
        distanceToCentroid: parseFloat(p.distance.toFixed(4)),
      })),
    },
  };

  fs.writeFileSync("actual_kmeans_output.json", JSON.stringify(output, null, 2));
  console.log("SUCCESS_DONE");
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
