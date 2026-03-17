"use client";

import { useRouter } from "next/navigation";
import useRequireAuth from "@/hooks/useRequireAuth";

export default function ManagerPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireAuth(["manager"]);

  if (isLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <div className="text-3xl mb-2">☕</div>
        <p className="text-stone-400 text-sm">Memuat...</p>
      </div>
    </div>
  );

  const menus = [
    {
      icon: "🍽️",
      title: "Kelola Menu",
      desc: "Tambah, edit, hapus menu",
      path: "/owner/menu",
      color: "bg-green-50 border-green-100",
      iconBg: "bg-green-100",
    },
    {
      icon: "🪑",
      title: "Kelola Meja",
      desc: "Atur meja & generate QR",
      path: "/owner/meja",
      color: "bg-blue-50 border-blue-100",
      iconBg: "bg-blue-100",
    },
    {
      icon: "🔔",
      title: "Monitor Pesanan",
      desc: "Pantau pesanan real-time",
      path: "/kasir",
      color: "bg-orange-50 border-orange-100",
      iconBg: "bg-orange-100",
    },
  ];

  const handleLogout = () => {
    const { logout } = require("@/store/authStore").default.getState();
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-20 flex items-center">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">📋</div>
          <div>
            <p className="font-bold text-stone-800 text-sm leading-none">Singgah Sebentar</p>
            <p className="text-xs text-stone-400">Dashboard Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-600">📋 {user.name}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 font-medium">
            Keluar
          </button>
        </div>
      </nav>

      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-stone-800">Selamat datang, {user.name}! 👋</h1>
        <p className="text-sm text-stone-500 mt-1">Kelola operasional Kafe Singgah Sebentar.</p>
      </div>

      <div className="px-4 pb-10">
        <div className="grid grid-cols-1 gap-4">
          {menus.map((menu) => (
            <button
              key={menu.path}
              onClick={() => router.push(menu.path)}
              className={`w-full border rounded-2xl p-5 text-left flex items-center gap-4 hover:shadow-md transition-shadow ${menu.color}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${menu.iconBg}`}>
                {menu.icon}
              </div>
              <div>
                <h3 className="font-bold text-stone-800 text-base">{menu.title}</h3>
                <p className="text-sm text-stone-500 mt-0.5">{menu.desc}</p>
              </div>
              <div className="ml-auto text-stone-300 text-xl">→</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
