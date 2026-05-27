"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/currency";

// ─── Helpers ────────────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const CustomTooltip = ({
  active, payload, label, settings,
}: {
  active?: boolean; payload?: any[]; label?: string; settings: any;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-[0_20px_40px_-10px_rgba(25,28,30,0.15)] border border-outline-variant/10">
        <p className="text-xs uppercase tracking-widest text-on-surface-variant font-semibold mb-2">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} className="text-sm font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-on-surface-variant">{p.name}:</span>
            <span className="text-primary">{formatCurrency(p.value, settings)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function Analytics() {
  const [mounted, setMounted] = useState(false);
  const [activeRange, setActiveRange] = useState("30D");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  // DB state
  const [chartData, setChartData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ currency: "ETB", exchange_rate: 1 });

  // Auth is confirmed once we have a valid user
  const [authed, setAuthed] = useState(false);

  // ── Init: verify auth + load settings once ──────────────────────────────
  useEffect(() => {
    setMounted(true);

    (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log("[Analytics] getUser →", user?.id ?? "none", error?.message ?? "");

        if (error || !user) {
          setAuthError(true);
          setLoading(false);
          return;
        }

        // Load store settings (RLS gives us only this user's row)
        const { data: s, error: sErr } = await supabase
          .from("store_settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        console.log("[Analytics] settings →", s, sErr?.message ?? "");
        if (s) setSettings(s);

        setAuthed(true); // triggers the fetch effect below
      } catch (err) {
        console.error("[Analytics] init error:", err);
        setAuthError(true);
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch data whenever range changes (after auth confirmed) ─────────────
  useEffect(() => {
    if (!authed) return;
    fetchAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRange, authed]);

  // ── Core fetch ───────────────────────────────────────────────────────────
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Date window
      let startDate = new Date();
      if (activeRange === "7D")  startDate.setDate(startDate.getDate() - 7);
      if (activeRange === "30D") startDate.setDate(startDate.getDate() - 30);
      if (activeRange === "90D") startDate.setDate(startDate.getDate() - 90);
      if (activeRange === "YTD") startDate = new Date(new Date().getFullYear(), 0, 1);

      // Fetch orders + products in parallel
      const [ordersRes, productsRes] = await Promise.all([
        supabase.from("orders").select("*, order_items(*)").gte("created_at", startDate.toISOString()),
        supabase.from("products").select("*, variants(*)"),
      ]);

      const orders   = ordersRes.data   ?? [];
      const products = productsRes.data ?? [];

      console.log("[Analytics] orders:", orders.length, ordersRes.error?.message ?? "ok");
      console.log("[Analytics] products:", products.length, productsRes.error?.message ?? "ok");

      // ── 1. Metrics ──────────────────────────────────────────────────────
      const totalRev = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const avgValue = orders.length > 0 ? totalRev / orders.length : 0;

      setMetrics([
        {
          label: "Total Revenue",
          value: formatCurrency(totalRev, settings),
          sub: "Range Total",
          icon: "account_balance_wallet",
          gradient: true,
        },
        {
          label: "Avg. Order Value",
          value: formatCurrency(avgValue, settings),
          sub: "Per Transaction",
          icon: "shopping_cart",
          gradient: false,
        },
        {
          label: "Total Transactions",
          value: orders.length.toString(),
          sub: "Processed Orders",
          icon: "receipt_long",
          gradient: false,
        },
        {
          label: "Return Rate",
          value: "0.0%",
          sub: "Zero refunds yet",
          icon: "keyboard_return",
          gradient: false,
        },
      ]);

      // ── 2. Chart data — aggregate by date ───────────────────────────────
      const daily: Record<string, number> = {};
      orders.forEach((o) => {
        const day = o.created_at.split("T")[0];
        daily[day] = (daily[day] ?? 0) + Number(o.total_amount);
      });

      const chart = Object.entries(daily)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, rev]) => ({
          month: date.slice(5),          // "MM-DD"
          revenue: rev,
          profit: rev * 0.3,
        }));

      setChartData(chart);

      // ── 3. Best sellers ─────────────────────────────────────────────────
      // Build variant → product map
      const variantToProduct: Record<string, string> = {};
      products.forEach((p) => {
        (p.variants ?? []).forEach((v: any) => {
          variantToProduct[v.id] = p.id;
        });
      });

      const productStats: Record<string, { sold: number; revenue: number }> = {};
      orders.forEach((order) => {
        (order.order_items ?? []).forEach((item: any) => {
          const pid = variantToProduct[item.variant_id];
          if (pid) {
            if (!productStats[pid]) productStats[pid] = { sold: 0, revenue: 0 };
            productStats[pid].sold    += Number(item.quantity ?? 0);
            productStats[pid].revenue += Number(item.quantity ?? 0) * Number(item.price_at_sale ?? 0);
          }
        });
      });

      const topSellers = products
        .map((p) => ({
          name:    p.title,
          sku:     p.sku,
          sold:    productStats[p.id]?.sold    ?? 0,
          revenue: productStats[p.id]?.revenue ?? 0,
        }))
        .filter((p) => p.sold > 0)
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5);

      setBestSellers(topSellers);

      // ── 4. Sales by category ────────────────────────────────────────────
      const categoryRev: Record<string, number> = {};
      let totalSalesVal = 0;

      orders.forEach((order) => {
        (order.order_items ?? []).forEach((item: any) => {
          const pid  = variantToProduct[item.variant_id];
          const prod = products.find((p) => p.id === pid);
          const cat  = prod?.category ?? "Other";
          const rev  = Number(item.quantity ?? 0) * Number(item.price_at_sale ?? 0);
          categoryRev[cat] = (categoryRev[cat] ?? 0) + rev;
          totalSalesVal    += rev;
        });
      });

      const catColors = [
        "var(--color-primary)",
        "var(--color-secondary)",
        "#f59e0b",
        "#10b981",
        "#8b5cf6",
      ];

      setCategories(
        Object.entries(categoryRev).map(([name, val], idx) => ({
          name,
          value:   totalSalesVal > 0 ? Math.round((val / totalSalesVal) * 100) : 0,
          revenue: val,
          color:   catColors[idx % catColors.length],
        }))
      );
    } catch (err) {
      console.error("[Analytics] fetchAnalytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const rows = [
      ["Date", "Revenue", "Profit"],
      ...chartData.map((d) => [d.month, d.revenue, d.profit]),
    ];
    const csv  = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `MobiStock_Analytics_${activeRange}.csv`;
    a.click();
  };

  // ── Guards ───────────────────────────────────────────────────────────────
  if (!mounted) return null;

  if (authError) {
    return (
      <main className="flex-1 md:ml-72 pt-20 md:pt-0 min-h-screen pb-24 md:pb-8 flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant block">lock</span>
          <h2 className="text-xl font-bold text-primary">Not Signed In</h2>
          <p className="text-on-surface-variant text-sm">Please log in to view your analytics.</p>
        </div>
      </main>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
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
            {["7D", "30D", "90D", "YTD"].map((range) => (
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
              className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider bg-surface-container-highest text-on-surface hover:bg-surface-dim flex items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export
            </motion.button>
          </div>
        </motion.div>

        {/* ── Metric Cards ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl p-6 min-h-[140px] bg-surface-container-highest animate-pulse border border-outline-variant/10" />
            ))}
          </div>
        ) : metrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 mb-10 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-3">bar_chart</span>
            <p className="text-on-surface-variant font-semibold">No orders found for this period</p>
            <p className="text-on-surface-variant/60 text-sm mt-1">Try a wider date range or make some sales first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label + activeRange}
                initial={{ opacity: 0, scale: 0.93 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as any }}
                whileHover={{ y: -6, boxShadow: "0 20px 48px -8px rgba(111,251,190,0.4)" }}
                className={`rounded-2xl p-6 flex flex-col justify-between min-h-[140px] cursor-pointer shadow-[0_8px_24px_-8px_rgba(25,28,30,0.06)] border border-outline-variant/10 ${
                  m.gradient
                    ? "bg-gradient-to-br from-primary to-primary-container"
                    : "bg-surface-container-lowest"
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className={`text-xs uppercase tracking-widest font-semibold ${m.gradient ? "text-on-primary/70" : "text-on-surface-variant"}`}>
                    {m.label}
                  </p>
                  <span className={`material-symbols-outlined text-xl ${m.gradient ? "text-on-primary/60" : "text-on-surface-variant/60"}`}>
                    {m.icon}
                  </span>
                </div>
                <div>
                  <div className={`text-3xl font-extrabold tracking-tight mb-1 ${m.gradient ? "text-on-primary" : "text-primary"}`}>
                    {m.value}
                  </div>
                  <div className={`text-xs font-semibold flex items-center gap-1 ${m.gradient ? "text-on-primary/70" : "text-emerald-600"}`}>
                    <span className="material-symbols-outlined text-[13px]">trending_up</span>
                    {m.sub}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Revenue & Profit Chart ── */}
        <motion.div
          key={activeRange}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_8px_24px_-8px_rgba(25,28,30,0.05)] border border-outline-variant/10 mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-primary">Revenue &amp; Profit Overview</h3>
              <p className="text-sm text-on-surface-variant">Performance for the {activeRange} range</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary inline-block" />Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />Profit
              </span>
            </div>
          </div>

          {loading ? (
            <div className="h-[350px] w-full bg-surface-container-highest animate-pulse rounded-xl" />
          ) : chartData.length === 0 ? (
            <div className="h-[350px] flex flex-col items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2">show_chart</span>
              <p className="font-semibold">No revenue data for this period</p>
            </div>
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--color-primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                    tickFormatter={(v) => {
                      const cur = settings?.currency ?? "ETB";
                      return `${cur} ${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v.toFixed(0)}`;
                    }}
                  />
                  <Tooltip content={<CustomTooltip settings={settings} />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--color-primary)" strokeWidth={3} fill="url(#gRev)" />
                  <Area type="monotone" dataKey="profit"  name="Profit"  stroke="#10b981"               strokeWidth={3} fill="url(#gProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* ── Bottom Section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">

          {/* Top Selling Products */}
          <motion.div {...fadeUp(0.4)} className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_8px_24px_-8px_rgba(25,28,30,0.05)] border border-outline-variant/10">
            <h3 className="text-xl font-bold text-primary mb-6">Top Selling Products</h3>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-surface-container-highest animate-pulse rounded-xl" />
                ))}
              </div>
            ) : bestSellers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                <p className="font-semibold text-sm">No sales data yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {bestSellers.map((p, i) => (
                  <div key={p.sku} className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface-container-highest text-primary flex items-center justify-center font-bold text-sm shrink-0">
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
            )}
          </motion.div>

          {/* Sales by Category */}
          <motion.div {...fadeUp(0.5)} className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_8px_24px_-8px_rgba(25,28,30,0.05)] border border-outline-variant/10">
            <h3 className="text-xl font-bold text-primary mb-6">Sales by Category</h3>
            {loading ? (
              <div className="h-[250px] bg-surface-container-highest animate-pulse rounded-xl" />
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant h-[250px]">
                <span className="material-symbols-outlined text-4xl mb-2">pie_chart</span>
                <p className="font-semibold text-sm">No category data</p>
              </div>
            ) : (
              <>
                <div className="h-[220px] mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categories} innerRadius={60} outerRadius={85} paddingAngle={6} dataKey="value">
                        {categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => `${val}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((c) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-on-surface-variant truncate">{c.name}</span>
                        <span className="text-[9px] font-black text-primary">{formatCurrency(c.revenue, settings)}</span>
                      </div>
                      <span className="text-xs font-black text-secondary ml-auto">{c.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>

        </div>
      </div>
    </main>
  );
}
