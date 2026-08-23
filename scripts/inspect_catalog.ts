import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("./Katalog_Perpustakaan_MTs_Nurul_Huda_Al_Husna_Dropdown (1).xlsx");
  const sheet = wb.worksheets[0];

  console.log("Sheet Name:", sheet.name);
  console.log("Total rows:", sheet.rowCount);

  const shelves = await prisma.bookshelf.findMany();
  console.log("Existing Bookshelves:", shelves);

  const booksCount = await prisma.book.count();
  console.log("Existing Books count in DB:", booksCount);

  const booksData: any[] = [];
  const headerRow = sheet.getRow(4).values as any[];
  console.log("Header row:", headerRow);

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 4) return;
    const vals = row.values as any[];
    // vals[1] = No
    // vals[2] = Judul Buku
    // vals[3] = Pengarang
    // vals[4] = Penerbit
    // vals[5] = Tempat Terbit
    // vals[6] = Tahun Terbit
    // vals[7] = Klasifikasi (DDC)
    // vals[8] = No Induk
    // vals[9] = Rak
    // vals[10] = Jenis Buku
    // vals[11] = Jumlah
    // vals[12] = ISBN
    const no = vals[1];
    const title = vals[2];
    const author = vals[3];
    const publisher = vals[4];
    const place = vals[5];
    const year = vals[6];
    const ddc = vals[7];
    const noInduk = vals[8];
    const rak = vals[9];
    const jenisBuku = vals[10];
    const stock = vals[11];
    const isbn = vals[12];

    if (title) {
      booksData.push({
        rowNumber,
        no,
        title: typeof title === "object" ? title.text || JSON.stringify(title) : String(title).trim(),
        author: author ? (typeof author === "object" ? author.text || JSON.stringify(author) : String(author).trim()) : "Anonim",
        publisher: publisher ? (typeof publisher === "object" ? publisher.text || JSON.stringify(publisher) : String(publisher).trim()) : "Tidak Diketahui",
        place: place ? String(place).trim() : null,
        year: typeof year === "number" ? year : (parseInt(String(year)) || 2020),
        ddc,
        noInduk,
        rak,
        jenisBuku,
        stock: typeof stock === "number" ? stock : (parseInt(String(stock)) || 1),
        isbn: isbn ? String(isbn).trim() : null,
      });
    }
  });

  console.log(`Parsed ${booksData.length} books from Excel.`);
  console.log("Sample 5 parsed books:", JSON.stringify(booksData.slice(0, 5), null, 2));

  // Check unique ISBNs / duplicates / missing ISBNs
  const isbnMap = new Map<string, number>();
  const titlesWithoutIsbn: any[] = [];
  const duplicateIsbns: any[] = [];

  booksData.forEach((b) => {
    if (!b.isbn) {
      titlesWithoutIsbn.push(b);
    } else {
      if (isbnMap.has(b.isbn)) {
        duplicateIsbns.push({ isbn: b.isbn, title: b.title, firstRow: isbnMap.get(b.isbn), currentRow: b.rowNumber });
      } else {
        isbnMap.set(b.isbn, b.rowNumber);
      }
    }
  });

  console.log("Books without ISBN:", titlesWithoutIsbn.length);
  if (titlesWithoutIsbn.length > 0) {
    console.log("Sample without ISBN:", titlesWithoutIsbn.slice(0, 5));
  }
  console.log("Duplicate ISBNs:", duplicateIsbns.length);
  if (duplicateIsbns.length > 0) {
    console.log("Duplicate ISBNs details:", duplicateIsbns);
  }

  // Check DDC / Categories / Raks
  const ddcSet = new Set(booksData.map((b) => b.ddc));
  console.log("Unique DDC values:", Array.from(ddcSet));
  const rakSet = new Set(booksData.map((b) => b.rak));
  console.log("Unique Rak values:", Array.from(rakSet));
  const jenisSet = new Set(booksData.map((b) => b.jenisBuku));
  console.log("Unique Jenis Buku values:", Array.from(jenisSet));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
