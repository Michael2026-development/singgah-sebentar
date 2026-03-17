"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useRequireAuth from "@/hooks/useRequireAuth";
import { formatCurrency } from "@/lib/utils";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import api from "@/lib/axios";

const ROLE_LABELS = {
  owner: "Owner",
  manager: "Manager",
  kasir: "Kasir",
  dapur: "Dapur",
};

export default function OwnerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading, hasAccess } = useRequireAuth(["owner"]);
  const [zoneFilter, setZoneFilter] = useState("all");

  // Fetch ringkasan hari ini
  const today = new Date().toISOString().split("T")[0];

  const { data: reportData } = useQuery({
    queryKey: ["owner-daily-summary", today],
    queryFn: () => api.get(`/reports/daily?date=${today}`).then((r) => r.data),
    enabled: hasAccess,
    refetchInterval: 30000,
  });

  const { data: menuData } = useQuery({
    queryKey: ["owner-menus-count"],
    queryFn: () => api.get("/menus").then((r) => r.data),
    enabled: hasAccess,
  });

  const { data: tableData } = useQuery({
    queryKey: ["owner-tables-count"],
    queryFn: () => api.get("/tables").then((r) => r.data),
    enabled: hasAccess,
  });

  const { data: staffData } = useQuery({
    queryKey: ["owner-staff"],
    queryFn: () => api.get("/staff").then((r) => r.data),
    enabled: hasAccess,
  });

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!hasAccess) return;
    const socket = connectSocket(user.role);

    socket.on("new_order", () => {
      queryClient.invalidateQueries({ queryKey: ["owner-daily-summary"] });
    });
    socket.on("order_status_update", () => {
      queryClient.invalidateQueries({ queryKey: ["owner-daily-summary"] });
    });
    socket.on("payment_confirmed", () => {
      queryClient.invalidateQueries({ queryKey: ["owner-daily-summary"] });
    });
    socket.on("table_status_update", () => {
      queryClient.invalidateQueries({ queryKey: ["owner-tables-count"] });
    });

    return () => {
      socket.off("new_order");
      socket.off("order_status_update");
      socket.off("payment_confirmed");
      socket.off("table_status_update");
      disconnectSocket();
    };
  }, [hasAccess]);

  if (isLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark text-slate-100 font-display dark">
      <div className="text-center"><div className="text-3xl mb-2">☕</div>
      <p className="text-slate-400 text-sm">Memuat...</p></div>
    </div>
  );

  const handleLogout = () => {
    const { logout } = require("@/store/authStore").default.getState();
    logout();
    disconnectSocket();
    router.push("/login");
  };

  const report = reportData?.data;
  const totalOrders = report?.summary?.totalOrders || 0;
  const totalRevenue = report?.summary?.totalRevenue || 0;
  const cashRevenue = report?.summary?.cashRevenue || 0;
  const qrisRevenue = report?.summary?.qrisRevenue || 0;
  const menus = menuData?.data || [];
  const tables = tableData?.data || [];
  const staffList = (staffData?.data || []).filter((s) => s.id !== user.id);
  const activeMenus = menus.filter((m) => m.isAvailable && m.isActive !== false).length;
  const activeTables = tables.filter((t) => t.isActive).length;
  const occupiedTables = tables.filter((t) => t.status === "occupied").length;

  // Hourly chart data from report
  const hourlyData = report?.hourlyData || [];
  const maxHourlyRevenue = Math.max(...hourlyData.map((h) => h.revenue), 1);

  // Group hourly data logic for "Sen" block etc?
  // We'll map hourlyData directly since report only does today's hours.
  
  // Zone filter for table monitor
  const zones = [...new Set(tables.map((t) => t.zone))];
  const filteredTables = zoneFilter === "all" ? tables : tables.filter((t) => t.zone === zoneFilter);

  // Top menus from report
  const topMenus = report?.topMenus?.slice(0, 5) || [];

  return (
    <div className="dark h-screen overflow-hidden bg-background-dark text-slate-100 antialiased font-display">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border-dark bg-background-dark flex flex-col shrink-0">
            <div className="p-6 flex items-center gap-3">
                <div className="bg-primary p-2 rounded-lg">
                    <span className="material-symbols-outlined text-background-dark font-bold">restaurant</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-primary">Singgah Sebentar</h2>
            </div>
            
            <nav className="flex-1 px-4 space-y-1 mt-4 text-sm">
                {[
                  { label: "Dashboard", icon: "dashboard", href: "/owner", active: true },
                  { label: "Menu", icon: "restaurant_menu", href: "/owner/menu" },
                  { label: "Kategori", icon: "category", href: "/owner/kategori" },
                  { label: "Meja", icon: "table_restaurant", href: "/owner/meja" },
                  { label: "Staff", icon: "badge", href: "/owner/staff" },
                  { label: "Laporan", icon: "bar_chart", href: "/owner/laporan" },
                  { label: "Monitor", icon: "monitoring", href: "/kasir" },
                ].map((item) => (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        item.active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
            </nav>

            {/* Profile Section */}
            <div className="p-4 mt-auto border-t border-border-dark">
                <div onClick={handleLogout} className="bg-surface-dark p-4 rounded-xl flex items-center gap-3 group relative cursor-pointer hover:bg-surface-dark/80 transition-all">
                    {/* Tooltip for logout */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                        Klik untuk Keluar
                    </div>
                    <div className="size-10 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold text-slate-200 shrink-0">
                        {user.name.charAt(0)}
                    </div>
                    <div className="flex flex-col text-left overflow-hidden">
                        <span className="text-sm font-semibold truncate text-white">{user.name}</span>
                        <span className="text-xs text-slate-500 truncate capitalize">{ROLE_LABELS[user.role] || user.role}</span>
                    </div>
                </div>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
            {/* Header */}
            <header className="h-20 border-b border-border-dark px-8 flex items-center justify-between sticky top-0 bg-background-dark/80 backdrop-blur-md z-10 w-full">
                <div className="relative w-96 hidden md:block">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">search</span>
                    <input type="text" placeholder="Cari pesanan, staf, atau laporan..." className="w-full bg-surface-dark border-border-dark rounded-xl pl-11 pr-4 py-2.5 focus:ring-primary focus:border-primary text-sm transition-all outline-none placeholder:text-slate-500 text-slate-100"/>
                </div>
                <div className="flex items-center gap-4 ml-auto">
                    <button className="p-2.5 rounded-xl bg-surface-dark text-slate-400 hover:text-primary hover:bg-primary/10 transition-all relative">
                        <span className="material-symbols-outlined">notifications</span>
                        {totalOrders > 0 && <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-background-dark"></span>}
                    </button>
                    <button onClick={() => router.push('/owner/pengaturan')} className="p-2.5 rounded-xl bg-surface-dark text-slate-400 hover:text-primary transition-all">
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                </div>
            </header>

            <div className="p-8 space-y-8">
                {/* Greeting */}
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Selamat datang, {user.name}! 👋</h2>
                    <p className="text-sm text-slate-500 mt-1">Ringkasan operasional hari ini — {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Pesanan */}
                    <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark hover:border-primary/50 transition-all group lg:min-h-[160px]">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-background-dark transition-all">
                                <span className="material-symbols-outlined">receipt_long</span>
                            </div>
                            <span className="text-primary text-sm font-bold bg-primary/10 px-2 py-1 rounded-lg">Hari ini</span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Total Pesanan</p>
                        <h3 className="text-3xl font-bold mt-1 text-slate-100">{totalOrders}</h3>
                        {/* Static Sparkline from design - can be kept as pure decor or linked to data */}
                        <div className="mt-4 h-12 w-full flex items-end gap-1">
                            <div className="flex-1 bg-gradient-to-t from-primary-deep to-primary/20 rounded-t-sm h-[40%]"></div>
                            <div className="flex-1 bg-gradient-to-t from-primary-deep to-primary/30 rounded-t-sm h-[60%]"></div>
                            <div className="flex-1 bg-gradient-to-t from-primary-deep to-primary/20 rounded-t-sm h-[30%]"></div>
                            <div className="flex-1 bg-gradient-to-t from-primary-deep to-primary/50 rounded-t-sm h-[80%]"></div>
                            <div className="flex-1 bg-gradient-to-t from-primary-deep to-primary/40 rounded-t-sm h-[50%]"></div>
                            <div className="flex-1 bg-gradient-to-t from-primary-deep to-primary rounded-t-sm h-[95%] shadow-[0_0_8px_rgba(29,201,86,0.3)]"></div>
                            <div className="flex-1 bg-gradient-to-t from-primary-deep to-primary/60 rounded-t-sm h-[70%]"></div>
                            <div className="flex-1 bg-gradient-to-t from-primary-deep to-primary/40 rounded-t-sm h-[45%]"></div>
                        </div>
                    </div>

                    {/* Pendapatan */}
                    <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark hover:border-blue-500/50 transition-all group lg:min-h-[160px]">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-background-dark transition-all">
                                <span className="material-symbols-outlined">payments</span>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-500">Cash: <span className="text-slate-300">{formatCurrency(cashRevenue)}</span></p>
                                <p className="text-[10px] text-slate-500">QRIS: <span className="text-slate-300">{formatCurrency(qrisRevenue)}</span></p>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Pendapatan</p>
                        <h3 className="text-3xl font-bold mt-1 text-slate-100">{formatCurrency(totalRevenue)}</h3>
                        <div className="mt-4 h-12 w-full flex items-center justify-center">
                            <svg className="w-full h-full text-blue-500 stroke-current fill-none stroke-[2] drop-shadow-[0_4px_6px_rgba(59,130,246,0.3)]" viewBox="0 0 100 30">
                                <path d="M0,20 C10,20 15,5 25,5 C35,5 40,25 50,25 C60,25 65,10 75,10 C85,10 90,28 100,28" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                        </div>
                    </div>

                    {/* Menu Aktif */}
                    <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark hover:border-amber-500/50 transition-all group lg:min-h-[160px]">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 group-hover:bg-amber-500 group-hover:text-background-dark transition-all">
                                <span className="material-symbols-outlined">menu_book</span>
                            </div>
                            <span className="text-amber-500 text-sm font-bold bg-amber-500/10 px-2 py-1 rounded-lg">{menus.length} Total</span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Menu Aktif</p>
                        <h3 className="text-3xl font-bold mt-1 text-slate-100">{activeMenus}</h3>
                        <div className="mt-4 h-12 w-full flex items-end gap-1">
                            <div className="flex-1 bg-gradient-to-t from-amber-500/5 to-amber-500/20 rounded-t-full h-1/4"></div>
                            <div className="flex-1 bg-gradient-to-t from-amber-500/10 to-amber-500/40 rounded-t-full h-2/4"></div>
                            <div className="flex-1 bg-gradient-to-t from-amber-500/20 to-amber-500/60 rounded-t-full h-3/4"></div>
                            <div className="flex-1 bg-gradient-to-t from-amber-500/30 to-amber-500 rounded-t-full h-full shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
                        </div>
                    </div>

                    {/* Meja Terisi */}
                    <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark hover:border-primary/50 transition-all group lg:min-h-[160px]">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-background-dark transition-all">
                                <span className="material-symbols-outlined">grid_view</span>
                            </div>
                            <span className="text-primary text-sm font-bold bg-primary/10 px-2 py-1 rounded-lg">{activeTables} Table</span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Meja Terisi</p>
                        <h3 className="text-3xl font-bold mt-1 text-slate-100">{occupiedTables}<span className="text-lg text-slate-500 font-normal">/{activeTables}</span></h3>
                        <div className="mt-4 flex flex-col gap-2">
                            <div className="w-full h-3 bg-border-dark rounded-full overflow-hidden flex">
                                <div className="h-full bg-gradient-to-r from-primary-dark to-primary rounded-full transition-all" style={{ width: `${activeTables === 0 ? 0 : (occupiedTables / activeTables) * 100}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs font-medium text-slate-500">
                                <span>{Math.round(activeTables === 0 ? 0 : (occupiedTables / activeTables) * 100)}% Occupied</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Charts & Side */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Line/Bar Chart Area (High Density) */}
                    <div className="xl:col-span-2 bg-surface-dark p-8 rounded-2xl border border-border-dark">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-100">Analitik Penjualan</h3>
                                <p className="text-slate-500 text-sm">Distribusi pendapatan hari ini</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Hari Ini</p>
                                <p className="text-lg font-bold text-primary">{formatCurrency(totalRevenue)}</p>
                            </div>
                        </div>

                        <div className="flex gap-4 h-[350px]">
                            {/* Y-Axis */}
                            <div className="flex flex-col justify-between text-[10px] font-medium text-slate-500 py-2 h-[300px]">
                                <span>{formatCurrency(maxHourlyRevenue)}</span>
                                <span>{formatCurrency(Math.round(maxHourlyRevenue * 0.66))}</span>
                                <span>{formatCurrency(Math.round(maxHourlyRevenue * 0.33))}</span>
                                <span>Rp 0</span>
                            </div>
                            
                            {/* Chart Area */}
                            <div className="flex-1 flex items-end justify-between gap-1.5 px-2 relative h-[300px]">
                                {/* Horizontal grid */}
                                <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none z-0">
                                    <div className="border-t border-slate-700/30 w-full h-px"></div>
                                    <div className="border-t border-slate-700/30 w-full h-px"></div>
                                    <div className="border-t border-slate-700/30 w-full h-px"></div>
                                    <div className="border-t border-slate-700/30 w-full h-px"></div>
                                </div>

                                {hourlyData.length > 0 ? hourlyData.map((h, idx) => {
                                  const heightPct = Math.max((h.revenue / maxHourlyRevenue) * 100, 2);
                                  const isHighest = h.revenue === maxHourlyRevenue && h.revenue > 0;
                                  return (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 z-10 h-full justify-end group relative cursor-pointer min-w-0">
                                       <div className="absolute -top-14 bg-background-dark/95 backdrop-blur-md border border-primary/30 text-white px-3 py-1.5 rounded-lg shadow-2xl flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                                            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{h.label} ({h.orders}x)</span>
                                            <span className="text-xs font-bold text-primary whitespace-nowrap">{formatCurrency(h.revenue)}</span>
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-background-dark border-r border-b border-primary/30 rotate-45"></div>
                                        </div>
                                        
                                        <div className="w-full flex justify-center items-end h-full">
                                            <div className={`w-full max-w-[12px] rounded-t-sm transition-all duration-300 ${
                                              isHighest 
                                                ? 'bg-gradient-to-t from-primary-dark to-primary shadow-[0_-4px_15px_rgba(29,201,86,0.3)]' 
                                                : 'bg-gradient-to-t from-primary-deep to-primary/40 group-hover:to-primary/60 hover:shadow-[0_-4px_10px_rgba(29,201,86,0.1)]'
                                            }`} style={{ height: `${heightPct}%` }}></div>
                                        </div>
                                        <span className="text-[9px] font-medium text-slate-500 tracking-tighter w-full text-center overflow-hidden">
                                          {idx % 2 === 0 ? h.label.split(':')[0] : ''}
                                        </span>
                                    </div>
                                  );
                                }) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-slate-500">Belum ada data penjualan hari ini</p>
                                  </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Staff & Top Menu */}
                    <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark flex flex-col xl:col-span-1">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-100">Staf Bertugas</h3>
                            <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full font-bold">{staffList.filter(s => s.isActive).length} Aktif</span>
                        </div>
                        
                        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: "300px" }}>
                            {staffList.length > 0 ? staffList.map((s) => (
                              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-border-dark hover:bg-white/5 transition-all bg-background-dark/30 hover:bg-background-dark/80">
                                  <div className="flex items-center gap-3">
                                      <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold border border-border-dark/60 ${s.isActive ? 'bg-primary-deep text-primary' : 'bg-slate-800 text-slate-500'}`}>
                                          {s.name.charAt(0)}
                                      </div>
                                      <div>
                                          <p className={`text-sm font-semibold ${s.isActive ? 'text-slate-200' : 'text-slate-500'}`}>{s.name}</p>
                                          <p className="text-xs text-slate-500 capitalize">{ROLE_LABELS[s.role] || s.role}</p>
                                      </div>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                                      s.isActive 
                                        ? "bg-primary/10 text-primary" 
                                        : "bg-slate-800 text-slate-500"
                                  }`}>
                                      {s.isActive ? 'Active' : 'Offline'}
                                  </span>
                              </div>
                            )) : (
                              <div className="text-center py-6 text-slate-500">Belum ada staff</div>
                            )}
                        </div>

                        {topMenus.length > 0 && (
                          <div className="mt-5 pt-5 border-t border-border-dark">
                              <h3 className="text-sm font-bold text-slate-300 mb-4">🏆 Menu Terlaris Hari Ini</h3>
                              <div className="space-y-3">
                                  {topMenus.map((m, i) => (
                                      <div key={i} className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                              <div className="size-6 rounded-md bg-background-dark flex items-center justify-center text-xs font-bold text-slate-400 border border-border-dark">
                                                  {i + 1}
                                              </div>
                                              <span className="text-sm text-slate-300 truncate max-w-[150px] font-medium">{m.name}</span>
                                          </div>
                                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">{m.qty}x</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                        <div className="pt-4 border-t border-border-dark mt-4">
                            <button onClick={() => router.push('/owner/staff')} className="w-full py-2 text-slate-400 text-sm font-medium hover:text-white transition-all bg-border-dark/50 hover:bg-border-dark rounded-lg">
                                Manajemen Staf
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Status Block */}
                <div className="bg-surface-dark p-8 rounded-2xl border border-border-dark">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-100">Monitor Meja Live</h3>
                            <p className="text-slate-500 text-sm">Status real-time area restoran</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex items-center gap-4 text-xs font-semibold mr-4">
                                <div className="flex items-center gap-2">
                                    <span className="size-3 bg-primary rounded-full shadow-[0_0_8px_rgba(29,201,86,0.6)]"></span>
                                    <span className="text-slate-300">Terisi ({occupiedTables})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="size-3 bg-border-dark rounded-full border border-slate-500"></span>
                                    <span className="text-slate-400">Tersedia ({activeTables - occupiedTables})</span>
                                </div>
                            </div>
                            
                            <div className="relative">
                                <select 
                                  value={zoneFilter}
                                  onChange={(e) => setZoneFilter(e.target.value)}
                                  className="appearance-none bg-background-dark border border-border-dark text-sm font-medium rounded-xl pl-4 pr-10 py-2.5 focus:ring-1 focus:ring-primary outline-none text-slate-200 w-full sm:w-auto cursor-pointer hover:border-slate-500 transition-all custom-scrollbar">
                                    <option value="all">Semua Zona</option>
                                    {zones.map((z) => (
                                      <option key={z} value={z}>{z === "indoor" ? "🏠 Indoor" : z === "outdoor" ? "🌿 Outdoor" : z === "vip" ? "⭐ VIP" : z}</option>
                                    ))}
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                        {filteredTables.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => router.push("/owner/meja")}
                            className={`flex flex-col items-center gap-2 p-5 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 ${
                                t.status === "occupied"
                                  ? "border-2 border-primary bg-primary/5 hover:bg-primary/10 shadow-[0_4px_20px_rgba(29,201,86,0.05)]"
                                  : "border border-border-dark hover:border-slate-500 bg-background-dark/30 hover:bg-background-dark/60"
                            }`}
                          >
                              <span className={`material-symbols-outlined text-3xl ${t.status === "occupied" ? "text-primary" : "text-slate-500"}`}>
                                  table_bar
                              </span>
                              <span className={`text-base font-bold ${t.status === "occupied" ? "text-slate-100" : "text-slate-400"}`}>
                                  T-{String(t.tableNumber).padStart(2, "0")}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${t.status === "occupied" ? "text-primary" : "text-slate-500"}`}>
                                  {t.status === "occupied" ? 'Occupied' : 'Waiting'}
                              </span>
                          </div>
                        ))}

                        {filteredTables.length === 0 && (
                          <div className="col-span-full text-center py-12">
                            <div className="size-16 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl text-slate-600">table_restaurant</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-2">Tidak ada meja di zona ini</p>
                          </div>
                        )}
                    </div>
                </div>

            </div>
        </main>
      </div>
    </div>
  );
}