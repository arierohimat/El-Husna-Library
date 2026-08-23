import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.user.findMany({
    where: { role: "SISWA" },
    select: { id: true, name: true, email: true, kelas: true },
    orderBy: [{ kelas: "asc" }, { name: "asc" }],
  });

  console.log("Total SISWA in database:", students.length);
  const byClass: Record<string, any[]> = {};
  students.forEach((s) => {
    const k = s.kelas || "Tanpa Kelas";
    if (!byClass[k]) byClass[k] = [];
    byClass[k].push(s);
  });

  Object.keys(byClass).forEach((k) => {
    console.log(`Kelas ${k}: ${byClass[k].length} siswa`);
  });

  const books = await prisma.book.findMany({ select: { id: true, title: true } });
  console.log("Total books in DB:", books.length);

  const ebooks = await prisma.eBook.findMany({ select: { id: true, title: true } });
  console.log("Total ebooks in DB:", ebooks.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
