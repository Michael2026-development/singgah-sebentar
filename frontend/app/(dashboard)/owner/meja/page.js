"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useRequireAuth from "@/hooks/useRequireAuth";
import api from "@/lib/axios";
import { QRCodeCanvas } from "qrcode.react";
import { connectSocket, disconnectSocket } from "@/lib/socket";

const ZONE_LABELS = {
  indoor: { label: "Indoor", icon: "🏠", color: "bg-blue-100 text-blue-700" },
  outdoor: { label: "Outdoor", icon: "🌿", color: "bg-green-100 text-green-700" },
  vip: { label: "VIP", icon: "⭐", color: "bg-yellow-100 text-yellow-700" },
};

const STATUS_LABELS = {
  available: { label: "Tersedia", color: "bg-green-100 text-green-700" },
  occupied: { label: "Terisi", color: "bg-red-100 text-red-700" },
  reserved: { label: "Reserved", color: "bg-purple-100 text-purple-700" },
  maintenance: { label: "Maintenance", color: "bg-stone-100 text-stone-500" },
};

export default function KelolaMejaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, hasAccess } = useRequireAuth(["owner", "manager"]);
  const [activeZone, setActiveZone] = useState("semua");
  const [showForm, setShowForm] = useState(false);
  const [showQR, setShowQR] = useState(null);
  const [form, setForm] = useState({ tableNumber: "", capacity: 4, zone: "indoor", floor: 1 });

  // Real-time table status updates via Socket.io
  useEffect(() => {
    if (!hasAccess) return;
    const socket = connectSocket(user.role);
    socket.on("table_status_update", () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    });
    return () => {
      socket.off("table_status_update");
      disconnectSocket();
    };
  }, [hasAccess]);

  const { data, isLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: () => api.get("/tables").then((r) => r.data),
    enabled: hasAccess,
  });
  const tables = data?.data || [];
  const filteredTables = activeZone === "semua" ? tables : tables.filter((t) => t.zone === activeZone);

  const createMutation = useMutation({
    mutationFn: () => api.post("/tables", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setShowForm(false);
      setForm({ tableNumber: "", capacity: 4, zone: "indoor", floor: 1 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tables/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tables"] }),
  });

  const downloadQR = (table) => {
    const canvas = document.getElementById(`qr-${table.id}`);
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR-Meja-${table.tableNumber}.png`;
    a.click();
  };

  const printQR = (table) => {
    const canvas = document.getElementById(`qr-${table.id}`);
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    win.document.write(`
      <html><body style="text-align:center;font-family:sans-serif;padding:40px">
        <h2>☕ Singgah Sebentar</h2>
        <h3>Meja ${table.tableNumber} · ${table.zone?.toUpperCase()}</h3>
        <img src="${url}" style="width:250px;height:250px"/>
        <p style="margin-top:16px;color:#666">Scan untuk memesan</p>
        <p style="color:#999;font-size:12px">${table.qrUrl}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <div className="text-3xl mb-2">☕</div>
        <p className="text-stone-400 text-sm">Memuat...</p>
      </div>
    </div>
  );

  const zones = ["semua", "indoor", "outdoor", "vip"];

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-20 flex items-center gap-3">
        <button onClick={() => router.push("/owner")} className="text-stone-400 hover:text-stone-600 text-xl">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-stone-800">Kelola Meja</h1>
          <p className="text-xs text-stone-500">{tables.length} meja terdaftar</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-green-800">
          + Tambah
        </button>
      </nav>

      <div className="bg-white border-b border-stone-200 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {zones.map((zone) => {
            const count = zone === "semua" ? tables.length : tables.filter((t) => t.zone === zone).length;
            return (
              <button key={zone} onClick={() => setActiveZone(zone)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeZone === zone ? "bg-green-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}>
                {zone === "semua" ? "🏪" : ZONE_LABELS[zone]?.icon} {zone.charAt(0).toUpperCase() + zone.slice(1)}
                <span className="ml-1 opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        {[
          { label: "Tersedia", count: tables.filter((t) => t.status === "available").length, color: "text-green-600" },
          { label: "Terisi", count: tables.filter((t) => t.status === "occupied").length, color: "text-red-500" },
          { label: "Reserved", count: tables.filter((t) => t.status === "reserved").length, color: "text-purple-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-3 text-center border border-stone-100">
            <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 pb-10">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl h-36 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredTables.map((table) => (
              <div key={table.id} className="bg-white rounded-xl border border-stone-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-stone-800 text-lg">#{table.tableNumber}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ZONE_LABELS[table.zone]?.color}`}>
                      {ZONE_LABELS[table.zone]?.icon} {ZONE_LABELS[table.zone]?.label}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_LABELS[table.status]?.color}`}>
                    {STATUS_LABELS[table.status]?.label}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mb-3">👥 {table.capacity} kursi · Lantai {table.floor}</p>
                <div className="hidden">
                  <QRCodeCanvas id={`qr-${table.id}`}
                    value={table.qrUrl || `http://localhost:3000/menu/${table.tableNumber}`}
                    size={256} bgColor="#ffffff" fgColor="#1a1a1a" level="H" includeMargin={true} />
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setShowQR(table)}
                    className="flex-1 bg-green-50 text-green-700 text-xs py-2 rounded-lg font-medium hover:bg-green-100">
                    📱 QR
                  </button>
                  <button onClick={() => { if (confirm(`Hapus Meja ${table.tableNumber}?`)) deleteMutation.mutate(table.id); }}
                    className="bg-red-50 text-red-500 text-xs px-3 py-2 rounded-lg hover:bg-red-100">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-stone-800">QR Code Meja {showQR.tableNumber}</h3>
              <button onClick={() => setShowQR(null)} className="text-stone-400 hover:text-stone-600 text-xl">✕</button>
            </div>
            <div className="bg-stone-50 rounded-xl p-6 mb-4 flex flex-col items-center">
              <QRCodeCanvas value={showQR.qrUrl || `http://localhost:3000/menu/${showQR.tableNumber}`}
                size={200} bgColor="#f9f9f9" fgColor="#1a1a1a" level="H" includeMargin={true} />
              <p className="text-xs text-stone-500 mt-3">Scan untuk memesan</p>
              <p className="text-xs text-stone-400 mt-1 break-all">
                {showQR.qrUrl || `http://localhost:3000/menu/${showQR.tableNumber}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => downloadQR(showQR)}
                className="flex-1 bg-green-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-800">
                ⬇️ Download
              </button>
              <button onClick={() => printQR(showQR)}
                className="flex-1 bg-stone-100 text-stone-700 py-3 rounded-xl font-semibold text-sm hover:bg-stone-200">
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-stone-800 text-lg">Tambah Meja Baru</h3>
              <button onClick={() => setShowForm(false)} className="text-stone-400 hover:text-stone-600 text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nomor Meja *</label>
                <input type="number" value={form.tableNumber}
                  onChange={(e) => setForm({ ...form, tableNumber: e.target.value })}
                  placeholder="Contoh: 41"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Zone *</label>
                <div className="grid grid-cols-3 gap-2">
                  {["indoor", "outdoor", "vip"].map((z) => (
                    <button key={z} onClick={() => setForm({ ...form, zone: z })}
                      className={`py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                        form.zone === z ? "border-green-600 bg-green-50 text-green-700" : "border-stone-200 text-stone-600"
                      }`}>
                      {ZONE_LABELS[z].icon} {ZONE_LABELS[z].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Kapasitas</label>
                  <input type="number" value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })}
                    min={1} max={20}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Lantai</label>
                  <input type="number" value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: parseInt(e.target.value) })}
                    min={1} max={10}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <button onClick={() => createMutation.mutate()}
                disabled={!form.tableNumber || createMutation.isPending}
                className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-300 text-white py-3 rounded-xl font-semibold text-sm">
                {createMutation.isPending ? "Menyimpan..." : "Tambah Meja"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}