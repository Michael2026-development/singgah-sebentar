"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useRequireAuth from "@/hooks/useRequireAuth";
import { getOrders, updateOrderStatus } from "@/services/orderService";
import { connectSocket, disconnectSocket } from "@/lib/socket";

const getTimeDifference = (dateString, format = 'long') => {
  if (!dateString) return "0m";
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / 60000);
  if (format === 'short') return `${diffInMinutes}m`;
  return `${diffInMinutes} mnt yang lalu`;
};

const getItemDetailStr = (item) => {
  const noteVal = item.specialNote || "";
  const isSizeNote = noteVal.startsWith("Size: ");
  let sizeDisplay = null;
  let standardNote = noteVal;

  if (isSizeNote) {
    const parts = noteVal.split(" | ");
    sizeDisplay = parts[0].replace("Size: ", "").trim();
    standardNote = parts[1] || "";
  }
  
  if (sizeDisplay && standardNote) return `${sizeDisplay}, ${standardNote}`;
  if (sizeDisplay) return sizeDisplay;
  if (standardNote) return standardNote;
  return "";
};

export default function DapurDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useRequireAuth(["dapur", "owner", "manager"]);
  const [notification, setNotification] = useState(null);
  const [, setTick] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [selesaiOrder, setSelesaiOrder] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    const socket = connectSocket(user.role);

    const checkStatus = () => setIsConnected(navigator.onLine && socket.connected);
    const setOffline = () => setIsConnected(false);
    
    // Window native network listeners for instant UI fallback
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', setOffline);

    socket.on("connect", checkStatus);
    socket.on("disconnect", setOffline);
    socket.on("connect_error", setOffline);
    
    // Fallback if already connected synchronously
    checkStatus();

    socket.on("order_confirmed", (data) => {
      try { new Audio("/sounds/new-order.mp3").play().catch(() => {}); } catch {}
      setNotification({ message: data.message });
      setTimeout(() => setNotification(null), 5000);
      queryClient.invalidateQueries({ queryKey: ["dapur-orders"] });
    });
    socket.on("order_status_update", () => {
      queryClient.invalidateQueries({ queryKey: ["dapur-orders"] });
    });
    return () => {
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', setOffline);
      socket.off("connect", checkStatus);
      socket.off("disconnect", setOffline);
      socket.off("connect_error", setOffline);
      socket.off("order_confirmed");
      socket.off("order_status_update");
      disconnectSocket();
    };
  }, [user]);

  const { data: confirmedData } = useQuery({
    queryKey: ["dapur-orders", "confirmed"],
    queryFn: () => getOrders({ status: "confirmed" }),
    refetchInterval: 10000,
    enabled: !!user,
  });

  const { data: preparingData } = useQuery({
    queryKey: ["dapur-orders", "preparing"],
    queryFn: () => getOrders({ status: "preparing" }),
    refetchInterval: 10000,
    enabled: !!user,
  });

  const confirmedOrders = confirmedData?.data || [];
  const preparingOrders = preparingData?.data || [];

  const [loadingId, setLoadingId] = useState(null);
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateOrderStatus(id, status),
    onSuccess: () => {
      setLoadingId(null);
      queryClient.invalidateQueries({ queryKey: ["dapur-orders"] });
    },
    onError: () => setLoadingId(null),
  });

  const handleLogout = () => {
    const { logout } = require("@/store/authStore").default.getState();
    logout();
    disconnectSocket();
    router.push("/login");
  };

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark">
      <div className="text-center font-display">
        <span className="material-symbols-outlined text-4xl text-primary animate-bounce">restaurant_menu</span>
        <p className="text-slate-400 mt-2">Memuat Sistem Dapur...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-background-dark text-slate-100 h-screen overflow-hidden flex flex-col font-display dark">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2D3133; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3D4143; }
      `}</style>

      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-surface-dark px-6 sticky top-0 z-50 h-20 shrink-0">
        <div className="flex items-center gap-4">
          <img src="/images/1000499734.png" alt="Singgah Sebentar" className="h-24 w-auto object-contain cursor-pointer" onClick={() => router.push('/dapur')} />
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              {isConnected ? (
                <span className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mb-0.5 flex items-center gap-1.5" title="Terhubung ke Server (Real-time Aktif)">
                  <span className="size-1.5 bg-primary rounded-full animate-pulse"></span>
                  Online
                </span>
              ) : (
                <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mb-0.5 flex items-center gap-1.5" title="Terputus dari Server">
                  <span className="size-1.5 bg-red-400 rounded-full"></span>
                  Offline
                </span>
              )}
              <span className="text-white text-sm font-medium">{user.name}</span>
            </div>
            <div className="bg-surface-dark border-2 border-white/10 flex items-center justify-center rounded-full size-10 overflow-hidden text-slate-500">
               <span className="material-symbols-outlined">person</span>
            </div>
          </div>
          <button onClick={handleLogout} className="text-red-400 hover:text-red-300 transition-colors uppercase font-bold text-xs tracking-widest px-2 relative z-50">
            Keluar
          </button>
        </div>
      </header>

      {/* Notifications */}
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-amber-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined">campaign</span>
          <p className="text-sm font-bold tracking-wide">{notification.message}</p>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Column 1: Perlu Diproses (New) */}
        <section className="flex-1 flex flex-col border-r border-white/10">
          <div className="p-4 bg-surface-dark/50 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">pending_actions</span>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Perlu Diproses</h2>
            </div>
            <span className="bg-amber-400/10 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-400/20">
              {confirmedOrders.length} Pesanan
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {confirmedOrders.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-30">check_circle</span>
                <p className="text-sm">Tidak ada pesanan baru</p>
              </div>
            ) : (
              confirmedOrders.map((order) => (
                <div key={order.id} className="relative bg-[#0F151B] border border-white/5 rounded-2xl p-5 shadow-xl hover:border-amber-400/30 hover:shadow-[0_0_20px_rgba(251,191,36,0.1)] transition-all group overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400/10 via-amber-400/40 to-amber-400/10"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                         Meja {order.table?.tableNumber}
                         {order.table?.zone && (
                           <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-widest border ${
                             order.table.zone.toLowerCase() === 'vip' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                             order.table.zone.toLowerCase() === 'outdoor' ? 'bg-primary/10 text-primary border-primary/20' :
                             'bg-blue-500/10 text-blue-400 border-blue-500/20'
                           }`}>
                             {order.table.zone}
                           </span>
                         )}
                      </h3>
                      <p className="text-sm text-slate-400">Order ID: <span className="text-slate-200 font-medium">#{order.orderNumber}</span></p>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-400 font-medium bg-amber-400/5 px-2.5 py-1.5 rounded-lg border border-amber-400/10">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span className="text-xs font-bold">{getTimeDifference(order.orderedAt, 'long')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4 opacity-70">
                     <div className="h-px w-full border-t border-dashed border-white/20"></div>
                     <span className="material-symbols-outlined text-[14px] text-white/40">receipt</span>
                     <div className="h-px w-full border-t border-dashed border-white/20"></div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {order.orderItems?.map((item) => {
                      const noteStr = getItemDetailStr(item);
                      return (
                        <div key={item.id} className="flex flex-col p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors">
                          <span className="text-white font-bold leading-tight">
                            <span className="text-amber-400 mr-2 text-sm">{item.quantity}x</span>
                            {item.menu?.name}
                          </span>
                          {noteStr && (
                             <div className="mt-2 flex flex-wrap gap-1">
                                <span className="bg-amber-400/10 text-amber-500/90 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md border border-amber-400/20 inline-flex items-center gap-1 leading-none">
                                  <span className="material-symbols-outlined text-[12px]">edit_note</span>
                                  {noteStr}
                                </span>
                             </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    disabled={loadingId === order.id}
                    onClick={() => { setLoadingId(order.id); statusMutation.mutate({ id: order.id, status: "preparing" }); }}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-background-dark disabled:opacity-50 font-black tracking-wide py-3.5 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                    <span className="material-symbols-outlined">outdoor_grill</span>
                    {loadingId === order.id ? "Memproses..." : "Mulai Masak"}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Column 2: Sedang Diproses (In Progress) */}
        <section className="flex-1 flex flex-col bg-background-dark/50">
          <div className="p-4 bg-surface-dark/50 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">restaurant_menu</span>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Sedang Diproses</h2>
            </div>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full border border-primary/20">
              {preparingOrders.length} Aktif
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {preparingOrders.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-30">outdoor_grill</span>
                <p className="text-sm">Tidak ada pesanan dalam proses</p>
              </div>
            ) : (
              preparingOrders.map((order, idx) => (
                <div key={order.id} className={`bg-[#0F151B] border-2 border-primary/50 rounded-2xl p-5 relative overflow-hidden transition-all ${idx === 0 ? 'shadow-[0_0_25px_rgba(29,201,86,0.15)] bg-gradient-to-b from-[#0F151B] to-primary/5' : 'shadow-xl hover:border-primary'}`}>
                  {idx === 0 && (
                    <div className="absolute top-0 left-0 w-full flex justify-center">
                       <span className="bg-primary text-background-dark text-[10px] font-black uppercase px-6 py-0.5 rounded-b-lg tracking-widest shadow-[0_4px_10px_rgba(29,201,86,0.4)]">
                         Prioritas Utama
                       </span>
                    </div>
                  )}
                  
                  <div className={`flex justify-between items-start mb-4 ${idx === 0 ? 'mt-4' : ''}`}>
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                         Meja {order.table?.tableNumber}
                         {order.table?.zone && (
                           <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-widest border ${
                             order.table.zone.toLowerCase() === 'vip' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                             order.table.zone.toLowerCase() === 'outdoor' ? 'bg-primary/10 text-primary border-primary/20' :
                             'bg-blue-500/10 text-blue-400 border-blue-500/20'
                           }`}>
                             {order.table.zone}
                           </span>
                         )}
                      </h3>
                      <p className="text-sm text-slate-400">Order ID: <span className="text-slate-200 font-medium">#{order.orderNumber}</span></p>
                    </div>
                    <div className="flex items-center gap-1.5 text-primary font-medium bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/20">
                      <span className="material-symbols-outlined text-sm animate-pulse">outdoor_grill</span>
                      <span className="text-xs font-bold">Terproses ({getTimeDifference(order.orderedAt, 'short')})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 opacity-70">
                     <div className="h-px w-full border-t border-dashed border-primary/30"></div>
                     <span className="material-symbols-outlined text-[14px] text-primary/50 animate-pulse">local_fire_department</span>
                     <div className="h-px w-full border-t border-dashed border-primary/30"></div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {order.orderItems?.map(item => {
                       const detailStr = getItemDetailStr(item);
                       return (
                        <div key={item.id} className="flex flex-col p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors relative group">
                          <span className="text-white font-bold leading-tight">
                            <span className="text-primary mr-2 text-sm">{item.quantity}x</span>
                            {item.menu?.name}
                          </span>
                          {detailStr && (
                             <div className="mt-2 flex flex-wrap gap-1">
                                <span className="bg-primary/10 text-primary/90 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md border border-primary/20 inline-flex items-center gap-1 leading-none">
                                  <span className="material-symbols-outlined text-[12px]">edit_note</span>
                                  {detailStr}
                                </span>
                             </div>
                          )}
                        </div>
                       );
                    })}
                  </div>

                  <button  
                    disabled={loadingId === order.id}
                    onClick={() => setSelesaiOrder(order)}
                    className="w-full bg-slate-800 hover:bg-primary hover:text-background-dark disabled:opacity-50 text-primary border border-primary/30 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
                    <span className="material-symbols-outlined">done_all</span>
                    Selesai
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

      </main>

      {/* Bottom Status Bar */}
      <footer className="bg-surface-dark border-t border-white/10 px-6 py-3 flex items-center justify-between text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-auto">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="size-2 bg-primary rounded-full"></span> Sistem Online
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 bg-amber-400 rounded-full"></span> Koneksi Database: Ready
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </footer>

      {/* KITCHEN SELESAI MODAL */}
      {selesaiOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#121A21] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden max-h-[95vh]">
            <div className="p-6 border-b border-white/10 bg-[#0B1218] shrink-0 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
              <h2 className="text-xl font-bold text-white mb-3">
                Selesaikan Pesanan
              </h2>
              <div className="flex items-center justify-center gap-3">
                <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">ORDER</span>
                  <span className="text-xs font-black text-slate-200 uppercase tracking-widest">#{selesaiOrder.orderNumber}</span>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {/* Table Info */}
              <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">table_restaurant</span>
                {selesaiOrder.table ? (
                  <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-white">Meja {selesaiOrder.table.tableNumber}</span>
                     <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-widest border ${
                       selesaiOrder.table.zone.toLowerCase() === 'vip' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                       selesaiOrder.table.zone.toLowerCase() === 'outdoor' ? 'bg-primary/10 text-primary border-primary/20' :
                       'bg-blue-500/10 text-blue-400 border-blue-500/20'
                     }`}>
                       {selesaiOrder.table.zone}
                     </span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-white">Takeaway / Kasir</span>
                )}
              </div>

              {/* Items List */}
              <div className="bg-black/10 rounded-xl border border-white/5 overflow-hidden flex flex-col">
                <div className="p-2.5 border-b border-white/5 bg-white/5">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                     <span className="material-symbols-outlined text-sm text-slate-400">receipt_long</span>
                     Daftar Pesanan ({selesaiOrder.orderItems?.reduce((ac, it) => ac + it.quantity, 0)})
                  </h3>
                </div>
                <ul className="max-h-[35vh] overflow-y-auto custom-scrollbar p-3 space-y-2">
                  {selesaiOrder.orderItems?.map((item, idx) => {
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
                      <li key={idx} className="flex flex-col text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <span className="text-slate-300 font-medium leading-snug">
                            <span className="font-bold text-white mr-1.5">{item.quantity}x</span>
                            {item.menu?.name}
                          </span>
                        </div>
                        {(sizeDisplay || standardNote) && (
                          <div className="ml-5 mt-1 flex flex-col gap-0.5">
                            {sizeDisplay && (
                              <span className="inline-block w-max px-1.5 py-px rounded bg-white/5 text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-white/10">
                                {sizeDisplay}
                              </span>
                            )}
                            {standardNote && (
                              <span className="text-[10px] text-yellow-500/80 italic flex items-start gap-1">
                                <span className="material-symbols-outlined text-[12px]">edit_note</span>
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
            </div>

            <div className="p-4 border-t border-white/10 flex items-center gap-3 bg-[#0B1218]">
              <button 
                onClick={() => setSelesaiOrder(null)}
                className="flex-[0.4] py-3.5 px-4 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-white/5"
              >
                Batal
              </button>
              <button 
                disabled={loadingId === selesaiOrder.id}
                onClick={() => {
                   setLoadingId(selesaiOrder.id);
                   statusMutation.mutate({ id: selesaiOrder.id, status: "delivered" });
                   setSelesaiOrder(null);
                   window.print();
                }}
                className="flex-1 py-3.5 px-4 rounded-xl bg-primary text-background-dark text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(29,201,86,0.3)]"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span className="whitespace-nowrap">Selesai & Cetak</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}