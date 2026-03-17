"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useRequireAuth from "@/hooks/useRequireAuth";
import api from "@/lib/axios";

const COMMON_ICONS = ["☕", "🍵", "🧃", "🥤", "🍰", "🍪", "🥪", "🍜", "🍳", "🥗", "🍨", "🧁"];

const defaultForm = { name: "", slug: "", icon: "☕", sortOrder: 0 };

export default function KategoriPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, hasAccess } = useRequireAuth(["owner", "manager"]);

  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ["categories-admin"],
    queryFn: () => api.get("/categories?all=true").then((r) => r.data),
    enabled: hasAccess,
  });
  const categories = data?.data || [];

  const resetForm = () => {
    setForm(defaultForm);
    setEditingCat(null);
    setShowForm(false);
  };

  const openEdit = (cat) => {
    setEditingCat(cat);
    setForm({ name: cat.name, slug: cat.slug, icon: cat.icon || "☕", sortOrder: cat.sortOrder });
    setShowForm(true);
  };

  const autoSlug = (name) => name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingCat) return api.put(`/categories/${editingCat.id}`, form);
      return api.post("/categories", form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-admin"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      resetForm();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/categories/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories-admin"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories-admin"] }),
    onError: (err) => alert(err.response?.data?.message || "Gagal menghapus kategori"),
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
        <button onClick={() => router.back()} className="text-stone-400 hover:text-stone-600 text-xl">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-stone-800">Kelola Kategori</h1>
          <p className="text-xs text-stone-500">{categories.length} kategori terdaftar</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-green-800">
          + Tambah
        </button>
      </nav>

      <div className="px-4 py-4 pb-10 space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl h-20 animate-pulse" />)
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-stone-500 text-sm">Belum ada kategori</p>
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className={`bg-white rounded-xl border p-4 ${!cat.isActive ? "opacity-60" : ""} border-stone-100`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-2xl flex-shrink-0">
                  {cat.icon || "📂"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-stone-800 text-sm">{cat.name}</h3>
                    {!cat.isActive && (
                      <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">Nonaktif</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">/{cat.slug} · {cat._count?.menus || 0} menu</p>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleMutation.mutate(cat.id)}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                      cat.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                    }`}>
                    {cat.isActive ? "✅ Aktif" : "❌ Nonaktif"}
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(cat)}
                      className="flex-1 text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded-lg hover:bg-stone-200">
                      ✏️ Edit
                    </button>
                    <button onClick={() => { if (confirm(`Hapus kategori "${cat.name}"?`)) deleteMutation.mutate(cat.id); }}
                      className="text-xs bg-red-50 text-red-500 px-3 py-1 rounded-lg hover:bg-red-100">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-stone-800 text-lg">{editingCat ? "Edit Kategori" : "Tambah Kategori"}</h3>
              <button onClick={resetForm} className="text-stone-400 hover:text-stone-600 text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_ICONS.map((ic) => (
                    <button key={ic} onClick={() => setForm({ ...form, icon: ic })}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition-colors ${
                        form.icon === ic ? "border-green-500 bg-green-50" : "border-stone-200 hover:border-stone-300"
                      }`}>
                      {ic}
                    </button>
                  ))}
                </div>
                <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="Atau ketik emoji lain..."
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nama Kategori *</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) })}
                  placeholder="Contoh: Kopi Panas"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Slug *</label>
                <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="kopi-panas"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                <p className="text-xs text-stone-400 mt-1">Auto-generated dari nama, bisa diubah manual</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Urutan Tampil</label>
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  min={0}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              <button onClick={() => saveMutation.mutate()}
                disabled={!form.name || !form.slug || saveMutation.isPending}
                className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-300 text-white py-3 rounded-xl font-semibold text-sm">
                {saveMutation.isPending ? "Menyimpan..." : editingCat ? "Simpan Perubahan" : "Tambah Kategori"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
