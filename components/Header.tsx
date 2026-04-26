import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [storeName, setStoreName] = useState("The Precision Atelier");
  const [adminPhoto, setAdminPhoto] = useState("https://lh3.googleusercontent.com/aida-public/AB6AXuDIoRf5OT0Xv5_Q5xZ6E1TF1pRZpFzjGHf-9ijnMJbuBvavusurRdjHlG_4VdFI8LBrdRmJ_lvGRiuZaJA3g8lbEn2u_GQHphwDhu2xu27mDzdrNz5hVxkS9BRF-Zpvn2bUKKPMocToLS6xNdALfuBTQLHbofrWXA9C0YOGsxnINVE8tuMk5ZqSMJNPW6_L317aZ1kjhCqFRZ-3XdlfvsY74GO16wkj9slN_AMDyRYXjOT-Ax-nuBqnyIS7tNl4kMC84Z02rxEv1ww");

  useEffect(() => {
    fetchHeaderData();
    window.addEventListener('mobistock_settings_updated', fetchHeaderData);
    return () => window.removeEventListener('mobistock_settings_updated', fetchHeaderData);
  }, []);

  const fetchHeaderData = async () => {
    try {
      const { data } = await supabase.from('store_settings').select('store_name, admin_photo').eq('id', 1).single();
      if (data?.store_name) setStoreName(data.store_name);
      if (data?.admin_photo) setAdminPhoto(data.admin_photo);
    } catch (e) {
      console.error("Header Sync Error:", e);
    }
  };

  return (
    <header className="md:hidden flex justify-between items-center w-full px-6 py-4 fixed top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0_20px_40px_-10px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-4">
        <div className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">{storeName}</div>
      </div>
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors scale-95 active:scale-90 duration-200">
          <span className="material-symbols-outlined text-slate-900 dark:text-slate-50 font-bold" style={{ fontVariationSettings: "'FILL' 0" }}>notifications</span>
        </button>
        <button className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors scale-95 active:scale-90 duration-200">
          <span className="material-symbols-outlined text-slate-900 dark:text-slate-50 font-bold" style={{ fontVariationSettings: "'FILL' 0" }}>settings</span>
        </button>
        <img alt="Administrator profile" className="w-10 h-10 rounded-full object-cover shadow-sm" src={adminPhoto}/>
      </div>
    </header>
  );
}
