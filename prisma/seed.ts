import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

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
      phone: "081234567890",
      address: "Jakarta, Indonesia",
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // ===== MEMBER USER =====
  const memberPassword = await bcrypt.hash("member123", 10);
  const member = await prisma.user.upsert({
    where: { email: "member@elhusna.com" },
    update: {},
    create: {
      email: "member@elhusna.com",
      username: "member",
      password: memberPassword,
      name: "Ahmad Santoso",
      role: "MEMBER",
      nisNim: "12345678",
      phone: "081987654321",
      address: "Surabaya, Indonesia",
    },
  });
  console.log("✅ Member user created:", member.email);

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
    },
    {
      isbn: "978-602-03-3342-1",
      title: "Bumi Manusia",
      author: "Pramoedya Ananta Toer",
      publisher: "Hasta Mitra",
      year: 1980,
      category: "Sastra",
      stock: 3,
    },
    {
      isbn: "978-602-04-7341-8",
      title: "Gadis Kretek",
      author: "Ratih Kumala",
      publisher: "Gramedia Pustaka Utama",
      year: 2018,
      category: "Fiksi",
      stock: 4,
    },
    {
      isbn: "978-602-03-2993-6",
      title: "Atomic Habits",
      author: "James Clear",
      publisher: "Gramedia Pustaka Utama",
      year: 2018,
      category: "Pengembangan Diri",
      stock: 6,
    },
    {
      isbn: "978-602-04-6379-2",
      title: "Filosofi Teras",
      author: "Henry Manampiring",
      publisher: "Gramedia Pustaka Utama",
      year: 2018,
      category: "Pengembangan Diri",
      stock: 7,
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
