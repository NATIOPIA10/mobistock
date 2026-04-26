"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/currency";

export default function Inventory() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Real Metrics
  const [stats, setStats] = useState({ totalItems: 0, lowStock: 0, totalValue: 0 });
  const [settings, setSettings] = useState<any>(null);

  // Edit State
  const [editData, setEditData] = useState<any>({ title: "", brand: "", sku: "", category: "" });

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      fetchInventory();
    }
  }, [settings]);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
      if (data) setSettings(data);
    } catch (e) {
      console.error("Inventory Settings Error:", e);
    }
  };

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, variants(*)');
      
      if (error) throw error;

      if (data) {
        let totalVal = 0;
        let lowS = 0;

        const formatted = data.map((p: any) => {
          const totalStock = p.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
          const minPrice = Math.min(...p.variants.map((v: any) => v.price));
          const maxPrice = Math.max(...p.variants.map((v: any) => v.price));
          
          totalVal += p.variants.reduce((sum: number, v: any) => sum + (v.stock * v.price), 0);
          const threshold = settings?.low_stock_threshold || 10;
          if (totalStock > 0 && totalStock < threshold) lowS++;

          return {
            id: p.id,
            sku: p.sku,
            brand: p.brand,
            title: p.title,
            name: `${p.brand} ${p.title}`,
            category: p.category,
            status: totalStock === 0 ? "out-of-stock" : totalStock < (settings?.low_stock_threshold || 10) ? "low-stock" : "in-stock",
            variantCount: p.variants.length,
            variants: p.variants,
            stock: totalStock,
            price: minPrice === maxPrice 
              ? formatCurrency(minPrice, settings) 
              : `${formatCurrency(minPrice, settings)} - ${formatCurrency(maxPrice, settings)}`,
            img: p.image_url
          };
        });
        setItems(formatted);
        setStats({
          totalItems: data.length,
          lowStock: lowS,
          totalValue: totalVal
        });
      }
    } catch (e) {
      console.error("Fetch Error:", e);
    }
  };

  const openEdit = (product: any) => {
    setSelectedProduct(product);
    setEditData({
      title: product.title,
      brand: product.brand,
      sku: product.sku,
      category: product.category || "Smartphones",
      variants: product.variants.map((v: any) => ({ ...v }))
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      // 1. Update Product
      const { error: pError } = await supabase
        .from('products')
        .update({
          title: editData.title,
          brand: editData.brand,
          sku: editData.sku,
          category: editData.category
        })
        .eq('id', selectedProduct.id);

      if (pError) throw pError;

      // 2. Update Variants Stock
      for (const variant of editData.variants) {
        const { error: vError } = await supabase
          .from('variants')
          .update({ stock: variant.stock })
          .eq('id', variant.id);
        
        if (vError) throw vError;
      }

      setIsEditing(false);
      fetchInventory();
      alert("Product and stock updated successfully!");
    } catch (e: any) {
      alert(`Error updating product: ${e.message}`);
    }
  };

  const handleStatusChange = async (sku: string, status: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: status }) // Assuming a status column exists or adding one
        .eq('sku', sku);
      
      if (error) throw error;
      
      setItems(items.map(item => item.sku === sku ? { ...item, status } : item));
      setActiveMenuId(null);
      alert(`Product marked as ${status}.`);
    } catch (e: any) {
      alert(`Error updating status: ${e.message}`);
    }
  };

  const handleDelete = async (sku: string) => {
    if (confirm("Are you sure you want to delete this product COMPLETELY from the database? This will also remove its variants.")) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('sku', sku);

        if (error) throw error;

        // Log the deletion
        await supabase.from('security_logs').insert({
          event: "Product Deleted",
          details: `Product with SKU ${sku} was permanently deleted by admin.`,
          status: "success"
        });

        setItems(items.filter(item => item.sku !== sku));
        setActiveMenuId(null);
        alert("Product deleted completely.");
      } catch (e: any) {
        alert(`Error deleting product: ${e.message}`);
      }
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <>
      <main className="flex-1 md:ml-72 pt-20 md:pt-0 min-h-screen pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
          >
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight text-primary">Inventory Management</h2>
              <p className="text-on-surface-variant mt-2 text-lg">Manage products, variants, and stock levels.</p>
            </div>
            <motion.button
              onClick={() => router.push('/inventory/new')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="bg-primary text-on-primary rounded-full px-8 py-4 font-bold tracking-wide flex items-center justify-center gap-2 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] shrink-0 w-full md:w-auto"
            >
              <span className="material-symbols-outlined">add</span>
              Add New Product
            </motion.button>
          </motion.div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* Total Products */}
            <motion.div
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              whileHover={{ y: -6, boxShadow: "0 20px 48px -8px rgba(111,251,190,0.45)" }}
              className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_-10px_rgba(25,28,30,0.05)] border border-outline-variant/15 flex flex-col justify-between cursor-pointer"
            >
              <div className="flex justify-between items-start mb-6">
                <span className="material-symbols-outlined text-3xl text-secondary">inventory_2</span>
                <span className="text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span> +12%
                </span>
              </div>
              <div>
                <p className="text-on-surface-variant text-sm uppercase tracking-wider font-semibold mb-1">Total Products</p>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="text-5xl font-extrabold text-primary tracking-tighter"
                >
                  {stats.totalItems}
                </motion.h3>
              </div>
            </motion.div>

            {/* Low Stock Alert */}
            <motion.div
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              whileHover={{ y: -6, boxShadow: "0 20px 48px -8px rgba(111,251,190,0.45)" }}
              className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_-10px_rgba(25,28,30,0.05)] border border-outline-variant/15 flex flex-col justify-between relative overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full -mr-8 -mt-8"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <motion.span
                  animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 3, repeatDelay: 2 }}
                  className="material-symbols-outlined text-3xl text-amber-500"
                >
                  warning
                </motion.span>
              </div>
              <div className="relative z-10">
                <p className="text-on-surface-variant text-sm uppercase tracking-wider font-semibold mb-1">Low Stock Items</p>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.35 }}
                  className="text-5xl font-extrabold text-primary tracking-tighter"
                >
                  {stats.lowStock}
                </motion.h3>
              </div>
            </motion.div>

            {/* Total Value */}
            <motion.div
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.3, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              whileHover={{ y: -6, boxShadow: "0 20px 48px -8px rgba(111,251,190,0.55)" }}
              className="bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl p-8 shadow-[0_20px_40px_-10px_rgba(25,28,30,0.05)] border border-outline-variant/15 flex flex-col justify-between cursor-pointer"
            >
              <div className="flex justify-between items-start mb-6">
                <span className="material-symbols-outlined text-3xl text-white/80">account_balance_wallet</span>
              </div>
              <div>
                <p className="text-white/70 text-sm uppercase tracking-wider font-semibold mb-1">Total Inventory Value</p>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="text-5xl font-extrabold tracking-tighter"
                >
                  {formatCurrency(stats.totalValue, settings)}
                </motion.h3>
              </div>
            </motion.div>
          </div>

          {/* Catalog */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4"
            >
              <h3 className="text-2xl font-bold tracking-tight text-primary">Current Catalog</h3>
              <div className="relative w-full sm:w-96">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input
                  className="w-full bg-surface-container-lowest rounded-full py-4 pl-12 pr-6 text-on-surface placeholder:text-outline border-none shadow-[0_10px_20px_-5px_rgba(25,28,30,0.04)] focus:ring-2 focus:ring-secondary-container transition-all outline-none"
                  placeholder="Search SKU, Name..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </motion.div>

            <div className="space-y-6">
              {filteredItems.length > 0 ? filteredItems.map((item, i) => (
                <motion.div
                  key={item.sku}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.45 + i * 0.12, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
                  whileHover={{ scale: 1.01, boxShadow: "0 16px 48px -8px rgba(111,251,190,0.45)" }}
                  className="bg-surface-container-lowest rounded-xl p-6 flex flex-col lg:flex-row items-center gap-6 shadow-[0_10px_30px_-10px_rgba(25,28,30,0.06)] border border-outline-variant/15"
                >
                  <div className="w-full lg:w-32 h-32 rounded-lg bg-surface-container overflow-hidden shrink-0">
                    <motion.img
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.4 }}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      src={item.img}
                    />
                  </div>

                  <div className="flex-1 text-center lg:text-left">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-2 justify-center lg:justify-start">
                      <span className="bg-surface text-on-surface px-2 py-1 rounded text-xs font-bold uppercase tracking-widest border border-outline-variant/20">
                        SKU: {item.sku}
                      </span>
                      {item.status === "in-stock" || item.status === "active" ? (
                        <span className="bg-tertiary-fixed/20 text-on-tertiary-fixed px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max mx-auto lg:mx-0 shadow-[0_0_15px_rgba(111,251,190,0.2)]">
                          <div className="w-2 h-2 rounded-full bg-tertiary-fixed animate-pulse"></div> Good Stage
                        </span>
                      ) : item.status === "suspended" ? (
                        <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max mx-auto lg:mx-0">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div> Suspended
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max mx-auto lg:mx-0">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div> Low Stock
                        </span>
                      )}
                    </div>
                    <h4 className="text-xl font-bold text-primary mb-1">{item.name}</h4>
                    <p className="text-on-surface-variant text-sm">{item.category}</p>
                  </div>

                  <div className="flex gap-8 items-center bg-surface-container-low px-6 py-4 rounded-lg w-full lg:w-auto justify-between lg:justify-start">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold mb-1">Variants</p>
                      <p className="text-lg font-bold text-primary">{item.variantCount}</p>
                    </div>
                    <div className="w-px h-10 bg-outline-variant/30"></div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold mb-1">Total Stock</p>
                      <p className={`text-lg font-bold ${item.status === "low-stock" ? "text-amber-600" : "text-primary"}`}>{item.stock}</p>
                    </div>
                    <div className="w-px h-10 bg-outline-variant/30"></div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold mb-1">Price ({settings?.currency || "ETB"})</p>
                      <p className="text-xl font-extrabold text-primary">{item.price}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full lg:w-auto justify-end relative">
                    <motion.button
                      whileHover={{ scale: 1.15, rotate: 12 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-3 text-outline hover:text-primary hover:bg-surface-container rounded-full transition-colors"
                      onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </motion.button>
                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className={`p-3 rounded-full transition-colors ${activeMenuId === item.sku ? 'bg-primary text-on-primary' : 'text-outline hover:text-primary hover:bg-surface-container'}`}
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.sku ? null : item.sku); }}
                      >
                        <span className="material-symbols-outlined">more_vert</span>
                      </motion.button>

                      <AnimatePresence>
                        {activeMenuId === item.sku && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10, x: -120 }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: -140 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10, x: -120 }}
                            className="absolute z-50 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 p-2 w-40 top-0 overflow-hidden"
                          >
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(item.sku, 'active'); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container-low flex items-center gap-2">
                              <span className="material-symbols-outlined text-tertiary text-[18px]">check_circle</span> Active
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(item.sku, 'suspended'); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container-low flex items-center gap-2">
                              <span className="material-symbols-outlined text-amber-500 text-[18px]">pause_circle</span> Suspend
                            </button>
                            <div className="h-px bg-outline-variant/15 my-1 mx-2" />
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(item.sku); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-error hover:bg-error/5 flex items-center gap-2">
                              <span className="material-symbols-outlined text-[18px]">delete</span> Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-20 bg-surface-container-lowest rounded-3xl border border-outline-variant/15 border-dashed">
                  <span className="material-symbols-outlined text-5xl mb-4 text-on-surface-variant/30">search_off</span>
                  <p className="text-xl font-bold text-primary">No products found</p>
                  <p className="text-on-surface-variant mt-1">Try searching for a different SKU or name.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isEditing && selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-surface-container-lowest rounded-[2.5rem] shadow-2xl border border-outline-variant/15 overflow-hidden"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low">
                <div>
                  <h2 className="text-2xl font-black text-primary">Edit Product</h2>
                  <p className="text-on-surface-variant text-sm mt-1">Updating <span className="font-bold text-secondary">{selectedProduct.name}</span></p>
                </div>
                <button onClick={() => setIsEditing(false)} className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface hover:rotate-90 transition-transform duration-300">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-xs uppercase tracking-widest font-black text-on-surface-variant mb-2 ml-1">Product Title</label>
                    <input 
                      value={editData.title} 
                      onChange={(e) => setEditData({...editData, title: e.target.value})}
                      className="w-full bg-surface-container-low rounded-2xl py-4 px-6 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-black text-on-surface-variant mb-2 ml-1">Brand</label>
                    <input 
                      value={editData.brand} 
                      onChange={(e) => setEditData({...editData, brand: e.target.value})}
                      className="w-full bg-surface-container-low rounded-2xl py-4 px-6 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-black text-on-surface-variant mb-2 ml-1">SKU</label>
                    <input 
                      value={editData.sku} 
                      onChange={(e) => setEditData({...editData, sku: e.target.value})}
                      className="w-full bg-surface-container-low rounded-2xl py-4 px-6 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container transition-all" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs uppercase tracking-widest font-black text-on-surface-variant mb-2 ml-1">Category</label>
                    <select 
                      value={editData.category} 
                      onChange={(e) => setEditData({...editData, category: e.target.value})}
                      className="w-full bg-surface-container-low rounded-2xl py-4 px-6 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container transition-all"
                    >
                      {(settings?.product_categories?.split(',').map((c: string) => c.trim()) || ["Smartphones", "Tablets", "Wearables", "Accessories", "Gaming"]).map((cat: string) => (
                        <option key={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Variant Stock Management */}
                  <div className="col-span-2 border-t border-outline-variant/10 pt-6 mt-2">
                    <label className="block text-xs uppercase tracking-widest font-black text-on-surface-variant mb-4 ml-1">Inventory Levels (Variants)</label>
                    <div className="space-y-3">
                      {editData.variants?.map((v: any, idx: number) => (
                        <div key={v.id} className="flex items-center justify-between bg-surface-container-low p-4 rounded-2xl border border-outline-variant/5">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-primary uppercase tracking-tight">
                              {Object.values(v.options).join(" / ") || "Base Product"}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-mono">{v.sku}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => {
                                const newVariants = [...editData.variants];
                                newVariants[idx].stock = Math.max(0, newVariants[idx].stock - 1);
                                setEditData({...editData, variants: newVariants});
                              }}
                              className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface hover:bg-error/10 hover:text-error transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">remove</span>
                            </button>
                            <input 
                              type="number"
                              value={v.stock}
                              onChange={(e) => {
                                const newVariants = [...editData.variants];
                                newVariants[idx].stock = parseInt(e.target.value) || 0;
                                setEditData({...editData, variants: newVariants});
                              }}
                              className="w-16 bg-surface-container-highest rounded-lg py-2 text-center text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button 
                              onClick={() => {
                                const newVariants = [...editData.variants];
                                newVariants[idx].stock = newVariants[idx].stock + 1;
                                setEditData({...editData, variants: newVariants});
                              }}
                              className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface hover:bg-tertiary/10 hover:text-tertiary transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">add</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-surface-container-low border-t border-outline-variant/10 flex gap-4">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-4 rounded-full font-bold text-on-surface-variant hover:bg-surface-container-highest transition-colors">Discard</button>
                <button onClick={handleSaveEdit} className="flex-[2] py-4 rounded-full font-bold bg-primary text-on-primary shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">save</span> Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
