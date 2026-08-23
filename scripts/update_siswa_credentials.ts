import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";

const db = new PrismaClient();

async function main() {
  console.log("🔄 Updating Siswa usernames to Name and passwords to NISN...");

  const dataPath = path.join(process.cwd(), "db", "students_teachers_data.json");
  const jsonRaw = await fs.readFile(dataPath, "utf-8");
  const data = JSON.parse(jsonRaw);
  const jsonStudents: any[] = data.students || [];

  // Create map: normalized name -> student json data
  const jsonStudentMap = new Map<string, any>();
  for (const s of jsonStudents) {
    if (s.nama) {
      const normName = s.nama.trim().toUpperCase();
      if (!jsonStudentMap.has(normName)) {
        jsonStudentMap.set(normName, s);
      }
    }
  }

  // Get all SISWA users from DB
  const dbSiswas = await db.user.findMany({
    where: { role: "SISWA" },
  });

  console.log(`Found ${dbSiswas.length} SISWA users in DB.`);
  console.log(`Found ${jsonStudentMap.size} unique students in JSON.\n`);

  const usedUsernames = new Set<string>();
  let updated = 0;
  let skipped = 0;

  const results: Array<{
    name: string;
    kelas: string;
    newUsername: string;
    nisn: string;
    email: string;
  }> = [];

  for (const user of dbSiswas) {
    const normName = user.name.trim().toUpperCase();
    const jsonMatch = jsonStudentMap.get(normName);

    // Get NISN from JSON data
    let nisn = "";
    if (jsonMatch && jsonMatch.nisn) {
      nisn = jsonMatch.nisn.trim();
    } else {
      // Fallback: extract number from existing username (siswa_3129803963)
      const match = user.username.match(/\d+/);
      nisn = match ? match[0] : "";
    }

    if (!nisn) {
      console.log(`⚠️ Skipped ${user.name}: no NISN found`);
      skipped++;
      continue;
    }

    // Generate username from name: "ADE AHMAD PAUZI" -> "ade_ahmad_pauzi"
    let baseUsername = user.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    if (!baseUsername) {
      baseUsername = `siswa_${nisn}`;
    }

    let finalUsername = baseUsername;
    let counter = 1;
    while (usedUsernames.has(finalUsername)) {
      finalUsername = `${baseUsername}_${counter}`;
      counter++;
    }
    usedUsernames.add(finalUsername);

    // Hash password with NISN
    const hashedPassword = await bcrypt.hash(nisn, 10);

    // Update user in DB
    await db.user.update({
      where: { id: user.id },
      data: {
        username: finalUsername,
        password: hashedPassword,
      },
    });

    results.push({
      name: user.name,
      kelas: user.kelas || "-",
      newUsername: finalUsername,
      nisn,
      email: user.email,
    });

    updated++;
  }

  console.log(`\n✅ Updated: ${updated} | Skipped: ${skipped}`);
  console.log("\n========================================");
  console.log("DAFTAR AKUN SISWA YANG SUDAH DIPERBARUI");
  console.log("========================================\n");

  results.forEach((u, i) => {
    console.log(`${String(i + 1).padStart(3, " ")}. ${u.name}`);
    console.log(`     Kelas    : ${u.kelas}`);
    console.log(`     Username : ${u.newUsername}`);
    console.log(`     Password : ${u.nisn}`);
    console.log(`     Email    : ${u.email}`);
    console.log("");
  });
}

main()
  .then(() => db.$disconnect())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    db.$disconnect();
    process.exit(1);
  });
