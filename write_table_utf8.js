const fs = require("fs");
const data = JSON.parse(fs.readFileSync("actual_kmeans_output.json", "utf-8"));

let lines = [];
lines.push("| No | User ID | Nama Siswa | Kelas | Peminjaman ($X_1$) | Pengembalian ($X_2$) | E-Book ($X_3$) | Total Skor | Kluster | Label |");
lines.push("| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |");

data.clusteringResult.studentResults.forEach((s, idx) => {
  const sum = s.totalBorrow + s.totalReturn + s.totalEbook;
  lines.push(`| ${idx + 1} | \`${s.userId.substring(0, 10)}...\` | ${s.name} | ${s.kelas || "-"} | ${s.totalBorrow} | ${s.totalReturn} | ${s.totalEbook} | ${sum} | C${s.clusterIndex} | **${s.clusterLabel}** |`);
});

fs.writeFileSync("table_102_siswa_utf8.md", lines.join("\n"), "utf-8");
console.log("Written utf-8 table");
