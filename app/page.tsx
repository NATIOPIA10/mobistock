"use client";

import { useState, useEffect } from "react";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/currency";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const scaleIn = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

export default function Dashboard() {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  
  // Real Database State
  const [metrics, setMetrics] = useState({ todaySales: 0, totalRevenue: 0, totalProfit: 0 });
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [adminPhoto, setAdminPhoto] = useState("https://lh3.googleusercontent.com/aida-public/AB6AXuBrf_bs_Dipvf-vLWdzzampJDmFNvCTRnXbE8OJ7vD8S6itF5C2DrXG5HF_ujutax2SzIbygEXHd86EPo1jAiQqiX6GJ-FWijbw7k5PULUIaNEEoyUjB_7g_oTeiFkaHZ2nhW4Cy8sfoZH2QE0zOiVgJzuxeAiGI6iI7QMvjiCZm4U6s6UljdssaYdhYsGdnWkkzMK3QKLnAC0qa48atYSdXhwKiBcEr2tUB32pCp0An7QtnIUD83qljFGpCfpC3ZccGozPHzm7Kok");
  const [showBadge, setShowBadge] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    fetchSettings();
    fetchDashboardData();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
      if (data) setSettings(data);
    } catch (e) {
      console.error("Dashboard Settings Error:", e);
    }
  };

  const fetchDashboardData = async () => {
    const newAlerts: any[] = [];
    try {
      // 1. Fetch Data
      const { data: ordersData } = await supabase.from('orders').select('*');
      const { data: itemsData } = await supabase.from('order_items').select('*');
      const { data: productsData } = await supabase.from('products').select('*, variants(*)');
      let salesCount: Record<string, number> = {};

      if (ordersData) {
        const completedOrders = ordersData.filter(o => o.status === 'completed');
        const totalRev = completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
        const today = new Date().toISOString().split('T')[0];
        const todayS = completedOrders
          .filter(o => o.created_at.startsWith(today))
          .reduce((sum, o) => sum + Number(o.total_amount), 0);
        
        setMetrics({
          todaySales: todayS,
          totalRevenue: totalRev,
          totalProfit: totalRev * 0.3 
        });

        // Use only completed orders for best sellers
        const completedOrderIds = new Set(completedOrders.map(o => o.id));
        const filteredItems = itemsData?.filter(item => completedOrderIds.has(item.order_id)) || [];

        if (productsData) {
          // Create a map of variant_id -> product_id
          const variantToProduct: Record<string, string> = {};
          productsData.forEach(p => {
            p.variants?.forEach((v: any) => {
              variantToProduct[v.id] = p.id;
            });
          });

          filteredItems.forEach((item: any) => {
            const productId = item.product_id || variantToProduct[item.variant_id];
            if (productId) {
              salesCount[productId] = (salesCount[productId] || 0) + Number(item.quantity || 0);
            }
          });
        }
      }
      if (productsData) {
        // Fetch Best Sellers by joining orders
        const bestS = productsData
          .map(p => ({
            img: p.image_url,
            alt: p.title,
            title: p.title,
            sku: p.sku,
            sales: salesCount[p.id] || 0,
            stock: p.variants.reduce((s: number, v: any) => s + v.stock, 0)
          }))
          .sort((a, b) => b.sales - a.sales) // Sort by real sales count
          .slice(0, 4);
        setBestSellers(bestS);

        // Generate Alerts based on stock
        productsData.forEach(p => {
          const totalStock = p.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
          const threshold = settings?.low_stock_threshold || 10;
          if (totalStock === 0) {
            newAlerts.push({ 
              border: "border-error", iconBg: "bg-error-container", iconColor: "text-error", icon: "warning", 
              badge: "Out of Stock", badgeBg: "text-error bg-error-container", 
              title: p.title, desc: `0 units remaining. Reorder immediately.`, delay: 0.1 
            });
          } else if (totalStock < threshold) {
            newAlerts.push({ 
              border: "border-amber-500", iconBg: "bg-amber-50", iconColor: "text-amber-600", icon: "inventory", 
              badge: "Low Stock", badgeBg: "text-amber-700 bg-amber-100", 
              title: p.title, desc: `Only ${totalStock} units left. Threshold reached.`, delay: 0.2 
            });
          }
        });
        setAlerts(newAlerts.slice(0, 3)); // Show top 3 alerts
      }
      // 3. Fetch Profile Data
      const savedPhoto = localStorage.getItem("mobistock_profile_img");
      if (savedPhoto) setAdminPhoto(savedPhoto);

      // 4. Set Badge if there are alerts
      const lastRead = localStorage.getItem('mobistock_notifications_read_at');
      if (lastRead && newAlerts.length > 0) {
        // Only show badge if there's a NEW alert after lastRead
        // For now, since low stock is persistent, we'll just hide it if they clicked mark all as read recently
        setShowBadge(false);
      } else {
        setShowBadge(newAlerts.length > 0);
      }

    } catch (e) {
      console.error("Dashboard Fetch Error:", e);
    }
  };

  useEffect(() => {
    const handleRead = () => setShowBadge(false);
    window.addEventListener('mobistock_notifications_read', handleRead);
    return () => window.removeEventListener('mobistock_notifications_read', handleRead);
  }, []);

  if (!mounted) return null;

  const filteredProducts = bestSellers.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
    <main className="flex-1 md:ml-72 pt-24 md:pt-10 px-6 pb-24 md:pb-10 max-w-7xl mx-auto w-full">
      {/* Header area for desktop */}
      <motion.div {...fadeUp(0)} className="hidden md:flex justify-between items-end mb-12">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Overview</h2>
          <p className="text-on-surface-variant mt-1">Today&apos;s performance and key alerts.</p>
        </div>
        <div className="flex items-center gap-4">
          <motion.div
             layout
             className={`flex items-center bg-surface-container-lowest shadow-[0_8px_16px_-4px_rgba(15,23,42,0.05)] rounded-full overflow-hidden transition-colors ${isSearchActive ? 'w-64 border border-outline-variant/30' : 'w-12 h-12 justify-center hover:bg-surface-container-low'}`}
          >
            <button onClick={() => { setIsSearchActive(!isSearchActive); setSearchQuery(""); }} className="w-12 h-12 flex items-center justify-center shrink-0 text-on-surface">
              <span className="material-symbols-outlined">{isSearchActive ? 'close' : 'search'}</span>
            </button>
            {isSearchActive && (
               <input
                 autoFocus
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant pr-4 font-body"
                 placeholder="Search products..."
               />
            )}
          </motion.div>
          <Link href="/notifications" className="w-12 h-12 rounded-full bg-surface-container-lowest shadow-[0_8px_16px_-4px_rgba(15,23,42,0.05)] flex items-center justify-center text-on-surface hover:bg-surface-container-low transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            {showBadge && <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-error rounded-full outline outline-2 outline-surface-container-lowest"></span>}
          </Link>
          <Link href="/profile">
            <img alt="Admin" className="w-12 h-12 rounded-full object-cover shadow-[0_8px_16px_-4px_rgba(15,23,42,0.05)] ml-2 hover:opacity-80 transition-opacity" src={adminPhoto}/>
          </Link>
        </div>
      </motion.div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Today's Sales */}
        <motion.div
          {...scaleIn(0.1)}
          whileHover={{ y: -6, boxShadow: "0 20px 48px -8px rgba(111,251,190,0.45)" }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className="bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-[2rem] p-8 shadow-[0_20px_40px_-10px_rgba(15,23,42,0.15)] flex flex-col justify-between min-h-[200px] cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div className="font-['Manrope'] text-sm tracking-widest uppercase text-on-primary/70">Today&apos;s Sales</div>
            <span className="material-symbols-outlined text-on-primary/70">receipt_long</span>
          </div>
          <div>
            <div className="text-5xl font-bold tracking-tight mb-2">{formatCurrency(metrics.todaySales, settings)}</div>
            <div className="flex items-center gap-2 text-sm text-tertiary-fixed font-semibold">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              Updated just now
            </div>
          </div>
        </motion.div>

        {/* Total Revenue */}
        <motion.div
          {...scaleIn(0.2)}
          whileHover={{ y: -6, boxShadow: "0 20px 48px -8px rgba(111,251,190,0.35)" }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className="bg-surface-container-lowest rounded-[2rem] p-8 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.05)] flex flex-col justify-between min-h-[200px] cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div className="font-['Manrope'] text-sm tracking-widest uppercase text-on-surface-variant font-semibold">Total Revenue</div>
            <span className="material-symbols-outlined text-on-surface-variant">account_balance_wallet</span>
          </div>
          <div>
            <div className="text-4xl font-bold tracking-tight text-primary mb-2">{formatCurrency(metrics.totalRevenue, settings)}</div>
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold">
              <span className="material-symbols-outlined text-sm">arrow_upward</span>
              Lifetime Earnings
            </div>
          </div>
        </motion.div>


        {/* Total Profit */}
        <motion.div
          {...scaleIn(0.3)}
          whileHover={{ y: -6, boxShadow: "0 20px 48px -8px rgba(111,251,190,0.35)" }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className="bg-surface-container-lowest rounded-[2rem] p-8 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.05)] flex flex-col justify-between min-h-[200px] cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div className="font-['Manrope'] text-sm tracking-widest uppercase text-on-surface-variant font-semibold">Total Profit</div>
            <span className="material-symbols-outlined text-on-surface-variant">monitoring</span>
          </div>
          <div>
            <div className="text-4xl font-bold tracking-tight text-primary mb-2">{formatCurrency(metrics.totalProfit, settings)}</div>
            <div className="flex items-center gap-2 text-sm text-amber-600 font-semibold">
              <span className="material-symbols-outlined text-sm">trending_flat</span>
              Est. Profit (30%)
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Best Selling Products */}
        <motion.div {...fadeUp(0.35)} className="lg:col-span-2">
          <h3 className="text-xl font-bold text-primary mb-6">Best Selling Products</h3>
          <div className="bg-surface-container-low rounded-[2rem] p-4 flex flex-col gap-4">
            {filteredProducts.length > 0 ? filteredProducts.map((item, i) => (
              <motion.div
                key={item.sku}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.1, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
                whileHover={{ x: 6, boxShadow: "6px 0 24px -6px rgba(111,251,190,0.35)" }}
                onClick={() => setDetailProduct(item)}
                className="bg-surface-container-lowest rounded-xl p-4 flex items-center gap-6 shadow-[0_4px_12px_-4px_rgba(15,23,42,0.02)] min-h-[80px] cursor-pointer"
              >
                <motion.img whileHover={{ scale: 1.1 }} transition={{ duration: 0.25 }} alt={item.alt} className="w-16 h-16 rounded-lg object-cover" src={item.img}/>
                <div className="flex-1">
                  <h4 className="font-bold text-primary text-lg">{item.title}</h4>
                  <p className="text-sm text-on-surface-variant">{item.sku}</p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="font-bold text-primary text-xl">{item.sales}</div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Units Sold</p>
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-8 text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl mb-2 opacity-50">search_off</span>
                <p className="font-medium">No products match your search.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Alerts Section */}
        <motion.div {...fadeUp(0.45)}>
          <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
            Attention Required
            {showBadge && (
              <motion.span
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="w-2 h-2 rounded-full bg-error ml-1 inline-block"
              ></motion.span>
            )}
          </h3>
          <div className="bg-surface-container-low rounded-[2rem] p-4 flex flex-col gap-4">
            {alerts.length > 0 ? alerts.map((alert) => (
              <motion.div
                key={alert.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: alert.delay, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
                whileHover={{ x: -4, scale: 1.01 }}
                className={`bg-surface-container-lowest rounded-xl p-5 shadow-[0_4px_12px_-4px_rgba(15,23,42,0.02)] border-l-4 ${alert.border} cursor-pointer`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full ${alert.iconBg} ${alert.iconColor} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined">{alert.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase tracking-wider ${alert.badgeBg} px-2 py-0.5 rounded-sm`}>{alert.badge}</span>
                    </div>
                    <h4 className="font-bold text-primary text-md">{alert.title}</h4>
                    <p className="text-sm text-on-surface-variant mt-1">{alert.desc}</p>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="py-12 text-center text-on-surface-variant/40">
                <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                <p className="font-bold">All inventory levels are healthy.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>

    <AnimatePresence>
      {detailProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDetailProduct(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative w-full max-w-2xl bg-surface-container-lowest rounded-[3rem] shadow-2xl border border-outline-variant/15 overflow-hidden flex flex-col"
          >
            <div className="p-12 flex flex-col items-center text-center">
              <div className="relative mb-8 group">
                <div className="w-48 h-48 rounded-3xl bg-surface-container-low p-6 flex items-center justify-center shadow-inner">
                  <img 
                    src={detailProduct.img} 
                    alt={detailProduct.alt} 
                    className="max-h-full object-contain mix-blend-multiply drop-shadow-xl" 
                  />
                </div>
                <button 
                  onClick={() => setDetailProduct(null)}
                  className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-on-surface hover:rotate-90 transition-transform duration-300"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">Best Seller</span>
              <h2 className="text-4xl font-black text-primary tracking-tighter leading-none mb-2">{detailProduct.title}</h2>
              <p className="text-on-surface-variant font-bold text-sm mb-8">{detailProduct.sku}</p>

              <div className="grid grid-cols-2 gap-6 w-full max-w-sm mb-10">
                <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10">
                  <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-2">Total Sales</p>
                  <p className="font-headline font-black text-3xl text-primary">{detailProduct.sales}</p>
                </div>
                <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10">
                  <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-2">Stock Level</p>
                  <p className={`font-headline font-black text-3xl ${detailProduct.stock < (settings?.low_stock_threshold || 10) ? 'text-error' : 'text-emerald-600'}`}>
                    {detailProduct.stock}
                  </p>
                </div>
              </div>

              <p className="text-on-surface-variant leading-relaxed text-center opacity-70 mb-10">
                This item is currently one of your highest performing assets this month. With {detailProduct.sales} units sold, it maintains a strong market presence and consistent customer interest.
              </p>

              <button 
                onClick={() => setDetailProduct(null)}
                className="w-full py-5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all"
              >
                Close View
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
