const fs = require("fs");
const data = JSON.parse(fs.readFileSync("actual_kmeans_output.json", "utf-8"));

console.log("| No | User ID | Nama Siswa | Kelas | Peminjaman ($X_1$) | Pengembalian ($X_2$) | E-Book ($X_3$) | Total Skor | Kluster | Label |");
console.log("| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |");

data.clusteringResult.studentResults.forEach((s, idx) => {
  const sum = s.totalBorrow + s.totalReturn + s.totalEbook;
  console.log(`| ${idx + 1} | \`${s.userId}\` | ${s.name} | ${s.kelas || "-"} | ${s.totalBorrow} | ${s.totalReturn} | ${s.totalEbook} | ${sum} | C${s.clusterIndex} | **${s.clusterLabel}** |`);
});
