"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function Profile() {
  const [mounted, setMounted] = useState(false);
  const [profileImage, setProfileImage] = useState("https://lh3.googleusercontent.com/aida-public/AB6AXuBrf_bs_Dipvf-vLWdzzampJDmFNvCTRnXbE8OJ7vD8S6itF5C2DrXG5HF_ujutax2SzIbygEXHd86EPo1jAiQqiX6GJ-FWijbw7k5PULUIaNEEoyUjB_7g_oTeiFkaHZ2nhW4Cy8sfoZH2QE0zOiVgJzuxeAiGI6iI7QMvjiCZm4U6s6UljdssaYdhYsGdnWkkzMK3QKLnAC0qa48atYSdXhwKiBcEr2tUB32pCp0An7QtnIUD83qljFGpCfpC3ZccGozPHzm7Kok");
  const [adminName, setAdminName] = useState("Store Admin");
  const [adminEmail, setAdminEmail] = useState("admin@precision.com");
  const [adminPhone, setAdminPhone] = useState("+251 911 223 344");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const savedImg = localStorage.getItem("mobistock_profile_img");
    const savedName = localStorage.getItem("mobistock_admin_name");
    const savedEmail = localStorage.getItem("mobistock_admin_email");
    const savedPhone = localStorage.getItem("mobistock_admin_phone");
    
    if (savedImg) setProfileImage(savedImg);
    if (savedName) setAdminName(savedName);
    if (savedEmail) setAdminEmail(savedEmail);
    if (savedPhone) setAdminPhone(savedPhone);
  };

  if (!mounted) return null;

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setProfileImage(base64);
        localStorage.setItem("mobistock_profile_img", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    localStorage.setItem("mobistock_admin_name", adminName);
    localStorage.setItem("mobistock_admin_email", adminEmail);
    localStorage.setItem("mobistock_admin_phone", adminPhone);
    alert("Profile settings synchronized successfully!");
  };

  return (
    <main className="flex-1 md:ml-72 pt-20 md:pt-8 px-6 pb-24 md:pb-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="mb-8"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-primary">Admin Profile</h2>
          <p className="text-on-surface-variant mt-1">Manage your personal account settings.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
            className="bg-surface-container-lowest rounded-3xl p-8 shadow-[0_8px_30px_-10px_rgba(25,28,30,0.08)] border border-outline-variant/15 flex flex-col items-center text-center h-fit"
          >
            <div className="relative mb-6 group">
              <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-lg border-4 border-white dark:border-slate-800">
                <img 
                  alt="Admin" 
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" 
                  src={profileImage}
                />
                <div 
                  onClick={handleImageClick}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                >
                  <span className="material-symbols-outlined text-2xl">photo_camera</span>
                  <span className="text-[10px] font-bold uppercase mt-1">Change</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
              <button 
                onClick={handleImageClick}
                className="absolute bottom-1 right-1 w-9 h-9 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform active:scale-90 z-10"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
            </div>
            <h3 className="text-2xl font-bold text-on-surface">{adminName}</h3>
            <p className="text-on-surface-variant font-medium mt-1">{adminEmail}</p>
            <span className="mt-4 bg-tertiary-fixed text-on-tertiary-fixed px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">Super Admin</span>
          </motion.div>

          {/* Profile Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
            className="bg-surface-container-lowest rounded-3xl p-8 shadow-[0_8px_30px_-10px_rgba(25,28,30,0.08)] border border-outline-variant/15 space-y-6"
          >
            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Full Name</label>
              <input value={adminName} onChange={(e) => setAdminName(e.target.value)} className="w-full bg-surface-container-low rounded-xl py-3.5 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body font-bold" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Email Address</label>
              <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="w-full bg-surface-container-low rounded-xl py-3.5 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body font-bold" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Role</label>
                <input disabled defaultValue="Super Admin" className="w-full bg-surface-container-highest rounded-xl py-3.5 px-4 text-on-surface-variant cursor-not-allowed font-body font-bold" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Phone Number</label>
                <input value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} className="w-full bg-surface-container-low rounded-xl py-3.5 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body font-bold" />
              </div>
            </div>
            <div className="pt-6 flex justify-end gap-4 border-t border-outline-variant/10">
              <button className="px-8 py-3.5 rounded-full font-bold bg-surface-container-highest text-on-surface hover:bg-surface-dim transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-8 py-3.5 rounded-full font-bold bg-primary text-on-primary shadow-xl shadow-primary/20 hover:opacity-95 hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                Save Profile
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
