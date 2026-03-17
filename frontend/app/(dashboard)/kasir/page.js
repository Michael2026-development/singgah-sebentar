"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useRequireAuth from "@/hooks/useRequireAuth";
import { getOrders, confirmOrder } from "@/services/orderService";
import { confirmCashPayment, confirmQrisPayment } from "@/services/paymentService";
import { getTables, updateTableStatus } from "@/services/tableService";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/constants";

export default function KasirDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, hasAccess } = useRequireAuth(["kasir", "owner", "manager"]);
  const [activeTab, setActiveTab] = useState("pending");
  const [notification, setNotification] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  useEffect(() => {
    if (!user) return;
    const socket = connectSocket(user.role);
    socket.on("new_order", (data) => {
      try { new Audio("/sounds/new-order.mp3").play().catch(() => {}); } catch {}
      setNotification({ type: "new", message: data.message });
      setTimeout(() => setNotification(null), 5000);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["kasir-tables"] });
    });
    socket.on("order_status_update", () => queryClient.invalidateQueries({ queryKey: ["orders"] }));
    socket.on("table_status_update", () => queryClient.invalidateQueries({ queryKey: ["kasir-tables"] }));
    socket.on("payment_confirmed", () => queryClient.invalidateQueries({ queryKey: ["orders"] }));
    return () => {
      socket.off("new_order");
      socket.off("order_status_update");
      socket.off("table_status_update");
      socket.off("payment_confirmed");
      disconnectSocket();
    };
  }, [user, queryClient]);

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", activeTab],
    queryFn: () => getOrders({ status: activeTab }),
    refetchInterval: 15000,
    enabled: hasAccess,
  });

  const { data: tablesData, isLoading: tablesLoading } = useQuery({
    queryKey: ["kasir-tables"],
    queryFn: () => getTables(),
    refetchInterval: 15000,
    enabled: hasAccess,
  });

  const orders = ordersData?.data || [];
  const tables = tablesData?.data || [];
  
  // Filter orders by search query
  const filteredOrders = searchQuery.trim()
    ? orders.filter((o) => {
        const q = searchQuery.toLowerCase();
        return (
          o.orderNumber?.toLowerCase().includes(q) ||
          o.table?.tableNumber?.toString().includes(q) ||
          o.orderItems?.some((item) => item.menu?.name?.toLowerCase().includes(q))
        );
      })
    : orders;

  // Pagination
  const paginateTabs = ["delivered"];
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = paginateTabs.includes(activeTab)
    ? filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    : filteredOrders;

  // Stats - use Number() because Prisma Decimal returns strings
  const totalOrders = orders.length;
  const omzetShift = orders.filter(o => o.payment?.status === "paid").reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

  const confirmMutation = useMutation({
    mutationFn: (orderId) => confirmOrder(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const cashMutation = useMutation({
    mutationFn: (orderId) => confirmCashPayment(orderId, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const qrisMutation = useMutation({
    mutationFn: ({ orderId, ref }) => confirmQrisPayment(orderId, { qrisRefNumber: ref }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const tableStatusMutation = useMutation({
    mutationFn: ({ tableId, status }) => updateTableStatus(tableId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kasir-tables"] }),
  });

  const handleLogout = () => {
    const { logout } = require("@/store/authStore").default.getState();
    logout();
    disconnectSocket();
    router.push("/login");
  };

  const handleToggleTableStatus = (table, e) => {
    e.stopPropagation();
    const newStatus = table.status === "occupied" ? "available" : "occupied";
    tableStatusMutation.mutate({ tableId: table.id, status: newStatus });
  };

  const tabs = [
    { key: "pending", label: "Masuk" },
    { key: "confirmed", label: "Dikonfirmasi" },
    { key: "preparing", label: "Diproses" },
    { key: "delivered", label: "Selesai" },
  ];

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] flex-col text-slate-300">
      <span className="material-symbols-outlined text-border-dark text-4xl mb-4 animate-pulse">local_cafe</span>
      <p className="font-medium text-sm">Memuat Dashboard Kasir...</p>
    </div>
  );

  return (
    <div className="bg-[#0B1218] text-slate-300 min-h-screen flex flex-col overflow-x-hidden font-display dark">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#121A21]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(user.role === 'kasir' ? '/kasir' : `/${user.role}`)}>
              <div className="size-9 bg-primary flex items-center justify-center rounded-lg text-background-dark">
                <span className="material-symbols-outlined text-2xl font-bold">local_cafe</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">Singgah</h1>
            </div>
            {/* Shift Info */}
            <div className="hidden lg:flex items-center gap-6 border-l border-white/10 pl-8">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Jam Operasional</span>
                <span className="text-sm font-medium text-white flex items-center gap-1">08:30 - 21:00</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Kasir Bertugas</span>
                <span className="text-sm font-medium text-white flex items-center gap-1">{user.name}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="relative max-w-xs w-full hidden md:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
              <input 
                className="w-full h-10 pl-10 pr-4 bg-white/5 border-none rounded-lg text-sm text-white focus:ring-2 focus:ring-[#1dc956] transition-all placeholder:text-slate-500 outline-none" 
                placeholder="Cari pesanan..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="relative size-10 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-300 transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                {notification && <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-background-dark"></span>}
              </button>
              <div className="h-8 w-px bg-white/10 mx-1"></div>
              <div className="flex items-center gap-3 pl-1 group cursor-pointer relative" onClick={handleLogout}>
                 <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                     Klik untuk Keluar
                 </div>
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-sm font-semibold text-white capitalize">{user.name}</span>
                  <span className="text-[10px] text-primary font-medium capitalize">{user.role}</span>
                </div>
                <div className="size-10 rounded-full border-2 border-[#1dc956] overflow-hidden bg-[#121A21] flex items-center justify-center text-white font-bold">
                  {user.name.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <nav className="w-full bg-[#121A21]/50 border-b border-white/5 overflow-x-auto custom-scrollbar">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex items-center gap-10">
          {tabs.map((tab) => {
            const count = ordersData?.data ? (activeTab === tab.key ? filteredOrders.length : false) : false;
            const isActive = activeTab === tab.key;
            return (
              <button 
                key={tab.key} 
                onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                className={`relative py-4 text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${isActive ? "text-white font-bold" : "text-slate-500 hover:text-white"}`}
              >
                {tab.label}
                {isActive && typeof count === 'number' && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/20 text-[11px] font-bold text-primary">{count}</span>
                )}
                {isActive && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 md:px-8 py-8 relative">
        {notification && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-700 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 shadow-green-900/50">
            <span className="material-symbols-outlined">notifications_active</span>
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        )}

        {/* Orders Section */}
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-xl font-bold text-white">
            Pesanan {tabs.find(t => t.key === activeTab)?.label}
          </h2>
          <div className="h-px flex-1 bg-white/5 ml-2"></div>
        </div>

        {ordersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <div key={i} className="bg-[#121A21] rounded-xl h-64 animate-pulse border border-white/5" />)}
            </div>
        ) : filteredOrders.length === 0 ? (
           <div className="text-center py-20 bg-[#121A21]/50 rounded-2xl border border-white/5">
             <span className="material-symbols-outlined text-5xl text-slate-600 mb-4 block">receipt_long</span>
             <p className="text-slate-400">Belum ada pesanan untuk kategori ini.</p>
           </div>
        ) : (
          <div className={`grid gap-6 ${activeTab === 'delivered' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {paginatedOrders.map((order) => {
               // Determine styling classes mimicking old status colors but adopting dark aesthetic
               let badgeClasses = "bg-slate-500/5 text-slate-400 border-slate-500/20";
               if (order.status === "pending") badgeClasses = "bg-orange-500/10 text-orange-400 border-orange-500/20";
               else if (order.status === "confirmed") badgeClasses = "bg-blue-500/10 text-blue-400 border-blue-500/20";
               else if (order.status === "preparing") badgeClasses = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
               else if (order.status === "delivering") badgeClasses = "bg-purple-500/10 text-purple-400 border-purple-500/20";
               else if (order.status === "delivered") badgeClasses = "bg-green-500/10 text-green-400 border-green-500/20";
               else if (order.status === "cancelled") badgeClasses = "bg-red-500/10 text-red-400 border-red-500/20";

               return (
                  <div key={order.id} className={`bg-[#121A21] border border-white/5 rounded-xl overflow-hidden shadow-lg hover:border-white/10 transition-all ${activeTab !== 'delivered' ? 'flex flex-col md:flex-row' : 'flex flex-col'}`}>
                    {/* LEADER HEADER (Left side on desktop if active, or top if delivered) */}
                    <div className={`p-4 border-white/5 ${activeTab !== 'delivered' ? 'md:w-1/3 md:border-r border-b md:border-b-0' : 'border-b'} md:p-6 bg-black/10 flex flex-col justify-between`}>
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">#{order.orderNumber}</span>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${badgeClasses}`}>
                            {ORDER_STATUS_LABEL[order.status] || order.status}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-4">
                          <span className="material-symbols-outlined text-primary text-2xl">
                            {order.table ? "table_restaurant" : "shopping_bag"}
                          </span>
                          {order.table ? (
                             <span>
                               Meja {order.table.tableNumber}
                               <div className={`text-xs mt-1 ${
                                 order.table.zone.toLowerCase() === 'vip' ? 'text-yellow-500/80 uppercase font-medium' :
                                 order.table.zone.toLowerCase() === 'outdoor' ? 'text-emerald-400/80 capitalize font-medium' :
                                 'text-blue-400/80 capitalize font-medium'
                               }`}>
                                 {order.table.zone}
                               </div>
                             </span>
                          ) : "Takeaway - Kasir"}
                        </h3>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-dashed border-white/10">
                        <span className="text-xs text-slate-500 flex flex-col items-start gap-1">
                          Total Tagihan
                          {order.payment?.status === "paid" && <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded text-[10px] uppercase font-bold">LUNAS</span>}
                          {order.payment?.status !== "paid" && <span className="bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded text-[10px] uppercase font-bold">Belum Bayar</span>}
                        </span>
                        <span className="text-lg font-bold text-primary mt-1 block">{formatCurrency(Number(order.totalAmount))}</span>
                      </div>
                    </div>
                    
                    {/* ITEMS LIST (Middle section if active) */}
                    <div className={`p-4 flex-1 md:p-6 ${activeTab !== 'delivered' ? 'border-r border-white/5' : ''}`}>
                      <ul className="space-y-4">
                        {order.orderItems?.slice(0, activeTab === 'delivered' ? 3 : 7).map((item, idx) => {
                          const noteVal = item.specialNote || "";
                          const isSizeNote = noteVal.startsWith("Size: ");
                          let sizeDisplay = null;
                          let standardNote = noteVal;

                          if (isSizeNote) {
                            const parts = noteVal.split(" | ");
                            sizeDisplay = parts[0].replace("Size: ", "").trim();
                            standardNote = parts[1] || "";
                          }
                          
                          return (
                            <li key={idx} className="flex flex-col text-sm border-b border-white/5 pb-3 last:border-0 last:pb-0">
                              <div className="flex justify-between items-start">
                                <span className="text-slate-300 font-medium">
                                  <span className="font-bold text-white mr-2">{item.quantity}x</span>
                                  {item.menu?.name}
                                </span>
                                <span className="font-medium shrink-0 text-slate-400">{formatCurrency(Number(item.subtotal))}</span>
                              </div>
                              {(sizeDisplay || standardNote) && (
                                <div className="ml-6 mt-1.5 flex flex-col gap-1">
                                  {sizeDisplay && (
                                    <span className="inline-block w-max px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-white/10">
                                      {sizeDisplay}
                                    </span>
                                  )}
                                  {standardNote && (
                                    <span className="text-xs text-yellow-500/80 italic flex items-start gap-1">
                                      <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                      {standardNote}
                                    </span>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                        {order.orderItems?.length > (activeTab === 'delivered' ? 3 : 7) && (
                            <li className="text-xs text-primary font-medium pt-2 border-t border-dashed border-white/5">+{order.orderItems.length - (activeTab === 'delivered' ? 3 : 7)} item lainnya...</li>
                        )}
                      </ul>
                    </div>
                    
                    {/* ACTIONS (Right side if active, bottom if delivered) */}
                    <div className={`p-4 bg-black/20 flex flex-col justify-center gap-3 md:p-6 ${activeTab !== 'delivered' ? 'md:w-1/4' : ''}`}>
                      {order.status === "pending" ? (
                        <div className="flex flex-col gap-3">
                          <button 
                            onClick={() => confirmMutation.mutate(order.id)}
                            disabled={confirmMutation.isPending}
                            className="py-3 px-2 w-full rounded-xl bg-primary/90 hover:bg-primary text-background-dark text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-1.5 border border-primary/50 drop-shadow-sm"
                          >
                            <span className="material-symbols-outlined text-2xl drop-shadow-sm">check_circle</span>
                            <span className="leading-tight text-center">{confirmMutation.isPending ? "..." : "Terima"}</span>
                          </button>
                          <button 
                             onClick={() => setSelectedOrder(order)}
                             className="py-3 px-2 w-full rounded-xl border border-white/10 text-sm font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all flex flex-col items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-2xl drop-shadow-sm">receipt_long</span>
                            <span className="leading-tight text-center">Detail</span>
                          </button>
                        </div>
                      ) : order.payment?.method === "cash" && order.payment?.status !== "paid" ? (
                        <button 
                          onClick={() => cashMutation.mutate(order.id)}
                          disabled={cashMutation.isPending}
                          className="py-3 px-3 w-full rounded-xl bg-green-700/80 hover:bg-green-600 text-green-50 text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-1.5 border border-green-600/50"
                        >
                           <span className="material-symbols-outlined text-2xl drop-shadow-sm">payments</span>
                           <span className="leading-tight text-center whitespace-pre-wrap">{cashMutation.isPending ? "Memproses..." : "Bayar\nCash"}</span>
                        </button>
                      ) : order.payment?.method === "qris" && order.payment?.status !== "paid" ? (
                         <button 
                          onClick={() => qrisMutation.mutate({ orderId: order.id, ref: '' })}
                          disabled={qrisMutation.isPending}
                          className="py-3 px-3 w-full rounded-xl bg-blue-600/80 hover:bg-blue-500 text-blue-50 text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-1.5 border border-blue-500/50"
                         >
                           <span className="material-symbols-outlined text-2xl drop-shadow-sm">qr_code_scanner</span>
                           <span className="leading-tight text-center whitespace-pre-wrap">{qrisMutation.isPending ? "Memproses..." : "Terima\nQRIS"}</span>
                         </button>
                      ) : order.status !== "delivered" ? (
                         <div className={`py-4 px-3 w-full rounded-xl border flex flex-col items-center justify-center text-center text-sm font-bold leading-tight gap-1.5 ${
                           order.status === "preparing" ? "border-yellow-500/20 text-yellow-500 bg-yellow-500/10" :
                           order.status === "confirmed" ? "border-blue-500/20 text-blue-500 bg-blue-500/10" :
                           "border-white/5 text-slate-500 bg-white/5"
                         }`}>
                           <span className="material-symbols-outlined text-2xl opacity-80">
                             {order.status === "preparing" ? "cooking" :
                              order.status === "confirmed" ? "restaurant" : "pending_actions"}
                           </span>
                           <span className="leading-tight whitespace-pre-wrap text-center">
                             {order.status === "preparing" ? "Sedang\nDisiapkan" :
                              order.status === "confirmed" ? "Menunggu\nDapur" : 
                              "Menunggu\nKonfirmasi"}
                           </span>
                          </div>
                       ) : null}
                       
                       {/* Global Detail Button for Non-Pending Orders */}
                       {order.status !== "pending" && (
                          <button 
                             onClick={() => setSelectedOrder(order)}
                             className="py-3 px-3 w-full mt-2 rounded-xl border border-white/5 text-sm font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-all flex flex-col items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-2xl drop-shadow-sm">receipt_long</span>
                            <span className="leading-tight text-center whitespace-pre-wrap">Detail Pesanan</span>
                          </button>
                       )}
                    </div>
                  </div>
               );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {["delivered"].includes(activeTab) && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="size-10 rounded-lg border border-white/10 flex items-center justify-center text-slate-400 hover:bg-white/5 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="text-slate-500 px-1">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`size-10 rounded-lg text-sm font-bold transition-all ${
                      currentPage === p
                        ? "bg-primary text-background-dark"
                        : "border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="size-10 rounded-lg border border-white/10 flex items-center justify-center text-slate-400 hover:bg-white/5 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
            <span className="ml-4 text-xs text-slate-500">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} dari {filteredOrders.length} pesanan
            </span>
          </div>
        )}

        {/* Table Monitor Section */}
        <section className="mt-12 mb-10 border-t border-white/5 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">grid_view</span>
              Monitor Meja
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-primary"></div>
                <span className="text-slate-400">Terisi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-slate-600"></div>
                <span className="text-slate-400">Tersedia</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tablesLoading ? (
               [...Array(6)].map((_, i) => <div key={i} className="bg-[#121A21] rounded-xl h-24 animate-pulse border border-white/5" />)
            ) : tables.length === 0 ? (
               <div className="col-span-full py-8 text-center text-slate-500 text-sm">Belum ada meja.</div>
            ) : (
              tables.filter(t => t.isActive).map((table) => {
                const isOccupied = table.status === "occupied";
                return (
                  <div 
                    key={table.id}
                    onClick={(e) => handleToggleTableStatus(table, e)}
                    className={`bg-[#121A21] rounded-xl p-4 flex flex-col gap-3 transition-all cursor-pointer group ${isOccupied ? 'border border-primary/30 hover:border-primary/50' : 'border border-white/5 hover:border-white/10'}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-2xl font-black text-white/10">{table.tableNumber.toString().padStart(2, '0')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isOccupied ? 'bg-primary/10 text-primary' : 'bg-slate-800 text-slate-500'}`}>
                        {isOccupied ? 'Terisi' : 'Kosong'}
                      </span>
                    </div>
                    <div>
                      <p className={`text-sm font-bold transition-colors ${isOccupied ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                        Meja {table.tableNumber}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 capitalize">
                        <span className="material-symbols-outlined text-[10px]">groups</span> {table.capacity || 2} Tamu
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* MODAL MORE INFO */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
            <div className="bg-[#121A21] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/20">
                <div>
                  <h2 className="text-xl font-bold text-white">Detail Pesanan</h2>
                  <p className="text-xs text-slate-400 tracking-widest uppercase mt-1">#{selectedOrder.orderNumber}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="size-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors text-slate-400">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                {/* Meta Panel */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Pelanggan</span>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                       <span className="material-symbols-outlined text-primary text-[18px]">table_restaurant</span>
                       {selectedOrder.table ? `Meja ${selectedOrder.table.tableNumber} (${selectedOrder.table.zone})` : "Takeaway / Kasir"}
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Status Pembayaran</span>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                       {selectedOrder.payment?.status === "paid" ? (
                         <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 uppercase text-[10px] tracking-widest border border-green-500/20">LUNAS</span>
                       ) : (
                         <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 uppercase text-[10px] tracking-widest border border-orange-500/20">BELUM BAYAR</span>
                       )}
                       <span className="text-slate-500 uppercase text-[10px]">{selectedOrder.payment?.method}</span>
                    </p>
                  </div>
                </div>

                {/* Items Full List */}
                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                   <span className="material-symbols-outlined text-slate-500">receipt_long</span>
                   Daftar Item ({selectedOrder.orderItems?.length})
                </h3>
                <ul className="space-y-3 bg-black/10 rounded-xl border border-white/5 p-4">
                  {selectedOrder.orderItems?.map((item, idx) => {
                    const noteVal = item.specialNote || "";
                    const isSizeNote = noteVal.startsWith("Size: ");
                    let sizeDisplay = null;
                    let standardNote = noteVal;

                    if (isSizeNote) {
                      const parts = noteVal.split(" | ");
                      sizeDisplay = parts[0].replace("Size: ", "").trim();
                      standardNote = parts[1] || "";
                    }
                    
                    return (
                      <li key={idx} className="flex flex-col text-sm border-b border-white/5 pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <span className="text-slate-300 font-medium leading-snug">
                            <span className="font-bold text-white mr-2">{item.quantity}x</span>
                            {item.menu?.name}
                          </span>
                          <span className="font-medium shrink-0 text-slate-400">{formatCurrency(Number(item.subtotal))}</span>
                        </div>
                        {(sizeDisplay || standardNote) && (
                          <div className="ml-6 mt-1.5 flex flex-col gap-1">
                            {sizeDisplay && (
                              <span className="inline-block w-max px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-white/10">
                                {sizeDisplay}
                              </span>
                            )}
                            {standardNote && (
                              <span className="text-xs text-yellow-500/80 italic flex items-start gap-1">
                                <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                {standardNote}
                              </span>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              
              <div className="p-5 border-t border-white/10 bg-black/40 flex justify-between items-center">
                 <span className="text-slate-400 text-sm font-medium">Total Tagihan</span>
                 <span className="text-xl font-bold text-primary">{formatCurrency(Number(selectedOrder.totalAmount))}</span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Bottom Summary Bar */}
      <footer className="w-full bg-[#121A21] border-t border-white/5 py-3 px-4 md:px-8 mt-auto sticky bottom-0 z-40">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">receipt_long</span>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Pesanan</p>
                <p className="text-sm font-bold text-white">{totalOrders} Pesanan</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 border-l border-white/10 pl-8">
              <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">payments</span>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Pendapatan</p>
                <p className="text-sm font-bold text-white">{formatCurrency(omzetShift)}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-xs font-medium text-slate-500">Server Connected: Cloud Sync Active</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}