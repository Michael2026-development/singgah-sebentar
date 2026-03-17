"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/authStore";
import { login } from "@/services/authService";
import { ROLES } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-fill helpers based on the design's "Role Selector"
  const roleMap = {
    "Dapur": "dapur@singgahsebentar.id",
    "Kasir": "kasir@singgahsebentar.id",
    "Manager": "manager@singgahsebentar.id",
    "Cafe Owner": "owner@singgahsebentar.id",
  };

  const handleRoleSelection = (roleLabel) => {
    const emailForRole = roleMap[roleLabel];
    if (emailForRole) {
      setEmail(emailForRole);
      setPassword("singgah2026");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
      setAuth(res.data.user, res.data.token);

      // Redirect berdasarkan role
      const role = res.data.user.role;
      if (role === ROLES.OWNER) router.push("/owner");
      else if (role === ROLES.MANAGER) router.push("/manager");
      else if (role === ROLES.KASIR) router.push("/kasir");
      else if (role === ROLES.DAPUR) router.push("/dapur");
    } catch (err) {
      setError(err.response?.data?.message || "Login gagal, coba lagi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-display antialiased bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen dark">
      <div className="flex flex-col md:flex-row min-h-screen w-full">
        {/* Left Side: Login Form */}
        <div className="w-full md:w-1/2 bg-brand-beige dark:bg-slate-950 flex flex-col p-8 md:p-16 lg:p-24 relative overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-12 shrink-0">
              <div className="size-8 bg-brand-dark dark:bg-primary rounded-lg flex items-center justify-center text-white dark:text-brand-dark shadow-sm">
                <span className="material-symbols-outlined text-xl">apartment</span>
              </div>
              <h1 className="text-brand-dark dark:text-white text-xl font-bold tracking-tight">Singgah Sebentar</h1>
            </div>
            
            <div className="w-full flex-1 flex flex-col justify-center my-auto">
              <div className="mb-8">
              <h2 className="text-3xl font-bold text-brand-dark dark:text-white mb-2">Halo, Selamat Bertugas!</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Masuk untuk mulai mengelola pesanan hari ini</p>
            </div>
            
            {/* Quick Login Role Selector */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {["Dapur", "Kasir", "Manager", "Cafe Owner"].map((role) => (
                <label key={role} className="cursor-pointer group">
                  <input 
                    className="peer hidden" 
                    name="role" 
                    type="radio" 
                    onChange={() => handleRoleSelection(role)} 
                    checked={email === roleMap[role]}
                  />
                  <div className="flex items-center justify-center h-12 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-transparent text-sm font-semibold transition-all peer-checked:border-primary peer-checked:bg-primary/5 text-slate-500 dark:text-slate-400 peer-checked:text-primary hover:border-slate-300 dark:hover:border-slate-700">
                    {role}
                  </div>
                </label>
              ))}
            </div>
            
            {/* Display Error Message if any */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}
            
            {/* Form Fields */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-brand-dark dark:text-slate-300 mb-2">Email Address</label>
                <input 
                  className="w-full h-12 px-4 rounded-xl border-2 border-transparent dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-0 focus:border-primary transition-all text-sm outline-none placeholder:text-slate-500" 
                  placeholder="Enter your email" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-brand-dark dark:text-slate-300">Password</label>
                </div>
                <input 
                  className="w-full h-12 px-4 rounded-xl border-2 border-transparent dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-0 focus:border-primary transition-all text-sm outline-none placeholder:text-slate-500 tracking-wider" 
                  placeholder="••••••••" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button 
                className="w-full h-14 bg-brand-dark dark:bg-primary text-white dark:text-brand-dark font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-6 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed" 
                type="submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
                {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
              </button>
            </form>
          </div>
          
          <footer className="mt-8 shrink-0 text-xs text-slate-400 font-medium">
            © 2026 Singgah Sebentar. All rights reserved.
          </footer>
          </div>
        </div>
        
        {/* Right Side: Testimonial & Branding */}
        <div className="hidden md:flex md:w-1/2 bg-brand-dark relative overflow-hidden flex-col justify-center p-16 lg:p-24 shadow-2xl z-10">
          {/* Abstract City Illustration Background */}
          <div className="absolute inset-0 city-illustration pointer-events-none flex items-end justify-center">
            <svg className="w-full h-full object-cover" fill="none" preserveAspectRatio="xMidYMax slice" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
              {/* Background & Wall */}
              <rect fill="#082a0f" height="600" width="800"></rect>
              <rect fill="#112116" height="450" width="800"></rect>
              {/* Wood Panel Accents */}
              <rect fill="#3E2723" height="450" width="40" x="100"></rect>
              <rect fill="#3E2723" height="450" width="40" x="300"></rect>
              <rect fill="#3E2723" height="450" width="40" x="500"></rect>
              <rect fill="#3E2723" height="450" width="40" x="700"></rect>
              {/* Cafe Counter (Warm Wood) */}
              <path d="M0 450 H800 V600 H0 Z" fill="#5D4037"></path>
              <rect fill="#3E2723" height="10" width="800" y="450"></rect>
              {/* Modern Coffee Machine (Teal/Metallic) */}
              <rect fill="#263238" height="90" rx="4" width="130" x="80" y="360"></rect>
              <rect fill="#00BFA5" height="25" width="110" x="90" y="370"></rect>
              <circle cx="110" cy="420" fill="#FFB347" r="6"></circle>
              <circle cx="135" cy="420" fill="#FFB347" r="6"></circle>
              <circle cx="160" cy="420" fill="#FFB347" r="6"></circle>
              <rect fill="#ECEFF1" height="15" rx="2" width="40" x="150" y="375"></rect>
              {/* Potted Plants (Vibrant Greenery) */}
              <rect fill="#795548" height="30" width="40" x="600" y="420"></rect>
              <path d="M590 420 Q620 360 650 420 Z" fill="#2E7D32"></path>
              <path d="M600 410 Q620 340 640 410 Z" fill="#43A047"></path>
              <rect fill="#795548" height="30" width="40" x="250" y="420"></rect>
              <path d="M240 420 Q270 380 300 420 Z" fill="#2E7D32"></path>
              {/* Amber Pendant Lights with Glow */}
              <defs>
                <radialGradient cx="50%" cy="50%" id="glow" r="50%">
                  <stop offset="0%" stopColor="#FFB347" stopOpacity="0.6"></stop>
                  <stop offset="100%" stopColor="#FFB347" stopOpacity="0"></stop>
                </radialGradient>
              </defs>
              <circle cx="200" cy="150" fill="url(#glow)" r="60"></circle>
              <line stroke="#FFB347" strokeWidth="2" x1="200" x2="200" y1="0" y2="150"></line>
              <path d="M175 150 Q200 125 225 150 Z" fill="#FFB347"></path>
              <circle cx="450" cy="120" fill="url(#glow)" r="50"></circle>
              <line stroke="#FFB347" strokeWidth="2" x1="450" x2="450" y1="0" y2="120"></line>
              <path d="M430 120 Q450 100 470 120 Z" fill="#FFB347"></path>
              {/* Shelves and Colorful Jars */}
              <rect fill="#3E2723" height="8" width="180" x="550" y="220"></rect>
              <rect fill="#FF7043" height="35" rx="2" width="25" x="570" y="185"></rect>
              <rect fill="#4FC3F7" height="35" rx="2" width="25" x="610" y="185"></rect>
              <rect fill="#DCE775" height="35" rx="2" width="25" x="650" y="185"></rect>
              {/* Menu Board */}
              <rect fill="#112116" height="100" rx="4" stroke="#5D4037" strokeWidth="2" width="80" x="360" y="200"></rect>
              <rect fill="#FFB347" fillOpacity="0.3" height="3" width="50" x="375" y="220"></rect>
              <rect fill="#FFB347" fillOpacity="0.3" height="3" width="60" x="370" y="230"></rect>
              <rect fill="#FFB347" fillOpacity="0.3" height="3" width="40" x="380" y="240"></rect>
            </svg>
          </div>
          
          <div className="relative z-10 max-w-lg mx-auto mb-8">
            <span className="text-7xl font-serif text-primary mb-4 block leading-none opacity-80">“</span>
            <blockquote className="text-3xl lg:text-4xl font-light text-white leading-tight mb-12 tracking-wide text-balance">
              Lebih dari sekadar kafe, Singgah Sebentar adalah tempatmu beristirahat sejenak, menikmati setiap tegukan, dan kembali melangkah dengan semangat baru.
            </blockquote>
            <div className="flex items-center gap-5">
              <div className="size-16 rounded-full overflow-hidden border-2 border-primary/50 shadow-lg shadow-primary/20">
                <img 
                  alt="Brad D. Smith" 
                  className="w-full h-full object-cover" 
                  src="https://www.shutterstock.com/image-photo/happy-mid-aged-older-business-600nw-2322385015.jpg"
                />
              </div>
              <div>
                <h4 className="text-white font-bold text-lg leading-tight">Brad D. Smith</h4>
                <p className="text-primary/70 font-medium text-sm mt-0.5">Founder Singgah Sebentar • Jakarta</p>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-10 right-10 size-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-40 left-10 size-32 bg-primary/20 rounded-full blur-2xl pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
}