"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useCartStore from "@/store/cartStore";
import { createOrder } from "@/services/orderService";
import { formatCurrency } from "@/lib/utils";

export default function OrderPage() {
  const { tableNumber } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    items,
    tableId,
    paymentMethod,
    setPaymentMethod,
    updateQuantity,
    removeItem,
    getTotalItems,
    getTotalPrice,
    clearCart,
  } = useCartStore();

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setError("");

    try {
      const orderData = {
        tableId,
        paymentMethod,
        items: items.map((item) => ({
          menuId: item.menuId,
          quantity: item.quantity,
          size: item.size,
          temperature: item.temperature,
          sweetness: item.sweetness,
          spiciness: item.spiciness,
          toppings: item.toppings,
          specialNote: item.specialNote,
        })),
      };

      const res = await createOrder(orderData);
      clearCart();
      router.push(`/payment/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal membuat pesanan");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🛒</div>
          <h2 className="text-lg font-bold text-stone-800">Keranjang kosong</h2>
          <p className="text-stone-500 text-sm mt-2 mb-6">
            Belum ada menu yang dipilih
          </p>
          <button
            onClick={() => router.push(`/menu/${tableNumber}`)}
            className="bg-green-700 text-white px-6 py-3 rounded-xl font-medium"
          >
            Kembali ke Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-40">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.push(`/menu/${tableNumber}`)}
          className="text-stone-500 hover:text-stone-700 text-xl"
        >
          ←
        </button>
        <div>
          <h1 className="font-bold text-stone-800">Pesanan Kamu</h1>
          <p className="text-xs text-stone-500">Meja {tableNumber} · {totalItems} item</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Order Items */}
        {items.map((item, index) => (
          <div key={index} className="bg-white rounded-xl border border-stone-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-stone-800 text-sm">{item.name}</h3>
                {/* Variasi */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.size && (
                    <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full capitalize">
                      {item.size}
                    </span>
                  )}
                  {item.temperature && (
                    <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full capitalize">
                      {item.temperature}
                    </span>
                  )}
                  {item.sweetness && (
                    <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full capitalize">
                      {item.sweetness} sweet
                    </span>
                  )}
                </div>
                {item.specialNote && (
                  <p className="text-xs text-stone-400 mt-1 italic">
                    📝 {item.specialNote}
                  </p>
                )}
                <p className="text-green-700 font-bold text-sm mt-2">
                  {formatCurrency(item.subtotal)}
                </p>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(index, item.quantity - 1)}
                  className="w-8 h-8 rounded-full border border-stone-300 text-stone-600 flex items-center justify-center hover:bg-stone-100"
                >
                  −
                </button>
                <span className="text-sm font-semibold w-4 text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(index, item.quantity + 1)}
                  className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center hover:bg-green-800"
                >
                  +
                </button>
              </div>
            </div>

            {/* Remove */}
            <button
              onClick={() => removeItem(index)}
              className="mt-3 text-xs text-red-400 hover:text-red-600"
            >
              🗑️ Hapus item ini
            </button>
          </div>
        ))}

        {/* Payment Method */}
        <div className="bg-white rounded-xl border border-stone-100 p-4">
          <h3 className="font-semibold text-stone-800 mb-3">Metode Pembayaran</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "qris", label: "QRIS", icon: "📱", desc: "Bayar via QR Code" },
              { value: "cash", label: "Cash", icon: "💵", desc: "Bayar tunai ke kasir" },
            ].map((method) => (
              <button
                key={method.value}
                onClick={() => setPaymentMethod(method.value)}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${
                  paymentMethod === method.value
                    ? "border-green-600 bg-green-50"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="text-xl mb-1">{method.icon}</div>
                <p className="font-semibold text-sm text-stone-800">{method.label}</p>
                <p className="text-xs text-stone-500">{method.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl border border-stone-100 p-4">
          <h3 className="font-semibold text-stone-800 mb-3">Ringkasan</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-stone-600">
              <span>Subtotal ({totalItems} item)</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-sm text-stone-600">
              <span>Biaya layanan</span>
              <span className="text-green-600">Gratis</span>
            </div>
            <div className="border-t border-stone-100 pt-2 flex justify-between font-bold text-stone-800">
              <span>Total</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {/* Checkout Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-stone-200">
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white py-4 rounded-xl font-semibold flex items-center justify-between px-5 transition-colors"
        >
          <span>Pesan Sekarang</span>
          <span>{loading ? "Memproses..." : formatCurrency(totalPrice)}</span>
        </button>
      </div>
    </div>
  );
}