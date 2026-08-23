import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ===== BOOKSHELVES =====
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
    console.log("✅ Bookshelf created:", shelf.name);
  }

  // ===== ADMIN USER =====
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@elhusna.com" },
    update: {},
    create: {
      email: "admin@elhusna.com",
      username: "admin",
      password: adminPassword,
      name: "Administrator",
      role: Role.ADMIN,
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // ===== GURU / WALI KELAS USERS =====
  const walikelasPassword = await bcrypt.hash("walikelas123", 10);
  const dataPath = path.join(process.cwd(), "db", "students_teachers_data.json");
  let jsonRaw = "";
  try {
    jsonRaw = await fs.readFile(dataPath, "utf-8");
  } catch (e) {
    console.warn("⚠️ Data JSON file not found at db/students_teachers_data.json");
  }

  if (jsonRaw) {
    const data = JSON.parse(jsonRaw);
    
    // Seed Teachers
    const teachersMap = new Map<string, any>();
    for (const t of data.teachers || []) {
      if (t.nama && !teachersMap.has(t.nama)) {
        teachersMap.set(t.nama, t);
      }
    }

    let teacherIdx = 1;
    for (const [nama, t] of teachersMap.entries()) {
      const cleanSlug = nama.toLowerCase().replace(/[^a-z0-9]/g, "");
      const username = `guru_${cleanSlug.slice(0, 12)}_${teacherIdx}`;
      const email = `${username}@elhusna.com`;
      await prisma.user.upsert({
        where: { email },
        update: { name: nama },
        create: {
          email,
          username,
          password: walikelasPassword,
          name: nama,
          role: Role.GURU,
        },
      });
      teacherIdx++;
    }
    console.log(`✅ ${teachersMap.size} Teachers seeded as GURU`);


    // Seed Students
    const students = data.students || [];
    let seededStudents = 0;
    const usedUsernames = new Set<string>();

    for (let idx = 0; idx < students.length; idx++) {
      const s = students[idx];
      const sanitizedNisn = (s.nisn || "").trim().replace(/[^0-9]/g, "") || `123456789${idx}`;
      
      let baseUsername = s.nama
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      if (!baseUsername) {
        baseUsername = `siswa_${sanitizedNisn}`;
      }

      let finalUsername = baseUsername;
      let counter = 1;
      while (usedUsernames.has(finalUsername)) {
        finalUsername = `${baseUsername}_${counter}`;
        counter++;
      }
      usedUsernames.add(finalUsername);

      const email = `siswa_${sanitizedNisn}@elhusna.com`;
      const studentPassword = await bcrypt.hash(sanitizedNisn, 10);

      await prisma.user.upsert({
        where: { email },
        update: {
          name: s.nama,
          kelas: s.kelas,
          username: finalUsername,
          password: studentPassword,
        },
        create: {
          email,
          username: finalUsername,
          password: studentPassword,
          name: s.nama,
          kelas: s.kelas,
          role: Role.SISWA,
        },
      });
      seededStudents++;
    }
    console.log(`✅ ${seededStudents} Students seeded as SISWA with NISN passwords`);
  } else {
    // Default fallback
    const walikelas = await prisma.user.upsert({
      where: { email: "walikelas@elhusna.com" },
      update: {},
      create: {
        email: "walikelas@elhusna.com",
        username: "walikelas",
        password: walikelasPassword,
        name: "Bpk. Ahmad Fauzi",
        role: Role.GURU,
        kelas: "VII-A",
      },
    });
    console.log("✅ Guru user created:", walikelas.email);


    const memberPassword = await bcrypt.hash("member123", 10);
    const members = [
      { email: "siswa1@elhusna.com", username: "siswa1", name: "Ahmad Santoso", kelas: "VII-A" },
      { email: "siswa2@elhusna.com", username: "siswa2", name: "Siti Aisyah", kelas: "VII-A" },
      { email: "siswa3@elhusna.com", username: "siswa3", name: "Muhammad Rizki", kelas: "VII-B" },
    ];

    for (const m of members) {
      await prisma.user.upsert({
        where: { email: m.email },
        update: {},
        create: {
          ...m,
          password: memberPassword,
          role: Role.SISWA,
        },
      });
      console.log("✅ Siswa created:", m.name, `(${m.kelas})`);
    }
  }



  // ===== BOOKS =====
  const excelCatalogPath = path.join(process.cwd(), "Katalog_Perpustakaan_MTs_Nurul_Huda_Al_Husna_Dropdown (1).xlsx");
  let excelBookCount = 0;

  try {
    const fileExists = await fs.stat(excelCatalogPath).then(() => true).catch(() => false);
    if (fileExists) {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(excelCatalogPath);
      const sheet = wb.worksheets[0];

      const usedIsbns = new Set<string>();

      for (let rowNumber = 5; rowNumber <= sheet.rowCount; rowNumber++) {
        const row = sheet.getRow(rowNumber);
        const vals = row.values as any[];
        if (!vals) continue;

        const no = vals[1];
        const rawTitle = vals[2];

        if (!rawTitle || !no || String(rawTitle).toUpperCase().includes("SESI")) continue;

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

        if (!isbn || isbn === "-") {
          isbn = noInduk && noInduk !== "-" ? `PUSD-${noInduk}` : `PUSD-ROW${rowNumber}`;
        }

        if (usedIsbns.has(isbn)) {
          isbn = `${isbn}-${rowNumber}`;
        }
        usedIsbns.add(isbn);

        let category = "Sains";
        let bookshelfId = createdShelves["Rak D - Sains"];

        const lowerTitle = title.toLowerCase();
        if (ddc !== null && ddc !== undefined) {
          if (ddc >= 200 && ddc < 300) {
            category = "Agama";
            bookshelfId = createdShelves["Rak F - Agama"];
          } else if (ddc >= 100 && ddc < 200) {
            category = "Pengembangan Diri";
            bookshelfId = createdShelves["Rak C - Pengembangan Diri"];
          } else if (ddc >= 300 && ddc < 400) {
            category = "Sejarah";
            bookshelfId = createdShelves["Rak E - Sejarah"];
          } else if (ddc >= 400 && ddc < 500) {
            category = "Sastra";
            bookshelfId = createdShelves["Rak B - Sastra"];
          } else if (ddc >= 500 && ddc < 600) {
            category = "Sains";
            bookshelfId = createdShelves["Rak D - Sains"];
          } else if (ddc >= 600 && ddc < 700) {
            category = "Teknologi";
            bookshelfId = createdShelves["Rak D - Sains"];
          } else if (ddc >= 700 && ddc < 800) {
            category = "Fiksi";
            bookshelfId = createdShelves["Rak A - Fiksi"];
          } else if (ddc >= 800 && ddc < 900) {
            if (lowerTitle.includes("novel") || lowerTitle.includes("cerita") || lowerTitle.includes("dongeng")) {
              category = "Fiksi";
              bookshelfId = createdShelves["Rak A - Fiksi"];
            } else {
              category = "Sastra";
              bookshelfId = createdShelves["Rak B - Sastra"];
            }
          } else if (ddc >= 900 && ddc < 1000) {
            category = "Sejarah";
            bookshelfId = createdShelves["Rak E - Sejarah"];
          }
        } else if (lowerTitle.includes("islam") || lowerTitle.includes("quran") || lowerTitle.includes("nabi") || lowerTitle.includes("doa") || lowerTitle.includes("fiqih")) {
          category = "Agama";
          bookshelfId = createdShelves["Rak F - Agama"];
        }

        await prisma.book.upsert({
          where: { isbn },
          update: { title, author, publisher, year, category, stock, bookshelfId },
          create: { isbn, title, author, publisher, year, category, stock, bookshelfId },
        });

        excelBookCount++;
      }
      console.log(`✅ ${excelBookCount} Books seeded from Excel Catalog.`);
    }
  } catch (err) {
    console.warn("⚠️ Could not load Excel catalog, falling back to default books...", err);
  }

  if (excelBookCount === 0) {
    const books = [
      {
        isbn: "978-602-03-2891-5",
        title: "Laskar Pelangi",
        author: "Andrea Hirata",
        publisher: "Bentang Pustaka",
        year: 2005,
        category: "Fiksi",
        stock: 5,
        bookshelfId: createdShelves["Rak A - Fiksi"],
      },
      {
        isbn: "978-602-03-3342-1",
        title: "Bumi Manusia",
        author: "Pramoedya Ananta Toer",
        publisher: "Hasta Mitra",
        year: 1980,
        category: "Sastra",
        stock: 3,
        bookshelfId: createdShelves["Rak B - Sastra"],
      },
      {
        isbn: "978-602-04-7341-8",
        title: "Gadis Kretek",
        author: "Ratih Kumala",
        publisher: "Gramedia Pustaka Utama",
        year: 2018,
        category: "Fiksi",
        stock: 4,
        bookshelfId: createdShelves["Rak A - Fiksi"],
      },
      {
        isbn: "978-602-03-2993-6",
        title: "Atomic Habits",
        author: "James Clear",
        publisher: "Gramedia Pustaka Utama",
        year: 2018,
        category: "Pengembangan Diri",
        stock: 6,
        bookshelfId: createdShelves["Rak C - Pengembangan Diri"],
      },
      {
        isbn: "978-602-04-6379-2",
        title: "Filosofi Teras",
        author: "Henry Manampiring",
        publisher: "Gramedia Pustaka Utama",
        year: 2018,
        category: "Pengembangan Diri",
        stock: 7,
        bookshelfId: createdShelves["Rak C - Pengembangan Diri"],
      },
    ];

    for (const book of books) {
      await prisma.book.upsert({
        where: { isbn: book.isbn },
        update: {},
        create: book,
      });
      console.log("✅ Book created:", book.title);
    }
  }

  // ===== E-BOOKS =====
  const uploadDir = path.join(process.cwd(), "public", "uploads", "ebooks");
  await fs.mkdir(uploadDir, { recursive: true });

  const samplePdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 55 >>
stream
BT /F1 24 Tf 100 700 Td (E-Book Perpustakaan EL-Husna) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000246 00000 n 
0000000350 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
428
%%EOF
`;

  const sampleEbooks = [
    {
      title: "Modul Sains & Teknologi Digital",
      author: "Dr. Ir. Budi Santoso",
      publisher: "Pustaka Media",
      year: 2023,
      category: "Sains",
      description: "Panduan praktis pembelajaran sains modern untuk sekolah menengah.",
      fileName: "modul-sains-teknologi.pdf",
      fileContent: samplePdfContent,
    },
    {
      title: "Kumpulan Cerita Rakyat Nusantara",
      author: "Rahmat Hidayat",
      publisher: "Balai Sastra",
      year: 2022,
      category: "Sastra",
      description: "Kumpulan cerita rakyat penuh nilai moral dan budaya dari berbagai pelosok Indonesia.",
      fileName: "cerita-rakyat-nusantara.pdf",
      fileContent: samplePdfContent,
    },
    {
      title: "Panduan Belajar Mandiri & Motivasi Siswa",
      author: "Dra. Nurhayati M.Pd",
      publisher: "Edukasi Utama",
      year: 2024,
      category: "Pengembangan Diri",
      description: "Strategi efektif mengatur waktu dan meningkatkan konsentrasi belajar.",
      fileName: "panduan-belajar-mandiri.pdf",
      fileContent: samplePdfContent,
    },
  ];

  for (const eb of sampleEbooks) {
    const filePathOnDisk = path.join(uploadDir, eb.fileName);
    await fs.writeFile(filePathOnDisk, Buffer.from(eb.fileContent));
    const fileSize = Buffer.byteLength(eb.fileContent);

    const existing = await prisma.eBook.findFirst({
      where: { title: eb.title },
    });

    if (!existing) {
      await prisma.eBook.create({
        data: {
          title: eb.title,
          author: eb.author,
          publisher: eb.publisher,
          year: eb.year,
          category: eb.category,
          description: eb.description,
          filePath: `/uploads/ebooks/${eb.fileName}`,
          fileName: eb.fileName,
          fileSize: fileSize,
          uploadedById: admin.id,
        },
      });
      console.log("✅ E-Book created:", eb.title);
    }
  }

  console.log("🎉 Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

