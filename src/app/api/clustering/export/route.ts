import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import ExcelJS from "exceljs";

// GET /api/clustering/export - Export clustering report to Excel or CSV
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "excel";
    const runId = searchParams.get("runId");

    let run: any = null;
    if (runId) {
      run = await db.clusteringRun.findUnique({
        where: { id: runId },
        include: {
          results: {
            include: {
              user: {
                select: { name: true, email: true, kelas: true },
              },
            },
            orderBy: { user: { name: "asc" } },
          },
        },
      });
    } else {
      run = await db.clusteringRun.findFirst({
        orderBy: { createdAt: "desc" },
        include: {
          results: {
            include: {
              user: {
                select: { name: true, email: true, kelas: true },
              },
            },
            orderBy: { user: { name: "asc" } },
          },
        },
      });
    }

    if (!run || run.results.length === 0) {
      return NextResponse.json(
        { error: "Belum ada data hasil clustering untuk diekspor." },
        { status: 404 }
      );
    }

    const dateStr = new Date(run.createdAt).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    if (format === "csv") {
      const headers = ["No", "Nama Siswa", "Kelas", "Email", "Peminjaman", "Pengembalian", "E-Book", "Cluster"];
      const rows = run.results.map((r, idx) => [
        idx + 1,
        `"${r.user?.name || "Siswa"}"`,
        `"${r.user?.kelas || "-"}"`,
        `"${r.user?.email || "-"}"`,
        r.totalBorrow,
        r.totalReturn,
        r.totalEbook,
        `"${r.clusterLabel}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Laporan-Clustering-Elhusna-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Export Excel (xlsx)
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "El-Husna Library System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Hasil Clustering");

    // Title Block
    sheet.mergeCells("A1:H1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "LAPORAN CLUSTERING SISWA PERPUSTAKAAN (K-MEANS)";
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 30;

    // Subtitle / Info
    sheet.mergeCells("A2:H2");
    const subTitleCell = sheet.getCell("A2");
    subTitleCell.value = `Sistem Informasi Perpustakaan Digital El-Husna | Tanggal Proses: ${dateStr} | Iterasi: ${run.iterations}`;
    subTitleCell.font = { name: "Arial", size: 10, italic: true };
    subTitleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(2).height = 20;

    sheet.addRow([]); // Blank line

    // Table Headers
    const headers = ["No", "Nama Siswa", "Kelas", "Email", "Total Peminjaman", "Total Pengembalian", "Akses E-Book", "Hasil Cluster"];
    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;

    headerRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "medium" },
        right: { style: "thin" },
      };
    });

    // Add Data Rows
    run.results.forEach((r, idx) => {
      const row = sheet.addRow([
        idx + 1,
        r.user?.name || "-",
        r.user?.kelas || "-",
        r.user?.email || "-",
        r.totalBorrow,
        r.totalReturn,
        r.totalEbook,
        r.clusterLabel,
      ]);

      row.height = 20;

      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      
      const clusterCell = row.getCell(8);
      clusterCell.alignment = { horizontal: "center", vertical: "middle" };
      clusterCell.font = { bold: true };

      if (r.clusterLabel === "Tinggi") {
        clusterCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } }; // Light Green
        clusterCell.font = { bold: true, color: { argb: "FF065F46" } };
      } else if (r.clusterLabel === "Sedang") {
        clusterCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }; // Light Amber
        clusterCell.font = { bold: true, color: { argb: "FF92400E" } };
      } else {
        clusterCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } }; // Light Gray
        clusterCell.font = { bold: true, color: { argb: "FF374151" } };
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
      });
    });

    // Auto fit column widths
    sheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 4, 35);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Laporan-Clustering-Elhusna-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Export clustering error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengekspor laporan clustering." },
      { status: 500 }
    );
  }
}
