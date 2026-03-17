"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useRequireAuth from "@/hooks/useRequireAuth";
import { getOrders, updateOrderStatus } from "@/services/orderService";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { formatDateTime } from "@/lib/utils";

export default function DapurDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useRequireAuth(["dapur", "owner", "manager"]);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!user) return;
    const socket = connectSocket(user.role);
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
  const totalActive = confirmedOrders.length + preparingOrders.length;

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
    <div className="min-h-screen flex items-center justify-center bg-stone-900">
      <div className="text-center"><div className="text-3xl mb-2">🍳</div>
      <p className="text-stone-400 text-sm">Memuat...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-900 text-white">
      <nav className="bg-stone-800 border-b border-stone-700 px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍳</span>
            <div>
              <h1 className="font-bold text-sm">Dashboard Dapur</h1>
              <p className="text-xs text-stone-400">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalActive > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {totalActive} aktif
              </span>
            )}
            <button onClick={handleLogout} className="text-xs text-red-400 font-medium">Keluar</button>
          </div>
        </div>
      </nav>

      {notification && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-orange-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
          <span className="text-xl">🔔</span>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      <div className="p-4 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚡</span>
            <h2 className="font-bold text-orange-400">Perlu Diproses ({confirmedOrders.length})</h2>
          </div>
          {confirmedOrders.length === 0 ? (
            <div className="bg-stone-800 rounded-xl p-6 text-center">
              <p className="text-stone-500 text-sm">Tidak ada pesanan baru</p>
            </div>
          ) : (
            <div className="space-y-3">
              {confirmedOrders.map((order) => (
                <OrderCard key={order.id} order={order}
                  onStart={() => { setLoadingId(order.id); statusMutation.mutate({ id: order.id, status: "preparing" }); }}
                  isPending={loadingId === order.id}
                  actionLabel="🍳 Mulai Proses"
                  actionColor="bg-orange-500 hover:bg-orange-600" />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔥</span>
            <h2 className="font-bold text-yellow-400">Sedang Diproses ({preparingOrders.length})</h2>
          </div>
          {preparingOrders.length === 0 ? (
            <div className="bg-stone-800 rounded-xl p-6 text-center">
              <p className="text-stone-500 text-sm">Tidak ada pesanan dalam proses</p>
            </div>
          ) : (
            <div className="space-y-3">
              {preparingOrders.map((order) => (
                <OrderCard key={order.id} order={order}
                  onStart={() => { setLoadingId(order.id); statusMutation.mutate({ id: order.id, status: "delivered" }); }}
                  isPending={loadingId === order.id}
                  actionLabel="✅ Sudah Diantarkan"
                  actionColor="bg-green-600 hover:bg-green-700" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onStart, isPending, actionLabel, actionColor }) {
  return (
    <div className="bg-stone-800 rounded-xl border border-stone-700 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-sm">{order.orderNumber}</p>
          <p className="text-xs text-stone-400 mt-0.5">🪑 Meja {order.table?.tableNumber} · {order.table?.zone}</p>
        </div>
        <p className="text-xs text-stone-500">{formatDateTime(order.orderedAt)}</p>
      </div>
      <div className="bg-stone-900 rounded-lg p-3 mb-3 space-y-3">
        {order.orderItems?.map((item) => {
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
            <div key={item.id} className="border-b border-stone-800 pb-2 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <span className="bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                  {item.quantity}
                </span>
                <span className="font-semibold text-sm">{item.menu?.name}</span>
              </div>
              {(sizeDisplay || standardNote) && (
                <div className="ml-8 mt-1.5 flex flex-col gap-1.5">
                  {sizeDisplay && (
                    <span className="inline-block w-max px-2 py-0.5 rounded bg-stone-800 text-[10px] font-bold text-stone-300 uppercase tracking-widest border border-stone-700">
                      {sizeDisplay}
                    </span>
                  )}
                  {standardNote && (
                    <span className="text-xs text-orange-400 italic flex items-start gap-1">
                      <span className="material-symbols-outlined text-[14px]">edit_note</span>
                      {standardNote}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={onStart} disabled={isPending}
        className={`w-full ${actionColor} disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors`}>
        {isPending ? "Memproses..." : actionLabel}
      </button>
    </div>
  );
}