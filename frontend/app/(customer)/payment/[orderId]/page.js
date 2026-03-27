"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getPaymentByOrderId } from "@/services/paymentService";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/constants";

export default function PaymentPage() {
  const { orderId } = useParams();
  const router = useRouter();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payment", orderId],
    queryFn: () => getPaymentByOrderId(orderId),
    refetchInterval: 5000, // polling tiap 5 detik
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-spin">⏳</div>
          <p className="text-stone-500">Memproses pesanan...</p>
        </div>
      </div>
    );
  }

  const payment = data?.data;
  const order = payment?.order;

  if (!payment || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-stone-500">Pesanan tidak ditemukan</p>
        </div>
      </div>
    );
  }

  const isPaid = payment.status === "paid";
  const isQris = payment.method === "qris";
  const isCancelled = order.status === "cancelled";

  if (isCancelled) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col pt-32">
        <div className="px-6 text-center">
          <div className="w-24 h-24 mx-auto bg-red-100 text-red-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-[-10px_10px_30px_rgba(239,68,68,0.1)]">
            <span className="material-symbols-outlined text-[54px]">cancel</span>
          </div>
          <h1 className="text-2xl font-black text-stone-800 mb-3 tracking-tight">
            Pesanan Dibatalkan
          </h1>
          <p className="text-stone-500 mb-10 max-w-[280px] mx-auto text-sm leading-relaxed">
            Pesanan Anda telah dibatalkan oleh kasir. Silakan buat pesanan baru jika ada perubahan.
          </p>
          
          <button
            onClick={() => router.push(`/menu/${order.table?.tableNumber || ""}`)}
            className="w-full bg-[#1b9a4c] hover:bg-[#15af48] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#1b9a4c]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
            Buat Pesanan Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-10">
      {/* Header */}
      <div className={`${isPaid ? "bg-green-700" : "bg-orange-500"} text-white px-4 pt-10 pb-8 text-center`}>
        <div className="text-5xl mb-3">
          {isPaid ? "✅" : isQris ? "📱" : "💵"}
        </div>
        <h1 className="text-xl font-bold">
          {isPaid ? "Pembayaran Berhasil!" : isQris ? "Menunggu Pembayaran QRIS" : "Bayar ke Kasir"}
        </h1>
        <p className="text-sm opacity-80 mt-1">
          {isPaid
            ? "Pesanan sedang diproses oleh dapur"
            : isQris
            ? "Scan QR Code QRIS di kasir untuk membayar"
            : "Tunjukkan halaman ini ke kasir"}
        </p>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Order Info */}
        <div className="bg-white rounded-xl border border-stone-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-stone-800">Detail Pesanan</h3>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${ORDER_STATUS_COLOR[order.status]}`}>
              {ORDER_STATUS_LABEL[order.status]}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>No. Pesanan</span>
              <span className="font-mono font-semibold text-stone-800">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Meja</span>
              <span className="font-semibold text-stone-800">Meja {order.table?.tableNumber}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Waktu Pesan</span>
              <span className="text-stone-800">{formatDateTime(order.orderedAt)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Pembayaran</span>
              <span className="font-semibold text-stone-800 uppercase">{payment.method}</span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-xl border border-stone-100 p-4">
          <h3 className="font-semibold text-stone-800 mb-3">Item Pesanan</h3>
          <div className="space-y-3">
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
                <div key={item.id} className="flex justify-between items-start text-sm border-b border-stone-100 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                  <div className="flex-1">
                    <p className="font-medium text-stone-800">
                      <span className="font-bold mr-1.5">{item.quantity}x</span> {item.menu?.name}
                    </p>
                    
                    {(sizeDisplay || standardNote) && (
                      <div className="flex flex-col gap-1 mt-1.5 ml-5">
                        {sizeDisplay && (
                          <span className="inline-block w-max px-1.5 py-0.5 rounded bg-stone-100/80 text-[10px] font-bold text-stone-500 uppercase tracking-widest border border-stone-200">
                            {sizeDisplay}
                          </span>
                        )}
                        {standardNote && (
                          <span className="text-xs text-stone-500 italic flex items-start gap-1">
                            <span className="material-symbols-outlined text-[14px]">edit_note</span>
                            {standardNote}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-stone-700 font-medium whitespace-nowrap ml-2">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-stone-100 mt-3 pt-3 flex justify-between font-bold text-stone-800">
            <span>Total</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>

        {/* Payment Status */}
        <div className={`rounded-xl p-4 ${isPaid ? "bg-green-50 border border-green-200" : "bg-orange-50 border border-orange-200"}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isPaid ? "✅" : "⏳"}</span>
            <div>
              <p className={`font-semibold text-sm ${isPaid ? "text-green-800" : "text-orange-800"}`}>
                {isPaid ? "Pembayaran Dikonfirmasi" : "Menunggu Konfirmasi Kasir"}
              </p>
              <p className={`text-xs mt-0.5 ${isPaid ? "text-green-600" : "text-orange-600"}`}>
                {isPaid
                  ? `Dibayar pada ${formatDateTime(payment.paidAt)}`
                  : "Halaman ini akan otomatis update saat kasir mengkonfirmasi"}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        {isPaid ? (
          <div className="text-center py-4">
            <p className="text-stone-500 text-sm">
              Terima kasih! Pesananmu sedang disiapkan ☕
            </p>
            <button
              onClick={() => router.push(`/menu/${order.table?.tableNumber}`)}
              className="mt-4 text-green-700 font-medium text-sm underline"
            >
              Pesan lagi
            </button>
          </div>
        ) : (
          <button
            onClick={() => refetch()}
            className="w-full border border-stone-300 text-stone-600 py-3 rounded-xl text-sm font-medium hover:bg-stone-100"
          >
            🔄 Refresh Status
          </button>
        )}
      </div>
    </div>
  );
}