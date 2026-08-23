import { PrismaClient, BorrowStatus } from "@prisma/client";
import { executeKMeansClustering } from "../src/lib/kmeans";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting student activity generation for K-Means Clustering...");

  // 1. Fetch all SISWA
  const students = await prisma.user.findMany({
    where: { role: "SISWA" },
    select: { id: true, name: true, email: true, kelas: true },
    orderBy: [{ kelas: "asc" }, { name: "asc" }],
  });

  console.log(`Total students found: ${students.length}`);

  // 2. Fetch books and ebooks
  const books = await prisma.book.findMany({ select: { id: true, title: true } });
  const ebooks = await prisma.eBook.findMany({ select: { id: true, title: true } });

  if (books.length === 0 || ebooks.length === 0) {
    throw new Error("Books or EBooks not found in database.");
  }
  console.log(`Loaded ${books.length} physical books and ${ebooks.length} ebooks.`);

  // 3. Clear existing activity data
  console.log("🧹 Clearing old activities & clustering runs...");
  await prisma.clusteringResult.deleteMany();
  await prisma.clusteringRun.deleteMany();
  await prisma.readingProgress.deleteMany();
  await prisma.eBookAccess.deleteMany();
  await prisma.borrowing.deleteMany();
  console.log("✅ Cleared old activity data.");

  // 4. Group students by class
  const byClass: Record<string, typeof students> = {
    "VII-A": [],
    "VII-B": [],
    "VIII-A": [],
    "VIII-B": [],
    "IX-A": [],
  };

  students.forEach((s) => {
    const k = s.kelas || "VII-A";
    if (!byClass[k]) byClass[k] = [];
    byClass[k].push(s);
  });

  // Class allocation mapping: [Tinggi, Sedang, Rendah]
  // Total: Tinggi = 10+7+12+2+9 = 40
  //        Sedang = 7+5+9+1+8 = 30
  //        Rendah = 8+6+10+1+7 = 32
  // Total = 40 + 30 + 32 = 102
  const classPlan: Record<string, { tinggi: number; sedang: number; rendah: number }> = {
    "VII-A": { tinggi: 10, sedang: 7, rendah: 8 },  // Total 25
    "VII-B": { tinggi: 7, sedang: 5, rendah: 6 },   // Total 18
    "VIII-A": { tinggi: 12, sedang: 9, rendah: 10 }, // Total 31
    "VIII-B": { tinggi: 2, sedang: 1, rendah: 1 },   // Total 4
    "IX-A": { tinggi: 9, sedang: 8, rendah: 7 },    // Total 24
  };

  const studentTierMap = new Map<string, "Tinggi" | "Sedang" | "Rendah">();

  Object.entries(classPlan).forEach(([className, plan]) => {
    const classStudents = byClass[className] || [];
    let idx = 0;
    
    // Assign Tinggi
    for (let i = 0; i < plan.tinggi && idx < classStudents.length; i++, idx++) {
      studentTierMap.set(classStudents[idx].id, "Tinggi");
    }
    // Assign Sedang
    for (let i = 0; i < plan.sedang && idx < classStudents.length; i++, idx++) {
      studentTierMap.set(classStudents[idx].id, "Sedang");
    }
    // Assign Rendah
    for (let i = 0; i < plan.rendah && idx < classStudents.length; i++, idx++) {
      studentTierMap.set(classStudents[idx].id, "Rendah");
    }
  });

  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const now = new Date();

  const borrowingsBatch: any[] = [];
  const readingProgressBatch: any[] = [];
  const ebookAccessBatch: any[] = [];

  for (let sIdx = 0; sIdx < students.length; sIdx++) {
    const student = students[sIdx];
    const tier = studentTierMap.get(student.id) || "Rendah";

    let numBorrows = 0;
    let numProgress = 0;
    let ebookAccessTargets: { ebookIndex: number; count: number }[] = [];

    if (tier === "Tinggi") {
      // Tinggi: High borrowing (9-13), high reading progress (3-5), high ebook accesses (18-28 total accesses)
      numBorrows = randInt(9, 13);
      numProgress = randInt(3, 5);
      
      const numEbooksRead = randInt(4, 7);
      for (let i = 0; i < numEbooksRead; i++) {
        const ebIdx = (sIdx * 3 + i) % ebooks.length;
        ebookAccessTargets.push({
          ebookIndex: ebIdx,
          count: randInt(3, 5),
        });
      }
    } else if (tier === "Sedang") {
      // Sedang: Moderate borrowing (4-6), moderate reading progress (1-2), moderate ebook accesses (6-11 total accesses)
      numBorrows = randInt(4, 6);
      numProgress = randInt(1, 2);

      const numEbooksRead = randInt(2, 4);
      for (let i = 0; i < numEbooksRead; i++) {
        const ebIdx = (sIdx * 2 + i) % ebooks.length;
        ebookAccessTargets.push({
          ebookIndex: ebIdx,
          count: randInt(2, 3),
        });
      }
    } else {
      // Rendah: Very low / zero (0-1 borrow, 0-1 progress, 0-1 ebook access)
      numBorrows = sIdx % 3 === 0 ? 1 : 0;
      numProgress = sIdx % 5 === 0 ? 1 : 0;
      
      if (sIdx % 2 === 0) {
        ebookAccessTargets.push({
          ebookIndex: sIdx % ebooks.length,
          count: 1,
        });
      }
    }

    // A. Borrowings
    const usedBookIndices = new Set<number>();
    for (let b = 0; b < numBorrows; b++) {
      let bIdx = (sIdx * 7 + b * 13) % books.length;
      while (usedBookIndices.has(bIdx)) {
        bIdx = (bIdx + 1) % books.length;
      }
      usedBookIndices.add(bIdx);

      const book = books[bIdx];
      const daysAgo = randInt(5, 90);
      const borrowDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const dueDate = new Date(borrowDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const isReturned = b < numBorrows - 1 || Math.random() > 0.3;
      const returnDate = isReturned
        ? new Date(borrowDate.getTime() + randInt(2, 6) * 24 * 60 * 60 * 1000)
        : null;
      const status: BorrowStatus = isReturned ? BorrowStatus.RETURNED : BorrowStatus.ACTIVE;

      borrowingsBatch.push({
        userId: student.id,
        bookId: book.id,
        borrowDate,
        dueDate,
        returnDate,
        status,
        fine: 0,
      });
    }

    // B. Reading Progress
    const usedProgressBookIndices = new Set<number>();
    for (let p = 0; p < numProgress; p++) {
      let pIdx = (sIdx * 5 + p * 11) % books.length;
      while (usedProgressBookIndices.has(pIdx)) {
        pIdx = (pIdx + 1) % books.length;
      }
      usedProgressBookIndices.add(pIdx);

      const book = books[pIdx];
      const totalPages = randInt(120, 350);
      const currentPage = tier === "Tinggi" ? randInt(80, totalPages) : randInt(20, 100);

      readingProgressBatch.push({
        userId: student.id,
        bookId: book.id,
        currentPage,
        totalPages,
        notes: tier === "Tinggi" ? "Sangat informatif dan bermanfaat" : "Buku bagus",
        startedAt: new Date(now.getTime() - randInt(10, 60) * 24 * 60 * 60 * 1000),
      });
    }

    // C. EBook Accesses
    for (const eb of ebookAccessTargets) {
      const targetEbook = ebooks[eb.ebookIndex];
      ebookAccessBatch.push({
        userId: student.id,
        ebookId: targetEbook.id,
        accessCount: eb.count,
        lastReadAt: new Date(now.getTime() - randInt(1, 30) * 24 * 60 * 60 * 1000),
      });
    }
  }

  console.log(`📦 Batch inserting: ${borrowingsBatch.length} borrowings, ${readingProgressBatch.length} readingProgress, ${ebookAccessBatch.length} ebookAccesses...`);

  await prisma.borrowing.createMany({ data: borrowingsBatch });
  await prisma.readingProgress.createMany({ data: readingProgressBatch });
  await prisma.eBookAccess.createMany({ data: ebookAccessBatch });

  console.log("✅ Batch insert complete!");

  // 6. Execute K-Means clustering algorithm
  console.log("⚡ Executing K-Means clustering algorithm...");
  const summary = await executeKMeansClustering();

  console.log("\n🎉 K-Means Clustering Result:");
  console.log(`- Total Processed: ${summary.totalProcessed}`);
  console.log(`- Iterations: ${summary.iterations}`);
  console.log("- Centroids:");
  summary.centroids.forEach((c) => {
    console.log(`  * Cluster ${c.label}: Count = ${c.count}, Centroid Vector = [Borrow: ${c.vector[0]}, Return: ${c.vector[1]}, EBook: ${c.vector[2]}]`);
  });

  const clusterCountsByClass: Record<string, { Tinggi: number; Sedang: number; Rendah: number; Total: number }> = {
    "VII-A": { Tinggi: 0, Sedang: 0, Rendah: 0, Total: 0 },
    "VII-B": { Tinggi: 0, Sedang: 0, Rendah: 0, Total: 0 },
    "VIII-A": { Tinggi: 0, Sedang: 0, Rendah: 0, Total: 0 },
    "VIII-B": { Tinggi: 0, Sedang: 0, Rendah: 0, Total: 0 },
    "IX-A": { Tinggi: 0, Sedang: 0, Rendah: 0, Total: 0 },
  };

  summary.results.forEach((r) => {
    const k = r.kelas || "VII-A";
    if (clusterCountsByClass[k]) {
      clusterCountsByClass[k][r.clusterLabel]++;
      clusterCountsByClass[k].Total++;
    }
  });

  console.log("\n📊 Cluster Distribution per Class:");
  console.table(clusterCountsByClass);
}

main()
  .catch((e) => {
    console.error("❌ Error generating activities:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
