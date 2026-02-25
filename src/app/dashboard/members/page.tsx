"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Mail,
  Loader2,
  Users,
  AlertCircle,
  GraduationCap,
} from "lucide-react";

const KELAS_OPTIONS = [
  "VII-A", "VII-B",
  "VIII-A", "VIII-B",
  "IX-A", "IX-B",
];

interface Member {
  id: string;
  email: string;
  username: string;
  name: string;
  kelas?: string | null;
  role: string;
  createdAt: string;
  _count: { borrowings: number };
}

export const dynamic = "force-dynamic";

export default function MembersPage() {
  const [user, setUser] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const emptyForm = {
    email: "",
    username: "",
    password: "",
    name: "",
    kelas: "",
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") fetchMembers();
  }, [user?.role, search, page]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);

      const res = await fetch(`/api/members?${params}`);
      const data = await res.json();
      setMembers(data.members || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setError("");
  };

  const validateForm = (isEdit: boolean) => {
    if (!formData.name.trim()) return "Nama lengkap harus diisi";
    if (!formData.email.trim()) return "Email harus diisi";
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) return "Email tidak valid";
    if (!formData.username.trim()) return "Username harus diisi";
    if (!isEdit && formData.password.length < 8) {
      return "Password minimal 8 karakter";
    }
    return null;
  };

  const getErrorMessage = (data: any, defaultMsg: string): string => {
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (typeof data === "string") return data;
    return defaultMsg;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm(false);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      email: formData.email,
      username: formData.username,
      password: formData.password,
      name: formData.name,
      kelas: formData.kelas || null,
    };

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(getErrorMessage(data, "Gagal menambahkan anggota"));
        return;
      }

      setIsAddOpen(false);
      resetForm();
      fetchMembers();
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan jaringan. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setError("");

    const validationError = validateForm(true);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      email: formData.email,
      username: formData.username,
      ...(formData.password ? { password: formData.password } : {}),
      name: formData.name,
      kelas: formData.kelas || null,
    };

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/members/${selectedMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(getErrorMessage(data, "Gagal mengupdate anggota"));
        return;
      }

      setIsEditOpen(false);
      setSelectedMember(null);
      resetForm();
      fetchMembers();
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan jaringan. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/members/${selectedMember.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(getErrorMessage(data, "Gagal menghapus anggota"));
        return;
      }

      setIsDeleteOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (err) {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (member: Member) => {
    setSelectedMember(member);
    setFormData({
      email: member.email,
      username: member.username,
      password: "",
      name: member.name,
      kelas: member.kelas || "",
    });
    setError("");
    setIsEditOpen(true);
  };

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  if (!user || user.role !== "ADMIN") return null;

  return (
    <DashboardLayout userRole={user.role} userName={user.name}>
      <div className="space-y-6">
        {/* STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<Users className="text-emerald-600" />}
            label="Total Anggota"
            value={members.length}
          />
          <StatCard
            icon={<User className="text-blue-600" />}
            label="Halaman"
            value={page}
          />
          <StatCard
            icon={<Mail className="text-amber-600" />}
            label="Total Halaman"
            value={totalPages}
          />
        </div>

        {/* FILTER BAR */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Cari nama, email, username, kelas..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Anggota
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">
              Daftar Anggota
            </h3>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-emerald-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="h-14">
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase">
                      Nama
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase">
                      Kelas
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase">
                      Username
                    </th>
                    <th className="px-6 text-center text-xs font-semibold text-gray-500 uppercase">
                      Peminjaman
                    </th>
                    <th className="px-8 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider align-middle">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {members.map((m) => (
                    <tr key={m.id} className="h-16 hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-medium">{m.name}</td>
                      <td className="px-6 py-3">
                        {m.kelas ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <GraduationCap className="w-3 h-3" />
                            {m.kelas}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{m.email}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{m.username}</td>
                      <td className="px-6 py-3 text-center font-semibold">
                        {m._count.borrowings}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-1.5">
                          <ActionButton onClick={() => openEdit(m)}>
                            <Edit size={14} />
                          </ActionButton>
                          <ActionButton
                            danger
                            onClick={() => {
                              setSelectedMember(m);
                              setIsDeleteOpen(true);
                            }}
                          >
                            <Trash2 size={14} />
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT DIALOG */}
      <Dialog
        open={isAddOpen || isEditOpen}
        onOpenChange={(o) => {
          if (!o) {
            setIsAddOpen(false);
            setIsEditOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              {isEditOpen ? "Edit Anggota" : "Tambah Anggota"}
            </DialogTitle>
            <DialogDescription>Isi informasi lengkap anggota</DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form
            onSubmit={isEditOpen ? handleEdit : handleAdd}
            className="space-y-4"
          >
            {InputField("Nama Lengkap", formData.name, (v) =>
              setFormData({ ...formData, name: v }),
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Kelas
              </label>
              <select
                value={formData.kelas}
                onChange={(e) =>
                  setFormData({ ...formData, kelas: e.target.value })
                }
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">-- Pilih Kelas --</option>
                {KELAS_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            {InputField(
              "Email",
              formData.email,
              (v) => setFormData({ ...formData, email: v }),
              "email",
            )}
            {InputField("Username", formData.username, (v) =>
              setFormData({ ...formData, username: v }),
            )}
            {!isEditOpen &&
              InputField(
                "Password",
                formData.password,
                (v) => setFormData({ ...formData, password: v }),
                "password",
              )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Menyimpan..."
                : isEditOpen
                  ? "Update Anggota"
                  : "Simpan Anggota"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Anggota?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus "{selectedMember?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {isSubmitting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

/* ───────── Helper Components ───────── */

function StatCard({ icon, label, value }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="p-3 bg-gray-50 rounded-xl w-fit mb-3">{icon}</div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function ActionButton({ children, danger, ...props }: any) {
  return (
    <button
      {...props}
      className={`w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 transition ${danger
          ? "hover:bg-red-50 hover:text-red-600"
          : "hover:bg-emerald-50 hover:text-emerald-600"
        }`}
    >
      {children}
    </button>
  );
}

function InputField(
  label: string,
  value: string,
  onChange: any,
  type = "text",
) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      />
    </div>
  );
}
