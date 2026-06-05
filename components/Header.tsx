"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface HeaderProps {
  onMenuOpen?: () => void;
}

export default function Header({ onMenuOpen }: HeaderProps) {
  const [storeName, setStoreName] = useState("MobiStock");
  const [adminPhoto, setAdminPhoto] = useState(
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDIoRf5OT0Xv5_Q5xZ6E1TF1pRZpFzjGHf-9ijnMJbuBvavusurRdjHlG_4VdFI8LBrdRmJ_lvGRiuZaJA3g8lbEn2u_GQHphwDhu2xu27mDzdrNz5hVxkS9BRF-Zpvn2bUKKPMocToLS6xNdALfuBTQLHbofrWXA9C0YOGsxnINVE8tuMk5ZqSMJNPW6_L317aZ1kjhCqFRZ-3XdlfvsY74GO16wkj9slN_AMDyRYXjOT-Ax-nuBqnyIS7tNl4kMC84Z02rxEv1ww"
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchHeaderData();
    fetchUnreadCount();
    window.addEventListener("mobistock_settings_updated", fetchHeaderData);
    window.addEventListener("mobistock_notifications_read", fetchUnreadCount);
    return () => {
      window.removeEventListener("mobistock_settings_updated", fetchHeaderData);
      window.removeEventListener("mobistock_notifications_read", fetchUnreadCount);
    };
  }, []);

  const fetchHeaderData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("store_settings")
        .select("store_name, admin_photo")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (data?.store_name) setStoreName(data.store_name);
      if (data?.admin_photo) setAdminPhoto(data.admin_photo);
    } catch (e) {
      console.error("Header Sync Error:", e);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from("store_settings")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      const { data: products } = await supabase.from("products").select("*, variants(*)");
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      let count = 0;
      const threshold = settings?.low_stock_threshold || 10;
      const readAt = localStorage.getItem("mobistock_notifications_read_at");
      const readTime = readAt ? new Date(readAt) : null;

      if (settings?.notify_low_stock !== false) {
        products?.forEach((p: any) => {
          const totalStock = p.variants.reduce((s: number, v: any) => s + v.stock, 0);
          if (totalStock < threshold) count++;
        });
      }

      // Count recent orders since last read
      orders?.forEach((o: any) => {
        if (!readTime || new Date(o.created_at) > readTime) count++;
      });

      setUnreadCount(count);
    } catch (e) {
      console.error("Notification count error:", e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleNotificationsClick = () => {
    router.push("/notifications");
  };

  return (
    <header className="md:hidden flex justify-between items-center w-full px-4 py-3 fixed top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0_20px_40px_-10px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3">
        {/* Hamburger menu button */}
        <button
          onClick={onMenuOpen}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all duration-200"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-slate-700 dark:text-slate-300" style={{ fontVariationSettings: "'FILL' 0" }}>menu</span>
        </button>
        <div className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tighter">{storeName}</div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <button
          onClick={handleNotificationsClick}
          className="relative w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all duration-200"
          aria-label="Notifications"
        >
          <span
            className="material-symbols-outlined text-slate-700 dark:text-slate-300"
            style={{ fontVariationSettings: unreadCount > 0 ? "'FILL' 1" : "'FILL' 0" }}
          >
            notifications
          </span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-error rounded-full flex items-center justify-center">
              <span className="text-white text-[10px] font-bold leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={() => router.push("/settings")}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all duration-200"
          aria-label="Settings"
        >
          <span className="material-symbols-outlined text-slate-700 dark:text-slate-300" style={{ fontVariationSettings: "'FILL' 0" }}>settings</span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center hover:bg-error/20 active:scale-90 transition-all duration-200"
          aria-label="Logout"
        >
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 0" }}>logout</span>
        </button>
      </div>
    </header>
  );
}
