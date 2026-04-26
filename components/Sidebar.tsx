"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const navLinks = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/inventory", label: "Inventory", icon: "inventory_2" },
  { href: "/pos", label: "POS Terminal", icon: "point_of_sale" },
  { href: "/analytics", label: "Sales Analytics", icon: "query_stats" },
  { href: "/orders", label: "Orders", icon: "receipt_long" },
];


export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [storeName, setStoreName] = useState("MobiStock");
  const [adminPhoto, setAdminPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetchStoreName();
    // Listen for setting changes
    window.addEventListener('mobistock_settings_updated', fetchStoreName);
    return () => window.removeEventListener('mobistock_settings_updated', fetchStoreName);
  }, []);

  const fetchStoreName = async () => {
    try {
      const { data } = await supabase.from('store_settings').select('store_name, admin_photo').eq('id', 1).single();
      if (data?.store_name) setStoreName(data.store_name);
      if (data?.admin_photo) setAdminPhoto(data.admin_photo);
    } catch (e) {
      console.error("Sidebar Sync Error:", e);
    }
  };

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="hidden md:flex flex-col h-screen w-72 left-0 top-0 fixed bg-slate-50 dark:bg-slate-950 py-8 border-r-0 z-40">
      {/* Brand */}
      <div className="px-8 mb-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-xl shadow-lg shrink-0 overflow-hidden">
          {adminPhoto ? (
            <img src={adminPhoto} alt={storeName} className="w-full h-full object-cover" />
          ) : (
            storeName.charAt(0)
          )}
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-slate-50 leading-tight">{storeName}</h1>
          <p className="font-['Manrope'] text-xs tracking-widest uppercase font-semibold text-slate-500 dark:text-slate-400">Admin Mode</p>
        </div>
      </div>

      {/* Quick Sale CTA */}
      <div className="px-5 mb-6">
        <button
          onClick={() => router.push("/quick-sale")}
          className={`w-full py-3.5 rounded-full font-bold shadow-lg flex items-center justify-center gap-2 transition-all text-sm tracking-wide uppercase ${pathname === "/quick-sale" ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-gradient-to-r from-primary to-primary-container text-on-primary hover:opacity-90"}`}
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          New Quick Sale
        </button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-2">
        {navLinks.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-4 px-6 py-3 rounded-full font-['Manrope'] text-sm tracking-wide uppercase font-semibold transition-all duration-200 ${
                active
                  ? "bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 shadow-lg"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="flex flex-col gap-1 px-2 mt-4 pt-4 border-t border-outline-variant/15">
        <Link
          href="/settings"
          className={`flex items-center gap-4 px-6 py-3 rounded-full font-['Manrope'] text-sm tracking-wide uppercase font-semibold transition-all duration-200 ${
            pathname === "/settings" ? "bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 shadow-lg" : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: pathname === "/settings" ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
          Settings
        </Link>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
          className="flex items-center gap-4 px-6 py-3 rounded-full font-['Manrope'] text-sm tracking-wide uppercase font-semibold text-error hover:bg-error/5 transition-all duration-200"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
