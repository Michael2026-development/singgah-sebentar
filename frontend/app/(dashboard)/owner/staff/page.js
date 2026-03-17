"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useRequireAuth from "@/hooks/useRequireAuth";
import api from "@/lib/axios";

const ROLE_LABELS = {
  owner: { label: "Owner", icon: "👑", color: "bg-yellow-100 text-yellow-700" },
  manager: { label: "Manager", icon: "📋", color: "bg-blue-100 text-blue-700" },
  kasir: { label: "Kasir", icon: "💰", color: "bg-green-100 text-green-700" },
  dapur: { label: "Dapur", icon: "🍳", color: "bg-orange-100 text-orange-700" },
};

const defaultForm = { name: "", email: "", password: "", role: "kasir", isActive: true };

export default function KelolaStaffPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, hasAccess } = useRequireAuth(["owner"]);

  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [showPassword, setShowPassword] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get("/staff").then((r) => r.data),
    enabled: hasAccess,
  });
  const staffList = data?.data || [];

  const resetForm = () => {
    setForm(defaultForm);
    setEditingStaff(null);
    setShowForm(false);
    setShowPassword(false);
  };

  const openEdit = (s) => {
    setEditingStaff(s);
    setForm({ name: s.name, email: s.email, password: "", role: s.role, isActive: s.isActive });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingStaff) {
        const payload = { name: form.name, email: form.email, role: form.role, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        return api.put(`/staff/${editingStaff.id}`, payload);
      }
      return api.post("/staff", form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      resetForm();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/staff/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/staff/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <div className="text-3xl mb-2">☕</div>
        <p className="text-stone-400 text-sm">Memuat...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-20 flex items-center gap-3">
        <button onClick={() => router.push("/owner")} className="text-stone-400 hover:text-stone-600 text-xl">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-stone-800">Kelola Staff</h1>
          <p className="text-xs text-stone-500">{staffList.length} akun terdaftar</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-green-800">
          + Tambah
        </button>
      </nav>

      <div className="px-4 py-4 grid grid-cols-4 gap-2">
        {Object.entries(ROLE_LABELS).map(([role, info]) => (
          <div key={role} className="bg-white rounded-xl p-3 text-center border border-stone-100">
            <p className="text-lg">{info.icon}</p>
            <p className="text-lg font-bold text-stone-800">
              {staffList.filter((s) => s.role === role).length}
            </p>
            <p className="text-xs text-stone-500">{info.label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 pb-10 space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />)
        ) : (
          staffList.map((s) => (
            <div key={s.id} className={`bg-white rounded-xl border p-4 ${!s.isActive ? "opacity-60 border-stone-100" : "border-stone-100"}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-xl flex-shrink-0">
                  {ROLE_LABELS[s.role]?.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-stone-800 text-sm">{s.name}</h3>
                    {s.id === user.id && (
                      <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Kamu</span>
                    )}
                    {!s.isActive && (
                      <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">Nonaktif</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5 truncate">{s.email}</p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${ROLE_LABELS[s.role]?.color}`}>
                    {ROLE_LABELS[s.role]?.label}
                  </span>
                </div>
                {s.id !== user.id && (
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleMutation.mutate(s.id)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                        s.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                      }`}>
                      {s.isActive ? "✅ Aktif" : "❌ Nonaktif"}
                    </button>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)}
                        className="flex-1 text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded-lg hover:bg-stone-200">
                        ✏️ Edit
                      </button>
                      <button onClick={() => { if (confirm(`Hapus akun "${s.name}"?`)) deleteMutation.mutate(s.id); }}
                        className="text-xs bg-red-50 text-red-500 px-3 py-1 rounded-lg hover:bg-red-100">
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-stone-800 text-lg">
                {editingStaff ? "Edit Staff" : "Tambah Staff Baru"}
              </h3>
              <button onClick={resetForm} className="text-stone-400 hover:text-stone-600 text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nama Lengkap *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="budi@singgahsebentar.id"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Password {editingStaff && <span className="text-stone-400 font-normal">(kosongkan jika tidak diubah)</span>}
                </label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingStaff ? "••••••••" : "Min. 8 karakter"}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 text-sm">
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ROLE_LABELS).map(([role, info]) => (
                    <button key={role} onClick={() => setForm({ ...form, role })}
                      className={`py-3 rounded-xl text-sm font-medium border-2 transition-colors flex items-center gap-2 px-3 ${
                        form.role === role ? "border-green-600 bg-green-50 text-green-700" : "border-stone-200 text-stone-600 hover:border-stone-300"
                      }`}>
                      <span>{info.icon}</span>
                      <span>{info.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {editingStaff && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 accent-green-600" />
                  <span className="text-sm text-stone-700">Akun Aktif</span>
                </label>
              )}
              <button onClick={() => saveMutation.mutate()}
                disabled={!form.name || !form.email || (!editingStaff && !form.password) || saveMutation.isPending}
                className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-300 text-white py-3 rounded-xl font-semibold text-sm">
                {saveMutation.isPending ? "Menyimpan..." : editingStaff ? "Simpan Perubahan" : "Tambah Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}