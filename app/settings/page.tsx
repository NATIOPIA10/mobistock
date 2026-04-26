"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { fetchLiveExchangeRate } from "@/lib/currency";

const tabs = [
  { id: "general", label: "General Information", icon: "storefront" },
  { id: "regional", label: "Regional & Tax", icon: "public" },
  { id: "notifications", label: "Notifications", icon: "notifications" },
  { id: "security", label: "Security & Login", icon: "shield_lock" },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [mounted, setMounted] = useState(false);

  // General Settings State
  const [storeName, setStoreName] = useState("Precision Atelier");
  const [email, setEmail] = useState("admin@precision.com");
  const [phone, setPhone] = useState("+251 911 234 567");
  const [address, setAddress] = useState("Bole, Addis Ababa, Ethiopia");
  const [adminPhoto, setAdminPhoto] = useState("https://lh3.googleusercontent.com/aida-public/AB6AXuBrf_bs_Dipvf-vLWdzzampJDmFNvCTRnXbE8OJ7vD8S6itF5C2DrXG5HF_ujutax2SzIbygEXHd86EPo1jAiQqiX6GJ-FWijbw7k5PULUIaNEEoyUjB_7g_oTeiFkaHZ2nhW4Cy8sfoZH2QE0zOiVgJzuxeAiGI6iI7QMvjiCZm4U6s6UljdssaYdhYsGdnWkkzMK3QKLnAC0qa48atYSdXhwKiBcEr2tUB32pCp0An7QtnIUD83qljFGpCfpC3ZccGozPHzm7Kok");

  // Regional Settings State
  const [currency, setCurrency] = useState("ETB");
  const [taxRate, setTaxRate] = useState(15);
  const [timezone, setTimezone] = useState("Africa/Addis_Ababa");
  const [discountOptions, setDiscountOptions] = useState("0,5,10,15,20");
  const [exchangeRate, setExchangeRate] = useState(1); // Default 1 (1:1)

  // Notification Settings State
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyLowStock, setNotifyLowStock] = useState(true);
  const [notifyDailyReport, setNotifyDailyReport] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncRate = async () => {
    if (currency === "ETB") {
      setExchangeRate(1);
      alert("Base currency is ETB. Exchange rate set to 1.");
      return;
    }
    setIsSyncing(true);
    const rate = await fetchLiveExchangeRate(currency, "ETB");
    if (rate) {
      setExchangeRate(Number(rate.toFixed(2)));
      alert(`Rate synced successfully! 1 ${currency} = ${rate.toFixed(2)} ETB`);
    } else {
      alert(`Failed to fetch live rate for ${currency}. Please check your internet connection.`);
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
        if (data) {
          setStoreName(data.store_name || storeName);
          setEmail(data.email || email);
          setPhone(data.phone || phone);
          setAddress(data.address || address);
          setAdminPhoto(data.admin_photo || adminPhoto);
          setCurrency(data.currency || currency);
          setTaxRate(data.tax_rate || taxRate);
          setTimezone(data.timezone || timezone);
          setDiscountOptions(data.discount_options || discountOptions);
          setNotifyEmail(data.notify_email ?? notifyEmail);
          setNotifyLowStock(data.notify_low_stock ?? notifyLowStock);
          setNotifyDailyReport(data.notify_daily_report ?? notifyDailyReport);
          setLowStockThreshold(data.low_stock_threshold || lowStockThreshold);
          setExchangeRate(data.exchange_rate || 1);
        }
    } catch (e) {
      console.error("Settings Fetch Error:", e);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          id: 1,
          store_name: storeName,
          email: email,
          phone: phone,
          address: address,
          admin_photo: adminPhoto,
          currency: currency,
          tax_rate: taxRate,
          discount_options: discountOptions,
          notify_email: notifyEmail,
          notify_low_stock: notifyLowStock,
          notify_daily_report: notifyDailyReport,
          low_stock_threshold: lowStockThreshold,
          exchange_rate: exchangeRate,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      // Notify other components (like Sidebar) to refresh
      window.dispatchEvent(new Event('mobistock_settings_updated'));
      
      alert("Store configuration synchronized to database successfully!");
    } catch (e: any) {
      alert("Error saving settings: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <main className="flex-1 md:ml-72 pt-20 md:pt-8 px-6 pb-24 md:pb-8 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"
        >
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-primary">Store Settings</h2>
            <p className="text-on-surface-variant mt-1">Manage your business configuration and preferences.</p>
          </div>
          <motion.button
            onClick={handleSave}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="px-8 py-3 rounded-full font-bold bg-primary text-on-primary shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 min-w-[140px]"
          >
            {isSaving ? (
              <span className="material-symbols-outlined animate-spin">refresh</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                Save Changes
              </>
            )}
          </motion.button>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Settings Navigation */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
            className="lg:w-72 shrink-0 flex flex-col gap-2"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all text-left ${
                  activeTab === tab.id
                    ? "bg-surface-container-highest text-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </motion.aside>

          {/* Settings Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
            className="flex-1 bg-surface-container-lowest rounded-3xl p-6 md:p-10 shadow-[0_8px_30px_-10px_rgba(25,28,30,0.08)] border border-outline-variant/15 min-h-[500px]"
          >
            <AnimatePresence mode="wait">
              {activeTab === "general" && (
                <motion.div
                  key="general"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-1">General Information</h3>
                    <p className="text-sm text-on-surface-variant">Update your store&apos;s basic details and public profile.</p>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-outline-variant/10">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-surface-container-low border-2 border-primary/20 shadow-lg">
                        <img src={adminPhoto} alt="Admin" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                        <div 
                          onClick={() => document.getElementById('photo-upload')?.click()}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                        >
                          <span className="material-symbols-outlined">photo_camera</span>
                        </div>
                      </div>
                      <input 
                        id="photo-upload"
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setAdminPhoto(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-on-surface">Store Profile Photo</h4>
                      <p className="text-sm text-on-surface-variant max-w-xs">This photo will be displayed in the sidebar and dashboard header.</p>
                      <button 
                        onClick={() => document.getElementById('photo-upload')?.click()}
                        className="mt-3 text-xs font-black uppercase tracking-widest text-primary hover:underline"
                      >
                        Upload New Image
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Store Name</label>
                      <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Contact Email</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Phone Number</label>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Store Address</label>
                      <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body resize-none" />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "regional" && (
                <motion.div
                  key="regional"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-1">Regional & Tax</h3>
                    <p className="text-sm text-on-surface-variant">Configure currency, timezone, and tax rates for your store.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Primary Currency</label>
                      <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body">
                        <option value="ETB">Ethiopian Birr (ETB)</option>
                        <option value="USD">US Dollar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="GBP">British Pound (GBP)</option>
                        <option value="AED">UAE Dirham (AED)</option>
                        <option value="SAR">Saudi Riyal (SAR)</option>
                        <option value="CNY">Chinese Yuan (CNY)</option>
                        <option value="CAD">Canadian Dollar (CAD)</option>
                        <option value="KES">Kenyan Shilling (KES)</option>
                        <option value="UGX">Ugandan Shilling (UGX)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Timezone</label>
                      <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body">
                        <option value="Africa/Addis_Ababa">Africa/Addis_Ababa</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Default Tax Rate (%)</label>
                      <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Global Discount Options (%)</label>
                      <input 
                        value={discountOptions} 
                        onChange={(e) => setDiscountOptions(e.target.value)} 
                        placeholder="e.g. 0,5,10,15,20"
                        className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body" 
                      />
                      <p className="text-[10px] text-on-surface-variant mt-2 font-bold uppercase tracking-wider opacity-50">* Separate percentages with commas</p>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Exchange Rate (vs Base)</label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                          <input 
                            type="number" 
                            step="0.01"
                            value={exchangeRate} 
                            onChange={(e) => setExchangeRate(Number(e.target.value))} 
                            className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body" 
                          />
                        </div>
                        <button 
                          onClick={handleSyncRate}
                          disabled={isSyncing}
                          className="bg-secondary-container text-on-secondary-container px-4 py-3 rounded-xl font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                        >
                          <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                          {isSyncing ? 'Syncing...' : 'Sync Live'}
                        </button>
                        <div className="bg-primary/10 text-primary px-4 py-3 rounded-xl font-bold text-xs">
                          1 {currency} = {exchangeRate} ETB
                        </div>
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-2 font-bold uppercase tracking-wider opacity-50">* Rate vs ETB (Base)</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "notifications" && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-1">Notifications</h3>
                    <p className="text-sm text-on-surface-variant">Choose what events you want to be notified about.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 rounded-xl border border-outline-variant/20 hover:bg-surface-container-lowest cursor-pointer transition-colors">
                      <div>
                        <p className="font-bold text-on-surface">Email Receipts</p>
                        <p className="text-sm text-on-surface-variant mt-0.5">Send a copy of digital receipts to the store email.</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${notifyEmail ? 'bg-primary' : 'bg-surface-container-high'}`}>
                        <motion.div animate={{ x: notifyEmail ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow" />
                      </div>
                      <input type="checkbox" className="hidden" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
                    </label>

                    <label className="flex items-center justify-between p-4 rounded-xl border border-outline-variant/20 hover:bg-surface-container-lowest cursor-pointer transition-colors">
                      <div>
                        <p className="font-bold text-on-surface">Low Stock Alerts</p>
                        <p className="text-sm text-on-surface-variant mt-0.5">Receive alerts when inventory drops below threshold.</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${notifyLowStock ? 'bg-primary' : 'bg-surface-container-high'}`}>
                        <motion.div animate={{ x: notifyLowStock ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow" />
                      </div>
                      <input type="checkbox" className="hidden" checked={notifyLowStock} onChange={(e) => setNotifyLowStock(e.target.checked)} />
                    </label>

                    <label className="flex items-center justify-between p-4 rounded-xl border border-outline-variant/20 hover:bg-surface-container-lowest cursor-pointer transition-colors">
                      <div>
                        <p className="font-bold text-on-surface">Daily Summary Report</p>
                        <p className="text-sm text-on-surface-variant mt-0.5">Receive an automated sales summary every evening.</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${notifyDailyReport ? 'bg-primary' : 'bg-surface-container-high'}`}>
                        <motion.div animate={{ x: notifyDailyReport ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow" />
                      </div>
                      <input type="checkbox" className="hidden" checked={notifyDailyReport} onChange={(e) => setNotifyDailyReport(e.target.checked)} />
                    </label>
                  </div>

                  <div className="pt-6 border-t border-outline-variant/10">
                    <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-3">Alert Threshold</label>
                    <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                      <div className="flex-1">
                        <p className="font-bold text-on-surface">Low Stock Warning</p>
                        <p className="text-sm text-on-surface-variant mt-0.5">Notify me when product units are less than:</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <input 
                           type="number" 
                           value={lowStockThreshold} 
                           onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                           className="w-20 bg-surface-container-lowest rounded-xl py-2 px-3 text-center font-bold text-primary outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/10" 
                         />
                         <span className="text-xs font-bold text-on-surface-variant/40">Units</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-1">Security & Login</h3>
                    <p className="text-sm text-on-surface-variant">Update your password and manage account security.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                    <div className="md:col-span-2">
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Current Password</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Confirm New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body" />
                    </div>
                    <div className="md:col-span-2 mt-4">
                      <button className="px-6 py-2.5 rounded-full font-bold bg-surface-container-highest text-on-surface hover:bg-surface-dim transition-colors">
                        Update Password
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
