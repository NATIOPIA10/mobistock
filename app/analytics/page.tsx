"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/currency";

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Data sets for different ranges
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const CustomTooltip = ({ active, payload, label, settings }: { active?: boolean; payload?: any[]; label?: string; settings: any }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-[0_20px_40px_-10px_rgba(25,28,30,0.15)] border border-outline-variant/10">
        <p className="text-xs uppercase tracking-widest text-on-surface-variant font-semibold mb-2">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} className="text-sm font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
            <span className="text-on-surface-variant">{p.name}:</span>
            <span className="text-primary">{p.dataKey === "transactions" ? p.value : formatCurrency(p.value, settings)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [mounted, setMounted] = useState(false);
  const [activeRange, setActiveRange] = useState("30D");
  
  // Real Database State
  const [chartData, setChartData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      fetchAnalytics();
    }
  }, [activeRange, settings]);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
      if (data) setSettings(data);
    } catch (e) {
      console.error("Analytics Settings Error:", e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Calculate start date based on activeRange
      let startDate = new Date();
      if (activeRange === "7D") startDate.setDate(startDate.getDate() - 7);
      else if (activeRange === "30D") startDate.setDate(startDate.getDate() - 30);
      else if (activeRange === "90D") startDate.setDate(startDate.getDate() - 90);
      else if (activeRange === "YTD") startDate = new Date(new Date().getFullYear(), 0, 1);
      
      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .gte('created_at', startDate.toISOString());

      const { data: products } = await supabase.from('products').select('*, variants(*)');

      if (orders && products) {
        // 1. Calculate Metrics
        const totalRev = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
        const avgValue = orders.length > 0 ? totalRev / orders.length : 0;
        
        setMetrics([
          { label: "Total Revenue", value: formatCurrency(totalRev, settings), sub: "Range Total", icon: "account_balance_wallet", color: "from-primary to-primary-container", textColor: "text-on-primary", subColor: "text-on-primary/70" },
          { label: "Avg. Order Value", value: formatCurrency(avgValue, settings), sub: "Global Average", icon: "shopping_cart", color: "bg-surface-container-lowest", textColor: "text-primary", subColor: "text-emerald-600" },
          { label: "Total Transactions", value: orders.length.toString(), sub: "Processed Orders", icon: "receipt_long", color: "bg-surface-container-lowest", textColor: "text-primary", subColor: "text-emerald-600" },
          { label: "Return Rate", value: "0.0%", sub: "Zero refunds yet", icon: "keyboard_return", color: "bg-surface-container-lowest", textColor: "text-primary", subColor: "text-emerald-600" },
        ]);

        // 2. Chart Data (Simple aggregation by date)
        const daily = orders.reduce((acc: any, o) => {
          const date = o.created_at.split('T')[0];
          acc[date] = (acc[date] || 0) + Number(o.total_amount);
          return acc;
        }, {});
        
        setChartData(Object.entries(daily).map(([date, rev]) => ({ 
          month: date.split('-').slice(1).join('/'), 
          revenue: rev, 
          profit: Number(rev) * 0.3 
        })));

        // 3. Best Sellers Calculation
        const productStats: Record<string, { sold: number, revenue: number }> = {};
        const variantToProduct: Record<string, string> = {};
        
        products.forEach(p => {
          if (p.variants) {
            p.variants.forEach((v: any) => {
              variantToProduct[v.id] = p.id;
            });
          }
        });

        orders.forEach(order => {
          if (order.order_items) {
            order.order_items.forEach((item: any) => {
              const productId = variantToProduct[item.variant_id];
              if (productId) {
                if (!productStats[productId]) productStats[productId] = { sold: 0, revenue: 0 };
                productStats[productId].sold += Number(item.quantity || 0);
                productStats[productId].revenue += Number(item.quantity || 0) * Number(item.price_at_sale || 0);
              }
            });
          }
        });

        const sortedBest = products
          .map(p => ({
            name: p.title,
            sku: p.sku,
            sold: productStats[p.id]?.sold || 0,
            revenue: productStats[p.id]?.revenue || 0,
            trend: "up"
          }))
          .filter(p => p.sold > 0)
          .sort((a, b) => b.sold - a.sold)
          .slice(0, 5);

        setBestSellers(sortedBest);

        // 4. Categories (Revenue based)
        const categoryRev: any = {};
        let totalSalesVal = 0;

        orders.forEach(order => {
          if (order.order_items) {
            order.order_items.forEach((item: any) => {
              const productId = variantToProduct[item.variant_id];
              const prod = products.find(p => p.id === productId);
              const cat = prod?.category || "Other";
              const rev = Number(item.quantity || 0) * Number(item.price_at_sale || 0);
              categoryRev[cat] = (categoryRev[cat] || 0) + rev;
              totalSalesVal += rev;
            });
          }
        });

        // Fallback to product count if no orders yet
        if (totalSalesVal === 0) {
          products.forEach(p => {
            categoryRev[p.category] = (categoryRev[p.category] || 0) + 1;
            totalSalesVal += 1;
          });
        }

        setCategories(Object.entries(categoryRev).map(([name, val], idx) => ({
          name, 
          value: totalSalesVal > 0 ? Math.round((Number(val) / totalSalesVal) * 100) : 0, 
          color: [`var(--color-primary)`, `var(--color-secondary)`, `var(--color-tertiary-fixed)`, `#f59e0b`, `#10b981`][idx % 5]
        })));
      }
    } catch (e) {
      console.error("Analytics Error:", e);
    }
  };

  const handleExport = () => {
    const headers = ["Date", "Revenue", "Profit"];
    const csv = [headers.join(","), ...chartData.map(d => `${d.month},${d.revenue},${d.profit}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MobiStock_Analytics_${activeRange}.csv`;
    a.click();
    alert("Exporting real data from database...");
  };

  if (!mounted) return null;

  const currentData = {
    revenue: chartData,
    metrics: metrics
  };

  return (
    <main className="flex-1 md:ml-72 pt-20 md:pt-0 min-h-screen pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
        {/* Header */}
        <motion.div {...fadeUp(0)} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-primary">Sales Analytics</h2>
            <p className="text-on-surface-variant mt-2 text-lg">Revenue, transactions, and performance insights.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {["7D", "30D", "90D", "YTD"].map((range, i) => (
              <motion.button
                key={range}
                onClick={() => setActiveRange(range)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeRange === range 
                    ? "bg-primary text-on-primary shadow-xl shadow-primary/20 scale-105" 
                    : "bg-surface-container-highest text-on-surface hover:bg-surface-dim"
                }`}
              >
                {range}
              </motion.button>
            ))}
            <motion.button
              onClick={handleExport}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider bg-surface-container-highest text-on-surface hover:bg-surface-dim flex items-center gap-2 active:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">download</span> Export
            </motion.button>
          </div>
        </motion.div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          {currentData.metrics.map((m: any, i: number) => (
            <motion.div
              key={m.label + activeRange}
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              whileHover={{ y: -6, boxShadow: "0 20px 48px -8px rgba(111,251,190,0.4)" }}
              className={`rounded-2xl p-6 flex flex-col justify-between min-h-[140px] cursor-pointer shadow-[0_8px_24px_-8px_rgba(25,28,30,0.06)] ${i === 0 ? `bg-gradient-to-br ${m.color}` : m.color} border border-outline-variant/10`}
            >
              <div className="flex justify-between items-start">
                <p className={`text-xs uppercase tracking-widest font-semibold ${i === 0 ? "text-on-primary/70" : "text-on-surface-variant"}`}>{m.label}</p>
                <span className={`material-symbols-outlined text-xl ${i === 0 ? "text-on-primary/60" : "text-on-surface-variant/60"}`}>{m.icon}</span>
              </div>
              <div>
                <div className={`text-3xl font-extrabold tracking-tight mb-1 ${m.textColor}`}>{m.value}</div>
                <div className={`text-xs font-semibold flex items-center gap-1 ${m.subColor}`}>
                  <span className="material-symbols-outlined text-[13px]">{m.sub.includes("+") ? "trending_up" : "trending_down"}</span>
                  {m.sub}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Revenue Chart */}
        <motion.div
          key={activeRange}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_8px_24px_-8px_rgba(25,28,30,0.05)] border border-outline-variant/10 mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-primary">Revenue & Profit Overview</h3>
              <p className="text-sm text-on-surface-variant">Performance analysis for the {activeRange} range</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary inline-block"></span>Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-tertiary-fixed inline-block"></span>Profit</span>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentData.revenue}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-tertiary-fixed)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--color-tertiary-fixed)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant)" opacity={0.2} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: "var(--color-on-surface-variant)" }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: "var(--color-on-surface-variant)" }}
                  tickFormatter={(value) => {
                    const converted = settings ? (settings.currency !== 'ETB' ? value / (settings.exchange_rate || 1) : value) : value;
                    return `${settings?.currency || 'ETB'} ${converted >= 1000 ? (converted / 1000).toFixed(0) + 'k' : converted.toFixed(0)}`;
                  }}
                />
                <Tooltip content={<CustomTooltip settings={settings} />} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--color-primary)" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="var(--color-tertiary-fixed)" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          {/* Top Selling Products */}
          <motion.div {...fadeUp(0.4)} className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_8px_24px_-8px_rgba(25,28,30,0.05)] border border-outline-variant/10">
            <h3 className="text-xl font-bold text-primary mb-6">Top Selling Products</h3>
            <div className="space-y-6">
              {bestSellers.map((p, i) => (
                <div key={p.sku} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest text-primary flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-primary text-sm group-hover:text-secondary transition-colors">{p.name}</h4>
                      <p className="text-xs text-on-surface-variant font-semibold">{p.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary text-sm">{formatCurrency(p.revenue, settings)}</div>
                    <div className="text-[10px] font-black uppercase text-secondary flex items-center justify-end gap-1">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span>
                      {p.sold} units
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Sales by Category */}
          <motion.div {...fadeUp(0.5)} className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_8px_24px_-8px_rgba(25,28,30,0.05)] border border-outline-variant/10">
            <h3 className="text-xl font-bold text-primary mb-6">Sales by Category</h3>
            <div className="h-[250px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {categories.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }}></div>
                  <span className="text-xs font-bold text-on-surface-variant truncate max-w-[80px]">{c.name}</span>
                  <span className="text-xs font-black text-primary ml-auto">{c.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
