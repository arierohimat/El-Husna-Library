"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { safeFetch } from "@/lib/safe-fetch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Network,
  Play,
  Printer,
  Download,
  Search,
  RefreshCw,
  Users,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { PaginationControls } from "@/components/ui/pagination-controls";

interface SiswaResult {
  id: string;
  userId: string;
  name: string;
  email: string;
  kelas: string;
  totalBorrow: number;
  totalReturn: number;
  totalEbook: number;
  clusterLabel: "Tinggi" | "Sedang" | "Rendah";
  clusterIndex: number;
}

interface CentroidSummary {
  label: "Tinggi" | "Sedang" | "Rendah";
  vector: [number, number, number];
  count: number;
}

interface ClusteringRunData {
  runId: string;
  totalProcessed: number;
  iterations: number;
  centroids: CentroidSummary[];
  createdAt: string;
  results: SiswaResult[];
}

interface HistoryItem {
  id: string;
  totalProcessed: number;
  iterations: number;
  createdAt: string;
}

export default function ClusteringPage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [availableCount, setAvailableCount] = useState(0);
  const [currentRun, setCurrentRun] = useState<ClusteringRunData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClusterFilter, setSelectedClusterFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [userSession, setUserSession] = useState<{ name: string; role: "ADMIN" | "SISWA" | "GURU" } | null>(null);



  // Fetch session user
  useEffect(() => {
    safeFetch("/api/auth/session")
      .then(({ data }) => {
        if (data.user) {
          setUserSession({ name: data.user.name, role: data.user.role });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch clustering history
  const fetchHistory = useCallback(async () => {
    try {
      const { ok, data } = await safeFetch("/api/clustering/history");
      if (ok) {
        setHistory(data.runs || []);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  }, []);

  // Fetch current clustering result
  const fetchClusteringData = useCallback(async (runId?: string) => {
    setLoading(true);
    try {
      const url = runId ? `/api/clustering?runId=${runId}` : "/api/clustering";
      const { ok, data } = await safeFetch(url);

      if (ok) {
        setAvailableCount(data.availableCount || 0);
        setCurrentRun(data.run || null);
        if (data.run?.runId) {
          setSelectedRunId(data.run.runId);
        }
      } else {
        toast.error(data.error || "Gagal memuat data clustering.");
      }
    } catch (error) {
      console.error("Error fetching clustering data:", error);
      toast.error("Terjadi kesalahan saat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClusteringData();
    fetchHistory();
  }, [fetchClusteringData, fetchHistory]);

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    fetchClusteringData(runId);
  };

  // Run K-Means Clustering
  const handleProcessClustering = async () => {
    if (availableCount === 0) {
      toast.error("Tidak dapat memproses clustering. Data aktivitas anggota belum tersedia.");
      return;
    }

    setProcessing(true);
    try {
      const { ok, data } = await safeFetch("/api/clustering", {
        method: "POST",
      });

      if (ok && data.success) {
        toast.success(data.message || "Proses clustering K-Means berhasil dijalankan!");
        setCurrentRun(data.summary);
        setSelectedRunId(data.summary.runId);
        fetchHistory();
      } else {
        toast.error(data.error || "Gagal memproses clustering K-Means.");
      }
    } catch (error) {
      console.error("Error processing clustering:", error);
      toast.error("Terjadi kesalahan jaringan saat memproses clustering.");
    } finally {
      setProcessing(false);
    }
  };

  // Export handler
  const handleExport = (format: "excel" | "csv") => {
    if (!currentRun) {
      toast.error("Belum ada data hasil clustering untuk diekspor.");
      return;
    }
    const runParam = selectedRunId ? `?runId=${selectedRunId}&format=${format}` : `?format=${format}`;
    window.open(`/api/clustering/export${runParam}`, "_blank");
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Filtering results
  const filteredResults = currentRun?.results.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kelas?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCluster =
      selectedClusterFilter === "ALL" || item.clusterLabel === selectedClusterFilter;

    return matchesSearch && matchesCluster;
  }) || [];

  // Group siswa by cluster
  const tinggiSiswa = currentRun?.results.filter((r) => r.clusterLabel === "Tinggi") || [];
  const sedangSiswa = currentRun?.results.filter((r) => r.clusterLabel === "Sedang") || [];
  const rendahSiswa = currentRun?.results.filter((r) => r.clusterLabel === "Rendah") || [];

  return (
    <DashboardLayout
      userRole={userSession?.role || "ADMIN"}
      userName={userSession?.name || "Admin Perpustakaan"}
    >
      {/* CSS untuk Tampilan Cetak (Print View) */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-clustering-area,
          #printable-clustering-area * {
            visibility: visible;
          }
          #printable-clustering-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4 no-print">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <Network className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Modul Clustering Siswa (K-Means)
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Pengelompokan siswa perpustakaan berdasarkan tingkat aktivitas peminjaman, pengembalian, dan pembacaan e-book.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* History Dropdown */}
            {history.length > 0 && (
              <Select value={selectedRunId} onValueChange={handleSelectRun}>
                <SelectTrigger className="w-[210px] bg-white rounded-xl text-xs">
                  <Clock className="w-3.5 h-3.5 mr-1 text-gray-500" />
                  <SelectValue placeholder="Riwayat Proses" />
                </SelectTrigger>
                <SelectContent>
                  {history.map((h, idx) => (
                    <SelectItem key={h.id} value={h.id} className="text-xs">
                      {new Date(h.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {idx === 0 ? " (Terbaru)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              onClick={handleProcessClustering}
              disabled={processing || availableCount === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Memproses K-Means...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Proses Clustering
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={!currentRun}
              className="rounded-xl border-gray-200"
            >
              <Printer className="w-4 h-4 mr-2 text-gray-600" />
              Cetak Laporan
            </Button>

            <Select onValueChange={(val) => handleExport(val as "excel" | "csv")} disabled={!currentRun}>
              <SelectTrigger className="w-[140px] bg-white rounded-xl border-gray-200 text-xs">
                <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                <SelectValue placeholder="Ekspor Data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel" className="text-xs">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Format Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="csv" className="text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Format CSV (.csv)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status Validation Alert */}
        {availableCount === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Data Aktivitas Anggota Belum Tersedia</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Pastikan terdapat data anggota dan catatan aktivitas perpustakaan di dalam database untuk menjalankan proses clustering K-Means.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between shadow-sm no-print">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Dataset Siap Diproses</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Terdapat <strong className="font-bold">{availableCount} anggota</strong> aktif dengan data peminjaman, pengembalian, dan e-book yang dapat dikelompokkan.
                </p>
              </div>
            </div>
            {currentRun && (
              <Badge variant="outline" className="bg-white border-emerald-300 text-emerald-800 text-xs">
                Terakhir Diproses: {new Date(currentRun.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </Badge>
            )}
          </div>
        )}

        {/* Printable Area Wrapper */}
        <div id="printable-clustering-area" className="space-y-6">
          {/* Printable Header */}
          <div className="hidden print:block text-center border-b pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">PERPUSTAKAAN DIGITAL EL-HUSNA LIBRARY</h1>
            <h2 className="text-lg font-semibold text-emerald-700 mt-1">LAPORAN HASIL CLUSTERING SISWA (ALGORITMA K-MEANS)</h2>
            <p className="text-xs text-gray-500 mt-1">
              Tanggal Diproses: {currentRun ? new Date(currentRun.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"} | Total Diproses: {currentRun?.totalProcessed || 0} Siswa | Iterasi Konvergen: {currentRun?.iterations || 0}
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-sm text-gray-500 font-medium">Memuat data clustering K-Means...</p>
            </div>
          ) : !currentRun ? (
            <Card className="border-dashed border-2 bg-gray-50/50 rounded-2xl no-print">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <Network className="w-8 h-8" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-lg font-bold text-gray-800">Belum Ada Hasil Clustering</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Silakan klik tombol <strong className="text-emerald-700">"Proses Clustering"</strong> untuk mengelompokkan data aktivitas siswa menjadi 3 cluster (Tinggi, Sedang, Rendah).
                  </p>
                </div>
                {availableCount > 0 && (
                  <Button
                    onClick={handleProcessClustering}
                    disabled={processing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md"
                  >
                    {processing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
                    Jalankan Perhitungan K-Means
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Process Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-gray-100 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
                  <CardHeader className="p-4 pb-2">
                    <CardDescription className="text-xs font-medium text-gray-500 flex items-center justify-between">
                      Total Siswa Diproses
                      <Users className="w-4 h-4 text-emerald-600" />
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      {currentRun.totalProcessed} <span className="text-xs font-normal text-gray-500">Siswa</span>
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card className="rounded-2xl border-gray-100 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
                  <CardHeader className="p-4 pb-2">
                    <CardDescription className="text-xs font-medium text-gray-500 flex items-center justify-between">
                      Cluster Tinggi
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold text-emerald-700">
                      {tinggiSiswa.length} <span className="text-xs font-normal text-gray-500">Siswa</span>
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card className="rounded-2xl border-gray-100 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
                  <CardHeader className="p-4 pb-2">
                    <CardDescription className="text-xs font-medium text-gray-500 flex items-center justify-between">
                      Cluster Sedang
                      <Layers className="w-4 h-4 text-amber-600" />
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold text-amber-700">
                      {sedangSiswa.length} <span className="text-xs font-normal text-gray-500">Siswa</span>
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card className="rounded-2xl border-gray-100 shadow-sm bg-gradient-to-br from-white to-gray-50">
                  <CardHeader className="p-4 pb-2">
                    <CardDescription className="text-xs font-medium text-gray-500 flex items-center justify-between">
                      Cluster Rendah
                      <BookOpen className="w-4 h-4 text-slate-500" />
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold text-slate-700">
                      {rendahSiswa.length} <span className="text-xs font-normal text-gray-500">Siswa</span>
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Section 7: Ringkasan Cluster Cards */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Ringkasan Cluster</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Cluster Tinggi Card */}
                  <Card className="rounded-2xl border-emerald-200 bg-emerald-50/20 shadow-sm">
                    <CardHeader className="pb-3 border-b border-emerald-100">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold text-emerald-800 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                          Cluster Tinggi
                        </CardTitle>
                        <Badge className="bg-emerald-600 text-white font-semibold">
                          {tinggiSiswa.length} Siswa
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-emerald-700 mt-1">
                        Aktivitas penggunaan perpustakaan paling aktif dan tinggi.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {tinggiSiswa.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Tidak ada siswa pada cluster ini.</p>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {tinggiSiswa.map((m) => (
                            <div
                              key={m.id}
                              className="p-2.5 bg-white rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-bold text-gray-800">{m.name}</p>
                                <p className="text-[11px] text-gray-500">{m.kelas || "Umum"}</p>
                              </div>
                              <div className="text-right text-[11px] text-emerald-800 font-medium">
                                <span>{m.totalBorrow} Pinjam</span> • <span>{m.totalEbook} E-book</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Cluster Sedang Card */}
                  <Card className="rounded-2xl border-amber-200 bg-amber-50/20 shadow-sm">
                    <CardHeader className="pb-3 border-b border-amber-100">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold text-amber-800 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                          Cluster Sedang
                        </CardTitle>
                        <Badge className="bg-amber-500 text-white font-semibold">
                          {sedangSiswa.length} Siswa
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-amber-700 mt-1">
                        Aktivitas penggunaan perpustakaan tingkat menengah/sedang.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {sedangSiswa.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Tidak ada siswa pada cluster ini.</p>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {sedangSiswa.map((m) => (
                            <div
                              key={m.id}
                              className="p-2.5 bg-white rounded-xl border border-amber-100 shadow-sm flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-bold text-gray-800">{m.name}</p>
                                <p className="text-[11px] text-gray-500">{m.kelas || "Umum"}</p>
                              </div>
                              <div className="text-right text-[11px] text-amber-800 font-medium">
                                <span>{m.totalBorrow} Pinjam</span> • <span>{m.totalEbook} E-book</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Cluster Rendah Card */}
                  <Card className="rounded-2xl border-gray-200 bg-gray-50/50 shadow-sm">
                    <CardHeader className="pb-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
                          Cluster Rendah
                        </CardTitle>
                        <Badge variant="secondary" className="bg-gray-600 text-white font-semibold">
                          {rendahSiswa.length} Siswa
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-gray-600 mt-1">
                        Aktivitas penggunaan perpustakaan tergolong rendah atau belum aktif.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {rendahSiswa.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Tidak ada siswa pada cluster ini.</p>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {rendahSiswa.map((m) => (
                            <div
                              key={m.id}
                              className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-bold text-gray-800">{m.name}</p>
                                <p className="text-[11px] text-gray-500">{m.kelas || "Umum"}</p>
                              </div>
                              <div className="text-right text-[11px] text-gray-600 font-medium">
                                <span>{m.totalBorrow} Pinjam</span> • <span>{m.totalEbook} E-book</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Section 7: Tabel Hasil Detail */}
              <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
                <CardHeader className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 tracking-tight">Rincian Hasil Cluster Per Siswa</CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      Daftar rincian nilai variabel aktivitas dan hasil pengelompokan K-Means per siswa.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Cari siswa atau kelas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-gray-50/50 rounded-xl text-xs"
                      />
                    </div>

                    <Select value={selectedClusterFilter} onValueChange={setSelectedClusterFilter}>
                      <SelectTrigger className="w-[150px] bg-gray-50/50 rounded-xl text-xs">
                        <SelectValue placeholder="Filter Cluster" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-xs">Semua Cluster</SelectItem>
                        <SelectItem value="Tinggi" className="text-xs">Cluster Tinggi</SelectItem>
                        <SelectItem value="Sedang" className="text-xs">Cluster Sedang</SelectItem>
                        <SelectItem value="Rendah" className="text-xs">Cluster Rendah</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/80 text-xs font-semibold text-gray-600 border-b border-gray-100">
                      <tr>
                        <th className="py-3.5 px-4 w-12 text-center">No</th>
                        <th className="py-3.5 px-4">Nama Siswa</th>
                        <th className="py-3.5 px-4">Kelas</th>
                        <th className="py-3.5 px-4 text-center">Total Peminjaman</th>
                        <th className="py-3.5 px-4 text-center">Total Pengembalian</th>
                        <th className="py-3.5 px-4 text-center">Akses E-Book</th>
                        <th className="py-3.5 px-4 text-center">Hasil Cluster</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredResults.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-gray-500">
                            Tidak ditemukan data siswa yang sesuai dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredResults.slice((page - 1) * 10, page * 10).map((item, idx) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3.5 px-4 text-center text-xs text-gray-500 font-medium">
                              {(page - 1) * 10 + idx + 1}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-gray-800">
                              <div>
                                <p>{item.name}</p>
                                <p className="text-[11px] font-normal text-gray-400">{item.email}</p>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-gray-600">
                              {item.kelas || "-"}
                            </td>
                            <td className="py-3.5 px-4 text-center font-semibold text-emerald-700">
                              {item.totalBorrow}
                            </td>
                            <td className="py-3.5 px-4 text-center font-semibold text-blue-700">
                              {item.totalReturn}
                            </td>
                            <td className="py-3.5 px-4 text-center font-semibold text-purple-700">
                              {item.totalEbook}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {item.clusterLabel === "Tinggi" ? (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold px-3 py-1 border border-emerald-300">
                                  Tinggi
                                </Badge>
                              ) : item.clusterLabel === "Sedang" ? (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-bold px-3 py-1 border border-amber-300">
                                  Sedang
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 font-bold px-3 py-1 border border-gray-300">
                                  Rendah
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>

                <PaginationControls
                  currentPage={page}
                  totalPages={Math.ceil(filteredResults.length / 10) || 1}
                  totalItems={filteredResults.length}
                  itemsPerPage={10}
                  onPageChange={setPage}
                />
              </Card>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
