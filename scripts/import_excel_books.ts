import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();

function mapDdcToCategoryAndShelf(ddc: number | null, title: string, createdShelves: Record<string, string>) {
  const lowerTitle = title.toLowerCase();

  // If DDC is specified
  if (ddc !== null && ddc !== undefined) {
    if (ddc >= 200 && ddc < 300) {
      return { category: "Agama", bookshelfId: createdShelves["Rak F - Agama"] };
    }
    if (ddc >= 100 && ddc < 200) {
      return { category: "Pengembangan Diri", bookshelfId: createdShelves["Rak C - Pengembangan Diri"] };
    }
    if (ddc >= 300 && ddc < 400) {
      return { category: "Sejarah", bookshelfId: createdShelves["Rak E - Sejarah"] };
    }
    if (ddc >= 400 && ddc < 500) {
      return { category: "Sastra", bookshelfId: createdShelves["Rak B - Sastra"] };
    }
    if (ddc >= 500 && ddc < 600) {
      return { category: "Sains", bookshelfId: createdShelves["Rak D - Sains"] };
    }
    if (ddc >= 600 && ddc < 700) {
      return { category: "Teknologi", bookshelfId: createdShelves["Rak D - Sains"] };
    }
    if (ddc >= 700 && ddc < 800) {
      return { category: "Fiksi", bookshelfId: createdShelves["Rak A - Fiksi"] };
    }
    if (ddc >= 800 && ddc < 900) {
      // Sastra / Fiksi
      if (lowerTitle.includes("novel") || lowerTitle.includes("cerita") || lowerTitle.includes("dongeng")) {
        return { category: "Fiksi", bookshelfId: createdShelves["Rak A - Fiksi"] };
      }
      return { category: "Sastra", bookshelfId: createdShelves["Rak B - Sastra"] };
    }
    if (ddc >= 900 && ddc < 1000) {
      return { category: "Sejarah", bookshelfId: createdShelves["Rak E - Sejarah"] };
    }
  }

  // Fallback by title keywords
  if (lowerTitle.includes("islam") || lowerTitle.includes("quran") || lowerTitle.includes("nabi") || lowerTitle.includes("doa") || lowerTitle.includes("fiqih")) {
    return { category: "Agama", bookshelfId: createdShelves["Rak F - Agama"] };
  }
  if (lowerTitle.includes("sains") || lowerTitle.includes("ipa") || lowerTitle.includes("biologi") || lowerTitle.includes("ensiklopedia") || lowerTitle.includes("tanya & jawab")) {
    return { category: "Sains", bookshelfId: createdShelves["Rak D - Sains"] };
  }
  if (lowerTitle.includes("komputer") || lowerTitle.includes("photoshop") || lowerTitle.includes("science") || lowerTitle.includes("teknologi")) {
    return { category: "Teknologi", bookshelfId: createdShelves["Rak D - Sains"] };
  }
  if (lowerTitle.includes("sejarah") || lowerTitle.includes("indonesia") || lowerTitle.includes("geografi") || lowerTitle.includes("benua")) {
    return { category: "Sejarah", bookshelfId: createdShelves["Rak E - Sejarah"] };
  }

  return { category: "Sains", bookshelfId: createdShelves["Rak D - Sains"] };
}

async function main() {
  console.log("🚀 Starting book catalog import from Excel...");

  const excelPath = path.join(process.cwd(), "Katalog_Perpustakaan_MTs_Nurul_Huda_Al_Husna_Dropdown (1).xlsx");
  if (!fs.existsSync(excelPath)) {
    throw new Error(`File not found: ${excelPath}`);
  }

  // Ensure default bookshelves exist
  const bookshelves = [
    { name: "Rak A - Fiksi", location: "Lantai 1, Baris 1", description: "Koleksi buku fiksi & novel" },
    { name: "Rak B - Sastra", location: "Lantai 1, Baris 2", description: "Koleksi sastra Indonesia & dunia" },
    { name: "Rak C - Pengembangan Diri", location: "Lantai 1, Baris 3", description: "Koleksi buku pengembangan diri & motivasi" },
    { name: "Rak D - Sains", location: "Lantai 2, Baris 1", description: "Koleksi buku sains & teknologi" },
    { name: "Rak E - Sejarah", location: "Lantai 2, Baris 2", description: "Koleksi buku sejarah & budaya" },
    { name: "Rak F - Agama", location: "Lantai 2, Baris 3", description: "Koleksi buku agama & keislaman" },
  ];

  const createdShelves: Record<string, string> = {};
  for (const shelf of bookshelves) {
    const s = await prisma.bookshelf.upsert({
      where: { name: shelf.name },
      update: {},
      create: shelf,
    });
    createdShelves[shelf.name] = s.id;
  }
  console.log("✅ Bookshelves verified.");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const sheet = wb.worksheets[0];

  let importedCount = 0;
  let skippedCount = 0;

  const usedIsbns = new Set<string>();

  for (let rowNumber = 5; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const vals = row.values as any[];
    if (!vals) continue;

    const no = vals[1];
    const rawTitle = vals[2];

    if (!rawTitle || !no || String(rawTitle).toUpperCase().includes("SESI")) {
      skippedCount++;
      continue;
    }

    const title = typeof rawTitle === "object" ? (rawTitle.text || JSON.stringify(rawTitle)).trim() : String(rawTitle).trim();
    const rawAuthor = vals[3];
    const author = rawAuthor ? (typeof rawAuthor === "object" ? rawAuthor.text || JSON.stringify(rawAuthor) : String(rawAuthor).trim()) : "Tim Penyusun";
    
    const rawPublisher = vals[4];
    const publisher = rawPublisher ? (typeof rawPublisher === "object" ? rawPublisher.text || JSON.stringify(rawPublisher) : String(rawPublisher).trim()) : "Penerbit Umum";

    const rawYear = vals[6];
    let year = 2020;
    if (typeof rawYear === "number" && rawYear > 1900 && rawYear < 2100) {
      year = rawYear;
    } else if (rawYear) {
      const parsedYear = parseInt(String(rawYear).replace(/[^0-9]/g, ""));
      if (parsedYear > 1900 && parsedYear < 2100) year = parsedYear;
    }

    const ddc = vals[7] !== undefined && vals[7] !== null ? Number(vals[7]) : null;
    const noInduk = vals[8] ? String(vals[8]).trim() : null;

    const rawStock = vals[11];
    const stock = typeof rawStock === "number" && rawStock > 0 ? rawStock : (parseInt(String(rawStock)) || 1);

    const rawIsbn = vals[12];
    let isbn = rawIsbn && String(rawIsbn).trim() !== "-" ? String(rawIsbn).trim() : "";

    // If no valid ISBN, generate a clean unique identifier based on No Induk or Row
    if (!isbn || isbn === "-") {
      if (noInduk && noInduk !== "-") {
        isbn = `PUSD-${noInduk}`;
      } else {
        isbn = `PUSD-ROW${rowNumber}`;
      }
    }

    // Ensure ISBN is globally unique in this batch
    if (usedIsbns.has(isbn)) {
      isbn = `${isbn}-${rowNumber}`;
    }
    usedIsbns.add(isbn);

    const { category, bookshelfId } = mapDdcToCategoryAndShelf(ddc, title, createdShelves);

    await prisma.book.upsert({
      where: { isbn },
      update: {
        title,
        author,
        publisher,
        year,
        category,
        stock,
        bookshelfId,
      },
      create: {
        isbn,
        title,
        author,
        publisher,
        year,
        category,
        stock,
        bookshelfId,
      },
    });

    importedCount++;
    console.log(`[${importedCount}] Imported: "${title}" (ISBN: ${isbn}, Cat: ${category}, Stock: ${stock})`);
  }

  const totalInDb = await prisma.book.count();
  console.log(`\n🎉 Selesai! Berhasil mengimpor/memperbarui ${importedCount} buku dari Excel.`);
  console.log(`📚 Total buku di database sekarang: ${totalInDb} buku.`);
}

main()
  .catch((e) => {
    console.error("❌ Error importing books:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
