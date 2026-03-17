"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import useRequireAuth from "@/hooks/useRequireAuth";
import api from "@/lib/axios";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line,
  CartesianGrid, Legend,
} from "recharts";

const today = new Date().toISOString().split("T")[0];

export default function LaporanPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, hasAccess } = useRequireAuth(["owner", "manager"]);
  const [mode, setMode] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ["report-daily", selectedDate],
    queryFn: () => api.get(`/reports/daily?date=${selectedDate}`).then((r) => r.data),
    enabled: mode === "daily" && hasAccess,
  });

  const { data: rangeData, isLoading: rangeLoading } = useQuery({
    queryKey: ["report-range", startDate, endDate],
    queryFn: () =>
      api.get(`/reports/range?startDate=${startDate}&endDate=${endDate}`).then((r) => r.data),
    enabled: mode === "range" && hasAccess,
  });

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <div className="text-3xl mb-2">☕</div>
        <p className="text-stone-400 text-sm">Memuat...</p>
      </div>
    </div>
  );

  const report = mode === "daily" ? dailyData?.data : rangeData?.data;
  const dataLoading = mode === "daily" ? dailyLoading : rangeLoading;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-20 flex items-center gap-3">
        <button onClick={() => router.push("/owner")} className="text-stone-400 hover:text-stone-600 text-xl">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-stone-800">Laporan Penjualan</h1>
          <p className="text-xs text-stone-500">Analisis pendapatan & transaksi</p>
        </div>
      </nav>

      <div className="px-4 py-4 space-y-4">

        {/* Mode Toggle */}
        <div className="bg-white rounded-xl border border-stone-100 p-1 flex gap-1">
          {[
            { key: "daily", label: "📅 Harian" },
            { key: "range", label: "📆 Rentang" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === m.key ? "bg-green-700 text-white" : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Date Picker */}
        <div className="bg-white rounded-xl border border-stone-100 p-4">
          {mode === "daily" ? (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Pilih Tanggal</label>
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Dari</label>
                <input
                  type="date"
                  value={startDate}
                  max={today}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Sampai</label>
                <input
                  type="date"
                  value={endDate}
                  max={today}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          )}
        </div>

        {dataLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : report ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Pendapatan", value: formatCurrency(report.summary?.totalRevenue || 0), icon: "💰", color: "text-green-700" },
                { label: "Total Pesanan", value: report.summary?.totalOrders || 0, icon: "🧾", color: "text-blue-700" },
                ...(mode === "daily" ? [
                  { label: "Cash", value: formatCurrency(report.summary?.cashRevenue || 0), icon: "💵", color: "text-orange-600" },
                  { label: "QRIS", value: formatCurrency(report.summary?.qrisRevenue || 0), icon: "📱", color: "text-purple-600" },
                ] : []),
              ].map((card, i) => (
                <div key={i} className="bg-white rounded-xl border border-stone-100 p-4">
                  <span className="text-2xl">{card.icon}</span>
                  <p className={`text-xl font-bold mt-2 ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-stone-500 mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Grafik Per Jam */}
            {mode === "daily" && report.hourlyData?.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-100 p-4">
                <h3 className="font-semibold text-stone-800 mb-4">📊 Pesanan per Jam</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={report.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val, name) => name === "revenue" ? formatCurrency(val) : val} />
                    <Bar dataKey="orders" fill="#16a34a" radius={[4, 4, 0, 0]} name="Pesanan" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Grafik Per Hari */}
            {mode === "range" && report.dailyData?.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-100 p-4">
                <h3 className="font-semibold text-stone-800 mb-4">📈 Pendapatan Harian</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={report.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} name="Pendapatan" />
                    <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Pesanan" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Menu */}
            {report.topMenus?.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-100 p-4">
                <h3 className="font-semibold text-stone-800 mb-4">🏆 Menu Terlaris</h3>
                <div className="space-y-3">
                  {report.topMenus.map((menu, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm font-bold w-6 text-center">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{menu.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 bg-stone-100 rounded-full h-1.5">
                            <div
                              className="bg-green-600 h-1.5 rounded-full"
                              style={{ width: `${(menu.qty / report.topMenus[0].qty) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-stone-500 flex-shrink-0">{menu.qty} terjual</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-green-700 flex-shrink-0">
                        {formatCurrency(menu.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Zona Meja */}
            {mode === "daily" && report.zoneData?.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-100 p-4">
                <h3 className="font-semibold text-stone-800 mb-3">🪑 Pesanan per Zona</h3>
                <div className="space-y-2">
                  {report.zoneData.map((zone) => (
                    <div key={zone.zone} className="flex items-center justify-between text-sm">
                      <span className="text-stone-600 capitalize">
                        {zone.zone === "indoor" ? "🏠" : zone.zone === "outdoor" ? "🌿" : "⭐"} {zone.zone}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-stone-500">{zone.orders} pesanan</span>
                        <span className="font-semibold text-green-700">{formatCurrency(zone.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.summary?.totalOrders === 0 && (
              <div className="bg-white rounded-xl border border-stone-100 p-10 text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-stone-500">Belum ada transaksi pada periode ini</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}