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
  { id: "maintenance", label: "Maintenance", icon: "database" },
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
  const [productCategories, setProductCategories] = useState("Smartphones, Tablets, Wearables, Accessories, Gaming");

  // Notification Settings State
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyLowStock, setNotifyLowStock] = useState(true);
  const [notifyDailyReport, setNotifyDailyReport] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // Security Settings State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [transactionPin, setTransactionPin] = useState("");
  const [requirePinForDelete, setRequirePinForDelete] = useState(false);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [isResetting, setIsResetting] = useState(false);

  const handleBackup = async () => {
    try {
      const { data: products } = await supabase.from('products').select('*, variants(*)');
      const { data: settingsData } = await supabase.from('store_settings').select('*').eq('id', 1).single();
      
      const backupData = {
        timestamp: new Date().toISOString(),
        products: products || [],
        settings: settingsData || {},
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mobistock_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("Backup downloaded successfully! Keep this file safe.");
    } catch (e: any) {
      alert("Backup failed: " + e.message);
    }
  };

  const handleReset = async () => {
    if (requirePinForDelete) {
      const pin = prompt("Enter Security PIN to reset all data:");
      if (pin !== transactionPin) {
        alert("Incorrect PIN. Reset aborted.");
        return;
      }
    }

    if (!confirm("⚠️ WARNING: This will PERMANENTLY DELETE all products and variants from your database. This action cannot be undone. Are you sure?")) {
      return;
    }

    setIsResetting(true);
    try {
      // 1. Delete all products (cascades to variants)
      const { error: pError } = await supabase.from('products').delete().not('id', 'is', null);
      if (pError) throw pError;

      // 2. Delete all orders (cascades to order_items)
      const { error: oError } = await supabase.from('orders').delete().not('id', 'is', null);
      if (oError) throw oError;

      // 3. Delete all security logs
      const { error: lError } = await supabase.from('security_logs').delete().not('id', 'is', null);
      if (lError) throw lError;

      alert("Full database reset successful. All products, sales history, and logs have been cleared.");
      window.location.reload();
    } catch (e: any) {
      console.error("Full Reset Error:", e);
      alert(`Reset failed: ${e.message || "Please check your Supabase permissions (RLS) or database constraints."}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      // Log Security Event
      await supabase.from('security_logs').insert({
        event: "Password Changed",
        details: "Administrator successfully updated their login password.",
        status: "success"
      });

      alert("Password updated successfully! Next time you login, use your new password.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      alert("Error updating password: " + e.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

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
          setProductCategories(data.product_categories || productCategories);
          setTransactionPin(data.transaction_pin || "");
          setRequirePinForDelete(data.require_pin_for_delete ?? false);
        }

        // Fetch Security Logs
        const { data: logs } = await supabase
          .from('security_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        if (logs) setSecurityLogs(logs);
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
          product_categories: productCategories,
          transaction_pin: transactionPin,
          require_pin_for_delete: requirePinForDelete,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      // Log the change
      await supabase.from('security_logs').insert({
        event: "Settings Updated",
        details: "Store configuration and security settings modified.",
        status: "success"
      });

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
                    <div className="md:col-span-2 pt-4 border-t border-outline-variant/10">
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Product Categories</label>
                      <input 
                        value={productCategories} 
                        onChange={(e) => setProductCategories(e.target.value)} 
                        className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body"
                        placeholder="Smartphones, Tablets, Wearables, Accessories..."
                      />
                      <p className="text-[10px] text-on-surface-variant mt-2 font-bold uppercase tracking-wider opacity-50">* Separate categories with commas. These will appear in POS and Inventory filters.</p>
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

              {activeTab === "maintenance" && (
                <motion.div
                  key="maintenance"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-12"
                >
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-1">Maintenance & Tools</h3>
                    <p className="text-sm text-on-surface-variant">Perform database backups and system resets.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Backup Section */}
                    <div className="bg-surface-container-low p-8 rounded-[2.5rem] border border-outline-variant/10">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                        <span className="material-symbols-outlined text-3xl">cloud_download</span>
                      </div>
                      <h4 className="text-lg font-bold text-on-surface mb-2">Export Data Backup</h4>
                      <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">Download a complete copy of your products, variants, and store settings as a JSON file for safe keeping.</p>
                      <button 
                        onClick={handleBackup}
                        className="w-full py-4 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                        Download Backup
                      </button>
                    </div>

                    {/* Reset Section */}
                    <div className="bg-error-container/10 p-8 rounded-[2.5rem] border border-error/10">
                      <div className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center text-error mb-6">
                        <span className="material-symbols-outlined text-3xl">delete_forever</span>
                      </div>
                      <h4 className="text-lg font-bold text-error mb-2">Wipe All Product Data</h4>
                      <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">This will permanently delete every product and variant in your catalog. <span className="text-error font-bold">Use with extreme caution.</span></p>
                      <button 
                        onClick={handleReset}
                        disabled={isResetting}
                        className="w-full py-4 bg-error text-on-error rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-error/20 hover:shadow-error/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isResetting ? (
                          <span className="material-symbols-outlined animate-spin">refresh</span>
                        ) : (
                          <span className="material-symbols-outlined text-[20px]">dangerous</span>
                        )}
                        {isResetting ? 'Resetting...' : 'Reset Database'}
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-surface-container rounded-2xl border border-outline-variant/20 flex gap-4 items-start">
                    <span className="material-symbols-outlined text-primary">info</span>
                    <div className="text-xs text-on-surface-variant leading-relaxed">
                      <p className="font-bold text-primary uppercase tracking-widest mb-1">About System Resets</p>
                      Resetting the database only removes Inventory data (Products and Variants). Your Sales History, Orders, and Settings will remain intact. If you have "Require PIN for Delete" enabled, you must enter your Security PIN to proceed.
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
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">New Password</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Confirm New Password</label>
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body" 
                      />
                    </div>
                    <div className="md:col-span-2 mt-4">
                      <button 
                        onClick={handleUpdatePassword}
                        disabled={isUpdatingPassword}
                        className="px-8 py-3 rounded-full font-bold bg-primary text-on-primary shadow-xl shadow-primary/20 hover:opacity-95 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isUpdatingPassword ? (
                          <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                        ) : (
                          <span className="material-symbols-outlined text-sm">lock_reset</span>
                        )}
                        {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-outline-variant/10">
                    <h4 className="text-lg font-bold text-primary mb-4">Store Access PIN</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10">
                        <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-3">4-Digit Security PIN</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="password" 
                            maxLength={4}
                            value={transactionPin}
                            onChange={(e) => setTransactionPin(e.target.value.replace(/\D/g, ""))}
                            placeholder="0000" 
                            className="w-24 bg-surface-container-lowest rounded-xl py-3 px-4 text-center font-black tracking-[0.5em] text-lg text-primary outline-none focus:ring-2 focus:ring-primary/20 shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)]" 
                          />
                          <p className="text-xs text-on-surface-variant leading-relaxed">This PIN will be required for sensitive actions like deleting products or changing store settings.</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="flex items-center justify-between p-4 rounded-xl border border-outline-variant/20 hover:bg-surface-container-low cursor-pointer transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-error">delete_forever</span>
                            <div>
                              <p className="font-bold text-sm text-on-surface">Require PIN for Delete</p>
                              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">High Security</p>
                            </div>
                          </div>
                          <div className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors ${requirePinForDelete ? 'bg-primary' : 'bg-surface-container-high'}`}>
                            <motion.div animate={{ x: requirePinForDelete ? 20 : 0 }} className="w-3 h-3 bg-white rounded-full" />
                          </div>
                          <input type="checkbox" className="hidden" checked={requirePinForDelete} onChange={(e) => setRequirePinForDelete(e.target.checked)} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-outline-variant/10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-primary">Recent Security Activity</h4>
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">Synced with Database</span>
                    </div>
                    <div className="space-y-3">
                      {securityLogs.length > 0 ? securityLogs.map((log, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-2xl border border-outline-variant/5">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-error-container text-error'}`}>
                              <span className="material-symbols-outlined text-[20px]">
                                {log.event.includes('Password') ? 'vpn_key' : log.event.includes('Login') ? 'login' : 'security'}
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-sm text-on-surface">{log.event}</p>
                              <p className="text-xs text-on-surface-variant">{log.details}</p>
                            </div>
                          </div>
                          <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-tighter">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      )) : (
                        <div className="text-center py-8 text-on-surface-variant/50 italic text-sm">
                          No recent security events found.
                        </div>
                      )}
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
