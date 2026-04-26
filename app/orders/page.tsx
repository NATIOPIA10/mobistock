"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const statusColors: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-600",
  pending: "bg-amber-500/10 text-amber-600",
  refunded: "bg-rose-500/10 text-rose-600",
  processing: "bg-primary/10 text-primary",
};

export default function Orders() {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState("all");
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    fetchSettings();
    fetchOrders();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
      if (data) setSettings(data);
    } catch (e) {
      console.error("Orders Settings Error:", e);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      if (data) {
        const formatted = data.map((o: any) => ({
          id: `#${o.id.substring(0, 4)}-${o.id.substring(o.id.length - 1).toUpperCase()}`,
          customer: o.customer_name,
          items: o.order_items.length,
          total: o.total_amount,
          method: o.payment_method,
          status: o.status,
          time: timeAgo(o.created_at),
          type: o.order_items.length > 2 ? "Multi-Item" : "Single-Sale"
        }));
        setDbOrders(formatted);
      }
    } catch (e) {
      console.error("Orders Fetch Error:", e);
    }
  };

  if (!mounted) return null;

  const filteredOrders = dbOrders.filter(o => filter === "all" || o.status === filter);

  return (
    <main className="flex-1 md:ml-72 pt-20 md:pt-0 min-h-screen pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
        >
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-primary">Orders History</h2>
            <p className="text-on-surface-variant mt-2 text-lg">Track and manage all transactions and sales.</p>
          </div>
          <div className="flex gap-2 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10">
            {["all", "completed", "pending", "refunded"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  filter === s 
                    ? "bg-primary text-on-primary shadow-lg" 
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Orders Table */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface-container-lowest rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(25,28,30,0.08)] border border-outline-variant/10 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant">
                  <th className="px-8 py-6">Order ID</th>
                  <th className="px-8 py-6">Customer</th>
                  <th className="px-8 py-6">Method / Type</th>
                  <th className="px-8 py-6 text-center">Items</th>
                  <th className="px-8 py-6">Total Amount</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                <AnimatePresence mode="popLayout">
                  {filteredOrders.map((order) => (
                    <motion.tr 
                      key={order.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-surface-container-low/30 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <span className="font-headline font-black text-primary group-hover:text-secondary transition-colors cursor-pointer underline decoration-dotted decoration-primary/30 underline-offset-4">
                          {order.id}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-xs text-primary">
                            {order.customer[0]}
                          </div>
                          <span className="font-bold text-on-surface">{order.customer}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-on-surface">{order.method}</span>
                          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-black">{order.type}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="bg-surface-container-highest px-3 py-1 rounded-full text-xs font-black text-primary">
                          {order.items}
                        </span>
                      </td>
                      <td className="px-8 py-6 font-headline font-black text-primary">
                        {formatCurrency(order.total, settings)}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right text-sm font-bold text-on-surface-variant">
                        {order.time}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          {filteredOrders.length === 0 && (
            <div className="py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 mb-4">history</span>
              <p className="font-bold text-on-surface-variant">No orders found matching this filter.</p>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
