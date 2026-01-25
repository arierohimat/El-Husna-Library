'use client';

// Reports Page - Production-Ready with Comprehensive Error Handling
// Updated: 2025-01-XX - Added inline CSS fallback and meta tags
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileText, Download, Calendar, Book, Users, Bookmark } from 'lucide-react';

// TypeScript Interfaces
interface BorrowingReportSummary {
  totalBorrowings: number;
  activeBorrowings: number;
  returnedBorrowings: number;
  overdueBorrowings: number;
  totalFines: number;
}

interface BorrowingReportData {
  title: string;
  date: string;
  summary: BorrowingReportSummary;
  borrowings: Array<{
    Judul: string;
    Penulis: string;
    ISBN: string;
    Peminjam: string;
    'Tanggal Pinjam': string;
    'Jatuh Tempo': string;
    'Tanggal Kembali': string;
    Status: string;
    Denda: string;
  }>;
}

interface BookReportData {
  title: string;
  date: string;
  totalBooks: number;
  totalStock: number;
  books: Array<{
    ISBN: string;
    Judul: string;
    Penulis: string;
    Penerbit: string;
    'Tahun Terbit': number;
    Kategori: string;
    Stok: number;
  }>;
}

interface MemberReportData {
  title: string;
  date: string;
  totalMembers: number;
  members: Array<{
    Nama: string;
    Email: string;
    Username: string;
    'NIS/NIM': string;
    Telepon: string;
    'Total Peminjaman': number;
    'Terdaftar Pada': string;
  }>;
}

type ReportData = BookReportData | MemberReportData | BorrowingReportData | null;

// Default summary object to prevent undefined errors
const defaultSummary: BorrowingReportSummary = {
  totalBorrowings: 0,
  activeBorrowings: 0,
  returnedBorrowings: 0,
  overdueBorrowings: 0,
  totalFines: 0
};
export const dynamic = "force-dynamic";

export default function ReportsPage() {
  const [user, setUser] = useState<{ name: string; role: 'ADMIN' | 'MEMBER' } | null>(null);
  const [reportType, setReportType] = useState('books');
  const [format, setFormat] = useState('json');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportData>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user && format === 'json') {
      fetchReport();
    }
  }, [reportType, startDate, endDate, user]);

  const fetchUser = () => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        setUser(null);
      });
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        format: format,
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/reports?${params}`);
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        format: 'excel',
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/reports?${params}`);

      if (!response.ok) {
        throw new Error('Gagal mengunduh laporan');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-${reportType}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  const renderLoadingState = () => (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <div style={{ display: 'inline-block' }}>
        <div style={{
          border: '3px solid rgba(34, 197, 94, 0.2)',
          borderRadius: '50%',
          width: '2rem',
          height: '2rem',
          borderTop: '3px solid rgba(34, 197, 94, 0.8)',
          animation: 'spin 1s linear infinite',
          WebkitAnimation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '1rem', color: '#374151' }}>Memuat data...</p>
        <style>{`@keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }`}</style>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
      <div style={{ marginBottom: '1rem' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto', color: '#9CA3AF' }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
        </svg>
      </div>
      <p style={{ fontSize: '1.125rem', fontWeight: '600' }}>Pilih jenis laporan untuk melihat data</p>
      <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Pilih salah satu laporan dari menu di atas</p>
    </div>
  );

  const renderBooksReport = () => {
    const bookData = data as BookReportData;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
          <div style={{ backgroundColor: '#F0FDF4', padding: '1rem', borderRadius: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#16A34A', fontWeight: '500' }}>Total Judul</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#15803D' }}>{bookData?.totalBooks ?? 0}</p>
          </div>
          <div style={{ backgroundColor: '#DBEAFE', padding: '1rem', borderRadius: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#1E40AF', fontWeight: '500' }}>Total Stok</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E3A8A' }}>{bookData?.totalStock ?? 0}</p>
          </div>
        </div>

        {bookData?.books && bookData.books.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E7EB' }}>
              <thead>
                <tr style={{ backgroundColor: '#16A34A', color: 'white' }}>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>ISBN</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Judul</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Penulis</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Penerbit</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Tahun</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Kategori</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Stok</th>
                </tr>
              </thead>
              <tbody>
                {bookData.books.map((book, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#F9FAFB' : 'white' }}>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{book.ISBN}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB', fontWeight: '500' }}>{book.Judul}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{book.Penulis}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{book.Penerbit}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{book['Tahun Terbit']}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{book.Kategori}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{book.Stok}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  };

  const renderMembersReport = () => {
    const memberData = data as MemberReportData;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ backgroundColor: '#F0FDF4', padding: '1rem', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#16A34A', fontWeight: '500' }}>Total Anggota</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#15803D' }}>{memberData?.totalMembers ?? 0}</p>
        </div>

        {memberData?.members && memberData.members.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E7EB' }}>
              <thead>
                <tr style={{ backgroundColor: '#16A34A', color: 'white' }}>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Nama</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Username</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>NIS/NIM</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Telepon</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Total Peminjaman</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Terdaftar</th>
                </tr>
              </thead>
              <tbody>
                {memberData.members.map((member, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#F9FAFB' : 'white' }}>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB', fontWeight: '500' }}>{member.Nama}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{member.Email}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{member.Username}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{member['NIS/NIM']}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{member.Telepon}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{member['Total Peminjaman'] ?? 0}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{member['Terdaftar Pada'] ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  };

  const renderBorrowingsReport = () => {
    const borrowingData = data as BorrowingReportData;
    const summary = borrowingData?.summary ?? defaultSummary;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
          <div style={{ backgroundColor: '#F0FDF4', padding: '1rem', borderRadius: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#16A34A', fontWeight: '500' }}>Total Peminjaman</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#15803D' }}>{summary.totalBorrowings}</p>
          </div>
          <div style={{ backgroundColor: '#DBEAFE', padding: '1rem', borderRadius: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#1E40AF', fontWeight: '500' }}>Aktif</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E3A8A' }}>{summary.activeBorrowings}</p>
          </div>
          <div style={{ backgroundColor: '#FFEDD5', padding: '1rem', borderRadius: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#92400E', fontWeight: '500' }}>Dikembalikan</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#78350F' }}>{summary.returnedBorrowings}</p>
          </div>
          <div style={{ backgroundColor: '#FEE2E2', padding: '1rem', borderRadius: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#991B1B', fontWeight: '500' }}>Terlambat</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7F1D1D' }}>{summary.overdueBorrowings}</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#F3E8FF', padding: '1rem', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#7C3AED', fontWeight: '500' }}>Total Denda</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#5B21B6' }}>
            Rp {summary.totalFines.toLocaleString('id-ID')}
          </p>
        </div>

        {borrowingData?.borrowings && borrowingData.borrowings.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E7EB' }}>
              <thead>
                <tr style={{ backgroundColor: '#16A34A', color: 'white' }}>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Judul</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Penulis</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Peminjam</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Tanggal Pinjam</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Jatuh Tempo</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Tanggal Kembali</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Denda</th>
                </tr>
              </thead>
              <tbody>
                {borrowingData.borrowings.map((borrowing, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#F9FAFB' : 'white' }}>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB', fontWeight: '500' }}>{borrowing.Judul}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{borrowing.Penulis}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{borrowing.Peminjam ?? '-'}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{borrowing['Tanggal Pinjam']}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{borrowing['Jatuh Tempo']}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{borrowing['Tanggal Kembali']}</td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: borrowing.Status === 'Aktif'
                            ? '#DBEAFE'
                            : borrowing.Status === 'Dikembalikan'
                            ? '#D1FAE5'
                            : '#FEE2E2',
                          color: borrowing.Status === 'Aktif'
                            ? '#1E3A8A'
                            : borrowing.Status === 'Dikembalikan'
                            ? '#065F46'
                            : '#991B1B'
                        }}
                      >
                        {borrowing.Status ?? 'Unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{borrowing.Denda}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  };

  const renderReportContent = () => {
    if (loading && !data) {
      return renderLoadingState();
    }

    if (!data) {
      return renderEmptyState();
    }

    if (reportType === 'books') {
      return renderBooksReport();
    }

    if (reportType === 'members') {
      return renderMembersReport();
    }

    if (reportType === 'borrowings') {
      return renderBorrowingsReport();
    }

    return null;
  };

  return (
    <DashboardLayout userRole={user.role} userName={user.name}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.25rem' }}>Laporan</h1>
          <p style={{ color: '#4B5563', marginTop: '0.25rem' }}>Generate dan unduh laporan data perpustakaan</p>
        </div>

        {/* Report Options */}
        <div style={{ border: '1px solid #E5E7EB', borderRadius: '0.75rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <FileText style={{ width: '1.25rem', height: '1.25rem' }} />
              <span style={{ fontSize: '1rem', fontWeight: '600' }}>Pilih Jenis Laporan</span>
            </div>
          </div>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Jenis Laporan</label>
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '0.375rem', padding: '0.5rem' }}>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                  >
                    <option value="books">Laporan Buku</option>
                    {user.role === 'ADMIN' && <option value="members">Laporan Anggota</option>}
                    <option value="borrowings">Laporan Peminjaman</option>
                  </select>
                </div>
              </div>

              {reportType === 'borrowings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Filter Tanggal (Opsional)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: '#6B7280' }}>Dari</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '0.375rem' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: '#6B7280' }}>Sampai</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '0.375rem' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={fetchReport}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: loading ? '#9CA3AF' : '#16A34A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                }}
              >
                <FileText style={{ width: '1rem', height: '1rem' }} />
                Tampilkan Laporan
              </button>
              <button
                onClick={handleDownload}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                }}
              >
                <Download style={{ width: '1rem', height: '1rem' }} />
                Unduh Excel
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div style={{ border: '1px solid #E5E7EB', borderRadius: '0.75rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar style={{ width: '1.25rem', height: '1.25rem' }} />
              <span style={{ fontSize: '1rem', fontWeight: '600' }}>
                {reportType === 'books' && 'Laporan Buku'}
                {reportType === 'members' && 'Laporan Anggota'}
                {reportType === 'borrowings' && 'Laporan Peminjaman'}
              </span>
            </div>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {renderReportContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
