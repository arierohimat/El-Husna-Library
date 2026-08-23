const fs = require("fs");
const data = JSON.parse(fs.readFileSync("actual_kmeans_output.json", "utf-8"));

console.log("=== SUMMARY ===");
console.log("Total Siswa:", data.totalSiswa);
console.log("Iterations:", data.clusteringResult.iterations);
console.log("Centroids:", JSON.stringify(data.clusteringResult.centroids, null, 2));

const counts = { Tinggi: 0, Sedang: 0, Rendah: 0 };
data.clusteringResult.studentResults.forEach(s => counts[s.clusterLabel]++);
console.log("Cluster counts:", counts);

const byClass = {};
data.clusteringResult.studentResults.forEach(s => {
  const k = s.kelas || "Tanpa Kelas";
  if (!byClass[k]) byClass[k] = { Tinggi: 0, Sedang: 0, Rendah: 0, Total: 0 };
  byClass[k][s.clusterLabel]++;
  byClass[k].Total++;
});
console.log("Distribution per class:", byClass);
