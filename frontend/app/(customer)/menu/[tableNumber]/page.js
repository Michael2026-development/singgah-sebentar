"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getTableByNumber } from "@/services/tableService";
import { getMenus } from "@/services/menuService";
import { getActiveOrdersByTable, createOrder } from "@/services/orderService";
import useCartStore from "@/store/cartStore";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { getSocket } from "@/lib/socket";
import { SOCKET_URL } from "@/lib/constants";
import { io } from "socket.io-client";

export default function MenuPage() {
  const { tableNumber } = useParams();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("semua");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Advanced Flow States
  const [kitchenNote, setKitchenNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Store selections before adding to cart: menuId -> { size }
  const [selections, setSelections] = useState({});

  // Real-time tracking state
  const [activeOrder, setActiveOrder] = useState(null);
  const [isCheckingOrders, setIsCheckingOrders] = useState(true);

  const { items, addItem, updateQuantity, updateNote, removeItem, setTable, getTotalItems, getTotalPrice, clearCart, paymentMethod, setPaymentMethod } = useCartStore();

  // Fetch table & menus
  const { data: tableData } = useQuery({ queryKey: ["table", tableNumber], queryFn: () => getTableByNumber(tableNumber) });
  const { data: menuData, isLoading: isMenuLoading } = useQuery({ queryKey: ["menus"], queryFn: () => getMenus() });

  useEffect(() => {
    if (tableData?.data) {
      setTable(tableData.data.id, tableData.data.tableNumber);
    }
  }, [tableData, setTable]);

  // Check active orders
  useEffect(() => {
    if (!tableData?.data?.id) return;
    const checkActiveOrders = async () => {
      try {
        const res = await getActiveOrdersByTable(tableData.data.id);
        const orders = res.data || [];
        const active = orders.find((o) => o.status !== "delivered" && o.status !== "cancelled");
        if (active) setActiveOrder(active);
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingOrders(false);
      }
    };
    checkActiveOrders();
  }, [tableData?.data?.id]);

  // Socket
  useEffect(() => {
    if (!tableData?.data?.id) return;
    const socket = io(SOCKET_URL, { autoConnect: true });
    socket.on("connect", () => socket.emit("join_table", tableData.data.id));
    socket.on("customer_order_update", (data) => {
      const updatedOrder = data.order;
      if (updatedOrder.status === "delivered" || updatedOrder.status === "cancelled") {
        setActiveOrder(null);
      } else {
        setActiveOrder(updatedOrder);
      }
    });
    return () => socket.disconnect();
  }, [tableData?.data?.id]);

  const menus = menuData?.data || [];
  const table = tableData?.data;
  const hasActiveOrder = !!activeOrder;

  // Grouping categories
  const categories = [
    { slug: "semua", name: "All", icon: "list_alt" },
    ...Object.values(menus.reduce((acc, menu) => {
      if (!acc[menu.category.slug]) acc[menu.category.slug] = menu.category;
      return acc;
    }, {}))
  ];

  const filteredMenus = menus.filter(m => {
    const matchCat = activeCategory === "semua" || m.category.slug === activeCategory;
    const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleSizeSelect = (menuId, size) => {
    setSelections(prev => ({ ...prev, [menuId]: size }));
  };

  const handleAddToCart = (menu) => {
    if (hasActiveOrder) return;
    
    // Check if the item actually has sizes configured.
    const desc = menu.description || "";
    const sizeMatch = desc.match(/\|SIZES:(.*?)\|/);
    let sizes = [];
    if (sizeMatch) {
      sizes = sizeMatch[1].split(",").filter(Boolean);
    } else {
      const isBeverage = ["kopi", "teh", "minuman-segar"].includes(menu.category?.slug?.toLowerCase());
      sizes = isBeverage ? ["tall", "grande", "venti", "trenta"] : [];
    }

    if (sizes.length > 0) {
      const selectedSizeLabel = selections[menu.id] || sizes[0];
      addItem(menu, { specialNote: `Size: ${selectedSizeLabel.toUpperCase()}` });
    } else {
      addItem(menu); // Only beverages/items with sizes get the note
    }
  };

  // Calculations
  const subtotal = getTotalPrice();
  const serviceTax = subtotal * 0.06;
  const totalAmount = subtotal + serviceTax;

  const handleCheckout = async () => {
    if (items.length === 0 || !table) return;
    setLoading(true);
    setError("");

    try {
      // Send items exactly as they are without global note manipulation
      const mappedItems = items.map((item) => ({
        menuId: item.menuId,
        quantity: item.quantity,
        specialNote: item.specialNote,
      }));

      // Override totalAmount backend recalculation logic? The backend currently recalculates. 
      // We will let the backend handle order creation normally. Note: if backend doesn't calculate tax natively,
      // it might mismatch. We will need to update the backend controller next to apply tax.
      
      const orderData = {
        tableId: table.id,
        paymentMethod,
        items: mappedItems,
        totalAmountOverride: totalAmount, // Pass to backend if we want to override
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

  // Time tracking and Dark Mode Force
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    
    // Force dark mode on customer POS
    document.documentElement.classList.add("dark");
    
    return () => {
      clearInterval(timer);
      document.documentElement.classList.remove("dark");
    };
  }, []);

  const categoryIconMap = {
    "semua": "dashboard",
    "kopi": "coffee",
    "non-kopi": "local_cafe",
    "minuman-segar": "local_bar",
    "makanan-berat": "restaurant",
    "snack-cemilan": "tapas",
    "dessert": "cake",
  };

  const fallbackImages = {
    // Specific, stable photo IDs from Unsplash rather than randomized query returns
    "kopi": "https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&q=80&w=400&h=400", // Classic latte art
    "non-kopi": "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&q=80&w=400&h=400", // Matcha/Tea
    "minuman-segar": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400&h=400", // Mocktail/Juice
    "makanan-berat": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400&h=400", // Main dish
    "snack-cemilan": "https://images.unsplash.com/photo-1599490659213-e2b9527bd08f?auto=format&fit=crop&q=80&w=400&h=400", // Fries/Snack
    "dessert": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=400&h=400", // Cake
  };
  const defaultFallback = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400&h=400";

  return (
    <div className="bg-[#f6f8f6] dark:bg-[#0B1218] text-slate-900 dark:text-slate-100 font-display selection:bg-[#1dc956]/30 h-screen w-full overflow-hidden flex">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f6f8f6] dark:bg-[#0B1218]">
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between border-b border-slate-200 dark:border-white/5 px-6">
          <div className="flex items-center mr-8">
            <img src="/images/1000499734.png" alt="Singgah Sebentar" className="h-24 w-auto object-contain" />
          </div>
          
          <div className="relative w-96 hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">search</span>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-[#1dc956]/50 placeholder:text-slate-500 text-slate-900 dark:text-white" 
              placeholder="Search menu items..." 
              type="text"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <button className="size-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-white/10 mx-2 hidden sm:block"></div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {time.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-sm font-bold">
                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
          </div>
        </header>

        {/* Active Order Banner */}
        {activeOrder && (
          <div className="px-8 mt-6">
            <div className="bg-[#1dc956]/10 border border-[#1dc956]/20 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-[#1dc956] text-[#0B1218] rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined animate-bounce">room_service</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1dc956]">Pesanan Sedang Diproses (Order #{activeOrder.orderNumber})</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Harap tunggu kasir atau dapur menyelesaikan pesanan Anda sebelum memesan kembali.</p>
                  </div>
                </div>
                <div className="px-4 py-1 rounded-full bg-white/10 border border-[#1dc956]/30 text-[#1dc956] text-xs font-bold uppercase tracking-widest">
                  {activeOrder.status}
                </div>
            </div>
          </div>
        )}

        {/* Category Bar */}
        <div className="px-8 py-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
            {categories.map((cat, i) => (
               <button 
                  key={cat.slug}
                  onClick={() => setActiveCategory(cat.slug)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                    activeCategory === cat.slug 
                    ? "bg-[#1dc956] text-[#0B1218] font-bold" 
                    : "bg-slate-100 dark:bg-white/5 hover:bg-[#1dc956]/10 dark:hover:bg-[#1dc956]/20 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{categoryIconMap[cat.slug] || "restaurant"}</span>
                  {cat.name.replace(/^[^\w\s]+\s*/, '') /* Remove leading emoji if present in name */}
               </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 ${hasActiveOrder ? "opacity-50 pointer-events-none" : ""}`}>
          {isMenuLoading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {[...Array(8)].map((_, idx) => <div key={idx} className="h-[400px] bg-slate-200 dark:bg-white/5 animate-pulse rounded-2xl" />)}
             </div>
          ) : filteredMenus.length === 0 ? (
             <div className="text-center py-20 text-slate-500">Tidak ada menu yang sesuai.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMenus.map((menu) => {
                const desc = menu.description || "";
                const sizeMatch = desc.match(/\|SIZES:(.*?)\|/);
                let sizes = [];
                if (sizeMatch) {
                  sizes = sizeMatch[1].split(",").filter(Boolean);
                } else {
                  // Fallback for older entries if needed, but per rule: "only show configured"
                  // we will keep it empty if not configured.
                  const isBeverage = ["kopi", "teh", "minuman-segar"].includes(menu.category?.slug?.toLowerCase());
                  sizes = isBeverage ? ["tall", "grande", "venti", "trenta"] : [];
                }
                const isBeverage = sizes.length > 0;
                
                // Set default size to the first available if not selected
                const currentSize = selections[menu.id] || (sizes.length > 0 ? sizes[0] : null);

                return (
                  <div key={menu.id} className="group relative bg-white dark:bg-[#161F27] rounded-2xl p-4 border border-slate-200 dark:border-white/5 hover:border-[#1dc956]/40 transition-all shadow-sm flex flex-col h-full min-h-[400px]">
                    <div className="flex-1 flex flex-col">
                      <div className="aspect-square rounded-xl bg-slate-100 dark:bg-white/5 mb-4 overflow-hidden relative">
                        <img 
                          alt={menu.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          src={getImageUrl(menu.imageUrl) || fallbackImages[menu.category?.slug] || defaultFallback}
                          onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = fallbackImages[menu.category?.slug] || defaultFallback;
                          }}
                        />
                        {!menu.isAvailable && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                            <span className="font-bold text-white tracking-widest uppercase">Kosong</span>
                          </div>
                        )}
                        {menu.isSeasonal && menu.isAvailable && (
                           <div className="absolute top-2 right-2 bg-[#0B1218]/80 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-[#1dc956] border border-[#1dc956]/20">POPULAR</div>
                        )}
                      </div>
                      <h3 className="font-bold text-lg mb-1">{menu.name}</h3>
                      <p className="text-[#1dc956] font-bold text-base mb-4">{formatCurrency(menu.basePrice)}</p>
                    </div>

                    {isBeverage && menu.isAvailable && sizes.length > 0 && (
                      <div className="mt-auto mb-6">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {sizes.map((sz, idx) => {
                            const isSelected = currentSize === sz;
                            return (
                              <div key={sz} onClick={() => handleSizeSelect(menu.id, sz)} className="flex flex-col items-center gap-2 cursor-pointer group/size w-1/5 min-w-[3.5rem]">
                                <div className={`size-10 rounded-full flex items-center justify-center transition-colors shadow-sm ${isSelected ? "bg-[#1dc956] text-[#0B1218]" : "bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10"}`}>
                                  <span className={`material-symbols-outlined text-lg`}>coffee</span>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-slate-800 dark:text-slate-200" : "text-slate-500"}`}>{sz}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={() => handleAddToCart(menu)}
                      disabled={!menu.isAvailable || hasActiveOrder}
                      className="w-full py-2.5 mt-auto bg-slate-100 dark:bg-white/5 disabled:opacity-50 dark:hover:bg-[#1dc956] hover:bg-[#1dc956] hover:text-[#0B1218] text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:hover:bg-slate-100 disabled:dark:hover:bg-white/5 disabled:hover:text-inherit"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      Add to Dish
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar (Order Summary/Cart) */}
      <aside className="w-96 flex-shrink-0 flex flex-col bg-white dark:bg-[#0E161E] border-l border-slate-200 dark:border-white/5 z-20">
        <div className="p-6 border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">Meja {table?.tableNumber || "-"}</h2>
            <span className="px-2 py-1 rounded-lg bg-[#1dc956]/10 text-[#1dc956] text-[10px] font-bold tracking-wider uppercase">
              {table?.zone || "DINE IN"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Order Booking • {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
               <span className="material-symbols-outlined text-5xl mb-3">shopping_cart</span>
               <p className="font-medium text-sm">Pesanan masih kosong</p>
            </div>
          ) : (
            <>
              {items.map((item, index) => {
                // Parse out size label manually from specialNote if we stored it there
                let noteVal = item.specialNote || "";
                let isSizeNote = noteVal.startsWith("Size: ");
                
                let sizeDisplay = null;
                let standardNote = noteVal;

                if (isSizeNote) {
                  // We stored it as "Size: X" or "Size: X | Y"
                  const parts = noteVal.split(" | ");
                  sizeDisplay = parts[0].replace("Size: ", "").trim();
                  standardNote = parts[1] || "";
                }

                return (
                  <div key={index} className="flex items-start gap-4">
                    <div className="size-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
                      <img 
                        alt={item.name} 
                        className="w-full h-full object-cover" 
                        src={getImageUrl(item.imageUrl) || fallbackImages[item.category?.slug] || defaultFallback}
                        onError={(e) => {
                          e.target.onerror = null; 
                          e.target.src = fallbackImages[item.category?.slug] || defaultFallback;
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-tight">{item.name}</h4>
                      {sizeDisplay && (
                        <div className="flex items-center gap-2 mt-1 mb-1">
                          <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border border-black/5 dark:border-white/5">{sizeDisplay}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateQuantity(index, item.quantity - 1)} className="size-6 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-[#1dc956]/20 transition-colors text-slate-600 dark:text-slate-300">
                            <span className="material-symbols-outlined text-sm">remove</span>
                          </button>
                          <span className="text-sm font-bold dark:text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(index, item.quantity + 1)} className="size-6 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-[#1dc956]/20 transition-colors text-slate-600 dark:text-slate-300">
                            <span className="material-symbols-outlined text-sm">add</span>
                          </button>
                        </div>
                        <p className="font-bold text-sm text-[#1dc956]">{formatCurrency(item.subtotal)}</p>
                      </div>

                      {/* Individual Note Input */}
                      <div className="mt-3 relative group">
                        <span className="material-symbols-outlined absolute left-2 top-2 text-slate-400 group-focus-within:text-[#1dc956] transition-colors text-sm">edit_note</span>
                        <input
                           type="text"
                           placeholder="Add note (e.g. less sugar)..."
                           value={standardNote}
                           onChange={(e) => {
                             let newNote = e.target.value;
                             if (isSizeNote && sizeDisplay) {
                               newNote = newNote ? `Size: ${sizeDisplay} | ${newNote}` : `Size: ${sizeDisplay}`;
                             }
                             updateNote(index, newNote);
                           }}
                           className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-lg py-1.5 pl-8 pr-3 text-[11px] focus:ring-1 focus:ring-[#1dc956]/50 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Order Payment Summary */}
        <div className="p-6 border-t border-slate-200 dark:border-white/5 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Service Tax (6%)</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(serviceTax)}</span>
            </div>
            <div className="h-[1px] bg-slate-200 dark:bg-white/10 my-2"></div>
            <div className="flex items-center justify-between text-xl font-bold">
              <span className="text-slate-800 dark:text-white">Total</span>
              <span className="text-[#1dc956]">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">Payment Method</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setPaymentMethod("cash")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                  paymentMethod === "cash" ? "border-[#1dc956] bg-[#1dc956]/10 text-[#1dc956]" : "border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:border-[#1dc956]/50"
                }`}
              >
                <span className="material-symbols-outlined text-xl">payments</span>
                <span className="text-sm font-bold">Cash</span>
              </button>
              <button 
                onClick={() => setPaymentMethod("qris")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                  paymentMethod === "qris" ? "border-[#1dc956] bg-[#1dc956]/10 text-[#1dc956]" : "border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:border-[#1dc956]/50"
                }`}
              >
                <span className="material-symbols-outlined text-xl">qr_code_2</span>
                <span className="text-sm font-bold">QRIS</span>
              </button>
            </div>
          </div>
          
          <div className="gap-2 block">
            {error && <p className="text-red-500 text-xs mb-2 font-medium text-center">{error}</p>}
            <button 
              onClick={handleCheckout}
              disabled={loading || items.length === 0 || hasActiveOrder}
              className="relative flex items-center justify-between w-full h-16 px-2 rounded-full transition-all hover:brightness-110 active:scale-[0.98] shadow-lg shadow-black/20 group bg-[#1dc956] disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="flex items-center justify-center h-12 w-12 bg-white rounded-full text-[#1dc956]">
                <span className="material-symbols-outlined font-bold">
                  {loading ? "hourglass_empty" : "arrow_forward"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-white">
                <span className="text-lg font-bold">{loading ? "Processing..." : "Place Order"}</span>
                <span className="text-lg font-medium opacity-90">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex items-center pr-4 text-white/30 group-hover:text-white/50 transition-colors">
                <span className="text-lg font-light tracking-[-4px]">{'>>>'}</span>
              </div>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}