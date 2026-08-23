"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Download, ExternalLink, FileText, Loader2, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function EBookReader() {
  const routeParams = useParams();
  const id = (routeParams?.id as string) || "";
  const [user, setUser] = useState<any>(null);
  const [ebook, setEbook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
        else window.location.href = "/";
      })
      .catch(() => {
        window.location.href = "/";
      });
  }, []);

  const loadEbook = () => {
    if (!id) return;
    setLoading(true);
    setError("");
    fetch(`/api/ebooks/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) setError(d.error || "E-Book tidak ditemukan");
        else setEbook(d.ebook);
      })
      .catch((err) => setError("Gagal memuat detail E-Book"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEbook();
  }, [id]);

  if (!user) return null;

  const fileUrl = `/api/ebooks/${id}/file`;

  return (
    <DashboardLayout userRole={user.role} userName={user.name}>
      <div className="space-y-6 py-4">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/dashboard/ebooks"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke koleksi E-Book
          </Link>

          {ebook && (
            <div className="flex items-center gap-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Buka Tab Baru
              </a>
              <a
                href={fileUrl}
                download={ebook.fileName || `${ebook.title}.pdf`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition-all"
              >
                <Download className="h-3.5 w-3.5" /> Unduh PDF
              </a>
            </div>
          )}
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700 font-semibold">{error}</p>
            <button
              onClick={loadEbook}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition-all"
            >
              <RefreshCw className="h-4 w-4" /> Coba Lagi
            </button>
          </div>
        ) : loading || !ebook ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium text-gray-500">Memuat berkas PDF...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Book Details Banner */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-14 bg-gradient-to-br from-emerald-100 to-teal-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  {ebook.coverImage ? (
                    <img src={ebook.coverImage} alt={ebook.title} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <FileText className="h-6 w-6 text-emerald-700" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {ebook.category}
                    </span>
                    {ebook.year && (
                      <span className="text-xs text-gray-400">• {ebook.year}</span>
                    )}
                  </div>
                  <h1 className="mt-1 text-xl font-bold text-gray-900 leading-tight">
                    {ebook.title}
                  </h1>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Penulis: <span className="font-semibold text-gray-800">{ebook.author}</span>
                    {ebook.publisher && ` • Penerbit: ${ebook.publisher}`}
                  </p>
                </div>
              </div>

              <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                <span className="text-xs font-medium text-gray-400 block">Ukuran Berkas</span>
                <span className="text-sm font-bold text-gray-800">
                  {(ebook.fileSize / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>

            {/* Embedded PDF Viewer */}
            <div className="relative w-full rounded-2xl border border-gray-200 bg-gray-900 shadow-md overflow-hidden min-h-[75vh]">
              <iframe
                title={`Baca ${ebook.title}`}
                src={fileUrl}
                className="h-[75vh] w-full rounded-2xl bg-white"
                onError={() => setIframeError(true)}
              />

              {iframeError && (
                <div className="absolute inset-0 bg-white p-8 flex flex-col items-center justify-center text-center space-y-4">
                  <FileText className="h-12 w-12 text-gray-400" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Perhitungan Tampilan PDF</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Browser Anda tidak dapat menampilkan pratinjau PDF secara langsung.
                    </p>
                  </div>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700"
                  >
                    Buka PDF di Tab Baru
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

