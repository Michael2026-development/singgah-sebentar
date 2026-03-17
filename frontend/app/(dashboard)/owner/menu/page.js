"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useRequireAuth from "@/hooks/useRequireAuth";
import api from "@/lib/axios";
import { formatCurrency } from "@/lib/utils";

export default function KelolaMenuPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, hasAccess } = useRequireAuth(["owner", "manager"]);

  const [showForm, setShowForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    description: "",
    basePrice: "",
    isAvailable: true,
    isSeasonal: false,
    availableSizes: [],
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
    enabled: hasAccess,
  });
  const categories = catData?.data || [];

  const { data: menuData, isLoading } = useQuery({
    queryKey: ["menus-admin"],
    queryFn: () => api.get("/menus").then((r) => r.data),
    enabled: hasAccess,
  });
  const menus = menuData?.data || [];

  const filteredMenus = menus.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setForm({ name: "", categoryId: "", description: "", basePrice: "", isAvailable: true, isSeasonal: false, availableSizes: [] });
    setImageFile(null);
    setImagePreview(null);
    setEditingMenu(null);
    setShowForm(false);
  };

  const openEdit = (menu) => {
    setEditingMenu(menu);
    let desc = menu.description || "";
    let parsedSizes = [];
    const sizeMatch = desc.match(/\|SIZES:(.*?)\|/);
    if (sizeMatch) {
      parsedSizes = sizeMatch[1].split(",").filter(Boolean);
      desc = desc.replace(sizeMatch[0], "").trim();
    }
    
    setForm({
      name: menu.name,
      categoryId: menu.categoryId,
      description: desc,
      basePrice: menu.basePrice,
      isAvailable: menu.isAvailable,
      isSeasonal: menu.isSeasonal,
      availableSizes: parsedSizes,
    });
    setImagePreview(menu.imageUrl);
    setShowForm(true);
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      let finalDescription = form.description || "";
      if (form.availableSizes && form.availableSizes.length > 0) {
        finalDescription += ` |SIZES:${form.availableSizes.join(",")}|`;
      }
      
      fd.append("name", form.name);
      fd.append("categoryId", form.categoryId);
      fd.append("description", finalDescription);
      fd.append("basePrice", form.basePrice);
      fd.append("isAvailable", form.isAvailable);
      fd.append("isSeasonal", form.isSeasonal);
      if (imageFile) fd.append("image", imageFile);
      if (editingMenu) {
        return api.put(`/menus/${editingMenu.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        return api.post("/menus", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus-admin"] });
      resetForm();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/menus/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menus-admin"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/menus/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menus-admin"] }),
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
          <h1 className="font-bold text-stone-800">Kelola Menu</h1>
          <p className="text-xs text-stone-500">{menus.length} menu terdaftar</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-green-800">
          + Tambah
        </button>
      </nav>

      <div className="px-4 py-3">
        <input type="text" placeholder="🔍 Cari menu..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>

      <div className="px-4 pb-10">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl h-20 animate-pulse" />)}
          </div>
        ) : filteredMenus.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🍽️</div>
            <p className="text-stone-500 text-sm">Belum ada menu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMenus.map((menu) => (
              <div key={menu.id} className="bg-white rounded-xl border border-stone-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {menu.imageUrl ? (
                      <img src={menu.imageUrl} alt={menu.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{menu.category?.icon || "🍽️"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-stone-800 text-sm truncate">{menu.name}</h3>
                      {menu.isSeasonal && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex-shrink-0">Seasonal</span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{menu.category?.name}</p>
                    <p className="text-green-700 font-bold text-sm mt-1">{formatCurrency(menu.basePrice)}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleMutation.mutate(menu.id)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                        menu.isAvailable ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"
                      }`}>
                      {menu.isAvailable ? "✅ Tersedia" : "❌ Habis"}
                    </button>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(menu)}
                        className="flex-1 text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded-lg hover:bg-stone-200">
                        ✏️ Edit
                      </button>
                      <button onClick={() => { if (confirm(`Hapus menu "${menu.name}"?`)) deleteMutation.mutate(menu.id); }}
                        className="text-xs bg-red-50 text-red-500 px-3 py-1 rounded-lg hover:bg-red-100">
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-stone-800 text-lg">{editingMenu ? "Edit Menu" : "Tambah Menu Baru"}</h3>
              <button onClick={resetForm} className="text-stone-400 hover:text-stone-600 text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Foto Menu</label>
                <div onClick={() => document.getElementById("imageInput").click()}
                  className="border-2 border-dashed border-stone-300 rounded-xl p-4 text-center cursor-pointer hover:border-green-400 transition-colors">
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="w-full h-32 object-cover rounded-lg" />
                  ) : (
                    <div>
                      <p className="text-3xl mb-2">📷</p>
                      <p className="text-sm text-stone-500">Klik untuk upload foto</p>
                      <p className="text-xs text-stone-400 mt-1">JPG, PNG, WEBP max 2MB</p>
                    </div>
                  )}
                </div>
                <input id="imageInput" type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nama Menu *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Kopi Susu Gula Aren"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Kategori *</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Pilih kategori...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Deskripsi</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi singkat menu..." rows={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Harga *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-stone-500">Rp</span>
                  <input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                    placeholder="25000"
                    className="w-full border border-stone-300 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Pilihan Gelas / Ukuran (Opsional)</label>
                <div className="flex flex-wrap gap-3">
                  {["tall", "grande", "venti", "trenta"].map((size) => (
                    <label key={size} className="flex items-center gap-2 cursor-pointer bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 hover:border-green-400 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={form.availableSizes.includes(size)}
                        onChange={(e) => {
                          const newSizes = e.target.checked 
                            ? [...form.availableSizes, size] 
                            : form.availableSizes.filter(s => s !== size);
                          setForm({ ...form, availableSizes: newSizes });
                        }}
                        className="w-4 h-4 accent-green-600" 
                      />
                      <span className="text-sm text-stone-700 capitalize">{size}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isAvailable}
                    onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                    className="w-4 h-4 accent-green-600" />
                  <span className="text-sm text-stone-700">Tersedia</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isSeasonal}
                    onChange={(e) => setForm({ ...form, isSeasonal: e.target.checked })}
                    className="w-4 h-4 accent-purple-600" />
                  <span className="text-sm text-stone-700">Menu Seasonal</span>
                </label>
              </div>

              <button onClick={() => saveMutation.mutate()}
                disabled={!form.name || !form.categoryId || !form.basePrice || saveMutation.isPending}
                className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                {saveMutation.isPending ? "Menyimpan..." : editingMenu ? "Simpan Perubahan" : "Tambah Menu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}