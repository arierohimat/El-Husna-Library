import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
      role: "ADMIN",
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // ===== WALI KELAS USER =====
  const walikelasPassword = await bcrypt.hash("walikelas123", 10);
  const walikelas = await prisma.user.upsert({
    where: { email: "walikelas@elhusna.com" },
    update: {},
    create: {
      email: "walikelas@elhusna.com",
      username: "walikelas",
      password: walikelasPassword,
      name: "Bpk. Ahmad Fauzi",
      role: "WALIKELAS",
      kelas: "VII-A",
    },
  });
  console.log("✅ Wali Kelas user created:", walikelas.email);

  // ===== MEMBER USERS =====
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
        role: "MEMBER",
      },
    });
    console.log("✅ Member created:", m.name, `(${m.kelas})`);
  }

  // ===== BOOKS =====
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
