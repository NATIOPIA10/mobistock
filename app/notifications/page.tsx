"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

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

export default function Notifications() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: settings } = await supabase.from('store_settings').select('*').eq('id', 1).single();
      const { data: products } = await supabase.from('products').select('*, variants(*)');
      const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5);

      const newAlerts: any[] = [];
      const currency = settings?.currency || "ETB";

      // 1. Check for Low Stock (Only if enabled in settings)
      if (settings?.notify_low_stock !== false) {
        products?.forEach(p => {
          const totalStock = p.variants.reduce((s: number, v: any) => s + v.stock, 0);
          if (totalStock === 0) {
            newAlerts.push({
              id: `stock-zero-${p.id}`,
              title: "Out of Stock!",
              desc: `${p.title} is completely sold out.`,
              time: "Critical",
              icon: "cancel",
              color: "text-error",
              bg: "bg-error-container"
            });
          } else if (totalStock < 5) {
            newAlerts.push({
              id: `stock-low-${p.id}`,
              title: "Low Stock Alert",
              desc: `${p.title} has only ${totalStock} units left.`,
              time: "Warning",
              icon: "warning",
              color: "text-amber-600",
              bg: "bg-amber-100"
            });
          }
        });
      }

      // 2. Check for Recent Orders
      orders?.forEach(o => {
        newAlerts.push({
          id: `order-${o.id}`,
          title: "New Sale Processed",
          desc: `Order for ${currency} ${o.total_amount.toLocaleString()} completed by ${o.customer_name}.`,
          time: timeAgo(o.created_at),
          icon: "receipt_long",
          color: "text-primary",
          bg: "bg-primary-container"
        });
      });

      setAlerts(newAlerts);
    } catch (e) {
      console.error("Notifications Error:", e);
    }
  };

  if (!mounted) return null;
  return (
    <main className="flex-1 md:ml-72 pt-20 md:pt-8 px-6 pb-24 md:pb-8 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-primary">Notifications</h2>
            <p className="text-on-surface-variant mt-1">Your recent alerts and messages.</p>
          </div>
          <button 
            onClick={() => {
              setAlerts([]);
              localStorage.setItem('mobistock_notifications_read_at', new Date().toISOString());
              window.dispatchEvent(new Event('mobistock_notifications_read'));
              alert("All notifications marked as read.");
            }}
            className="text-sm font-bold text-primary hover:underline"
          >
            Mark all as read
          </button>
        </motion.div>

        <div className="space-y-4">
          {alerts.length > 0 ? alerts.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              className="bg-surface-container-lowest rounded-2xl p-5 shadow-[0_8px_24px_-8px_rgba(25,28,30,0.06)] border border-outline-variant/15 flex items-start gap-4 hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${n.bg} ${n.color}`}>
                <span className="material-symbols-outlined">{n.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-on-surface">{n.title}</h4>
                  <span className="text-xs text-on-surface-variant font-medium">{n.time}</span>
                </div>
                <p className="text-sm text-on-surface-variant mt-1">{n.desc}</p>
              </div>
            </motion.div>
          )) : (
            <div className="text-center py-20 bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/20">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2">notifications_off</span>
              <p className="text-on-surface-variant font-medium">All caught up! No new alerts.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
