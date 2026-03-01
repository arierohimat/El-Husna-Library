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
  Phone,
  MapPin,
  Loader2,
  Users,
  AlertCircle,
  Shield,
  UserCircle,
  GraduationCap,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  kelas?: string | null;
  phone?: string | null;
  address?: string | null;
  role: "ADMIN" | "MEMBER" | "WALIKELAS";
  createdAt: string;
}

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
  { value: "WALIKELAS", label: "Wali Kelas" },
];

const KELAS_OPTIONS = [
  "VII-A", "VII-B", "VII-C",
  "VIII-A", "VIII-B", "VIII-C",
  "IX-A", "IX-B", "IX-C",
];

export default function UsersPage() {
  type Role = "ADMIN" | "MEMBER" | "WALIKELAS";

  const [user, setUser] = useState<{
    name: string;
    role: Role;
  } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const emptyForm = {
    email: "",
    username: "",
    password: "",
    name: "",
    kelas: "",
    phone: "",
    address: "",
    role: "MEMBER" as "ADMIN" | "MEMBER" | "WALIKELAS",
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user) fetchUsers();
  }, [user, search, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (roleFilter !== "all") params.append("role", roleFilter);

      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setError("");
  };

  // Validasi client-side
  const validateForm = (isEdit: boolean) => {
    if (!formData.name.trim()) return "Nama lengkap harus diisi";
    if (!formData.email.trim()) return "Email harus diisi";
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) return "Email tidak valid";
    if (!formData.username.trim()) return "Username harus diisi";
    if (!isEdit && formData.password.length < 6) {
      return "Password minimal 6 karakter";
    }
    if (formData.role === "WALIKELAS" && !formData.kelas) {
      return "Kelas harus dipilih untuk Wali Kelas";
    }
    return null;
  };

  // Helper untuk mengambil pesan error dari response
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
      ...formData,
      kelas: formData.role === "WALIKELAS" ? formData.kelas || null : null,
      phone: formData.phone || null,
      address: formData.address || null,
    };

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(getErrorMessage(data, "Gagal menambahkan user"));
        return;
      }

      setIsAddOpen(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      setError("Terjadi kesalahan jaringan. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError("");

    const validationError = validateForm(true);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      ...formData,
      kelas: formData.role === "WALIKELAS" ? formData.kelas || null : null,
      phone: formData.phone || null,
      address: formData.address || null,
      ...(formData.password ? { password: formData.password } : {}),
    };

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(getErrorMessage(data, "Gagal mengupdate user"));
        return;
      }

      setIsEditOpen(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
    } catch (err) {
      setError("Terjadi kesalahan jaringan. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(getErrorMessage(data, "Gagal menghapus user"));
        return;
      }

      setIsDeleteOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      username: user.username,
      password: "",
      name: user.name,
      kelas: user.kelas || "",
      phone: user.phone || "",
      address: user.address || "",
      role: user.role,
    });
    setError("");
    setIsEditOpen(true);
  };

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role === "ADMIN").length;
  const totalMembers = users.filter((u) => u.role === "MEMBER").length;
  const totalWalikelas = users.filter((u) => u.role === "WALIKELAS").length;

  if (!user) return null;

  return (
    <DashboardLayout userRole={user.role} userName={user.name}>
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="text-emerald-600" />}
            label="Total User"
            value={totalUsers}
          />
          <StatCard
            icon={<Shield className="text-blue-600" />}
            label="Admin"
            value={totalAdmins}
          />
          <StatCard
            icon={<UserCircle className="text-amber-600" />}
            label="Member"
            value={totalMembers}
          />
          <StatCard
            icon={<GraduationCap className="text-indigo-600" />}
            label="Wali Kelas"
            value={totalWalikelas}
          />
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all placeholder:text-gray-400"
                placeholder="Cari nama, email, atau username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none cursor-pointer min-w-[140px]"
              >
                <option value="all">Semua Role</option>
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
                <option value="WALIKELAS">Wali Kelas</option>
              </select>
            </div>

            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm shadow-emerald-500/20 hover:shadow-md whitespace-nowrap"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Tambah User
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Daftar User
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {loading ? "Memuat..." : `${users.length} user ditemukan`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 size={28} className="animate-spin text-emerald-500" />
              <p className="text-sm">Memuat data...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-4 bg-gray-100 rounded-2xl">
                <Users size={32} className="text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">
                  Tidak ada user ditemukan
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Coba ubah kata kunci atau filter
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="h-14">
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Kelas
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Telepon
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Alamat
                    </th>
                    <th className="px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Terdaftar
                    </th>
                    <th className="px-6 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="h-16 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {user.email}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {user.username}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${user.role === "ADMIN"
                            ? "bg-purple-100 text-purple-700"
                            : user.role === "WALIKELAS"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-emerald-100 text-emerald-700"
                            }`}
                        >
                          {user.role === "ADMIN" ? "Admin" : user.role === "WALIKELAS" ? "Wali Kelas" : "Member"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {user.kelas || "-"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {user.phone || "-"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {user.address || "-"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {new Date(user.createdAt).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <ActionButton onClick={() => openEdit(user)}>
                            <Edit size={14} />
                          </ActionButton>
                          <ActionButton
                            danger
                            onClick={() => {
                              setSelectedUser(user);
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

      {/* Add/Edit Dialog */}
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
              {isEditOpen ? "Edit User" : "Tambah User Baru"}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Isi informasi lengkap user
            </DialogDescription>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  required
                  type="email"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Username
                </label>
                <input
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Role
                </label>
                <select
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all cursor-pointer"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as "ADMIN" | "MEMBER" | "WALIKELAS",
                    })
                  }
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.role === "WALIKELAS" && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Kelas yang Dimonitoring
                </label>
                <select
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all cursor-pointer"
                  value={formData.kelas}
                  onChange={(e) =>
                    setFormData({ ...formData, kelas: e.target.value })
                  }
                >
                  <option value="">Pilih Kelas</option>
                  {KELAS_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Wali Kelas hanya bisa memonitoring siswa di kelas ini</p>
              </div>
            )}

            {!isEditOpen && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Password
                </label>
                <input
                  required
                  type="password"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <p className="text-xs text-gray-400 mt-1">Minimal 6 karakter</p>
              </div>
            )}

            {isEditOpen && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Password (kosongkan jika tidak diubah)
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Nomor Telepon
                </label>
                <input
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Alamat
                </label>
                <input
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Menyimpan...
                </>
              ) : isEditOpen ? (
                "Update User"
              ) : (
                "Simpan User"
              )}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-gray-900">
              Hapus User?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600">
              Anda akan menghapus user{" "}
              <span className="font-semibold text-gray-800">
                "{selectedUser?.name}"
              </span>{" "}
              secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isSubmitting}
              className="rounded-xl border-gray-200 text-sm font-medium"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-sm shadow-red-500/20"
            >
              {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

// Helper components
function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="p-3 bg-gray-50 rounded-xl">{icon}</div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function ActionButton({ children, danger, ...props }: any) {
  return (
    <button
      {...props}
      className={`w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all duration-150 ${danger
        ? "hover:text-red-600 hover:border-red-200 hover:bg-red-50"
        : "hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50"
        }`}
    >
      {children}
    </button>
  );
}
