"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { formatCurrency, convertAmount } from "@/lib/currency";

type Product = { id: string; name: string; sku: string; price: number; maxPrice: number; stock: number; category: string; img: string; variantId?: string };
type CartItem = { id: string; name: string; sku: string; price: number; qty: number; img: string; variantId?: string; taxExempt?: boolean };

const paymentMethods = [
  { id: "cash", label: "Cash", icon: "payments" },
  { id: "card", label: "Card", icon: "credit_card" },
  { id: "transfer", label: "Transfer", icon: "account_balance" },
];

export default function QuickSale() {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState("cash");
  const [customer, setCustomer] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [receipt, setReceipt] = useState(false);
  const [ticketNo, setTicketNo] = useState("");
  const [note, setNote] = useState("");
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // Derived categories from settings
  const categories = ["All", ...(settings?.product_categories?.split(',').map((c: string) => c.trim()) || ["Smartphones", "Accessories", "Wearables", "Tablets"])];

  useEffect(() => {
    setTicketNo(`#${Math.floor(8000 + Math.random() * 999)}-Q`);
    setMounted(true);
    fetchCatalog();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
      if (data) setSettings(data);
    } catch (e) {
      console.error("QuickSale Settings Error:", e);
    }
  };

  const fetchCatalog = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*, variants(*)');
      if (error) throw error;
      if (data) {
        const formatted = data.map((p: any) => {
          const mainVariant = p.variants && p.variants.length > 0 ? p.variants[0] : null;
          return {
            id: p.id,
            variantId: mainVariant?.id,
            name: p.title,
            sku: p.sku,
            price: p.variants && p.variants.length > 0 ? Math.min(...p.variants.map((v: any) => v.price)) : 0,
            maxPrice: p.variants && p.variants.length > 0 ? Math.max(...p.variants.map((v: any) => v.price)) : 0,
            stock: p.variants ? p.variants.reduce((s: number, v: any) => s + (v.stock || 0), 0) : 0,
            category: p.category,
            img: p.image_url
          };
        });
        setCatalog(formatted);
      }
    } catch (e) {
      console.error("QuickSale Fetch Error:", e);
    }
  };

  const filtered = catalog.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const exists = prev.find((c) => c.id === p.id);
      if (exists) return prev.map((c) => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...p, qty: 1, variantId: p.variantId, taxExempt: false }];
    });
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));
  const updateQty = (id: string, qty: number) => {
    if (qty < 1) { removeFromCart(id); return; }
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty } : c));
  };
  const updatePrice = (id: string, price: number) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, price } : c));
  };
  const toggleTax = (id: string) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, taxExempt: !c.taxExempt } : c));
  };

  const rate = settings?.exchange_rate || 1;
  const currency = settings?.currency || "ETB";
  const isUSD = currency === "USD";
  const isEUR = currency === "EUR";
  
  // Conversion Factor: if base is ETB and we view USD, factor is 1/rate
  const factor = (currency !== "ETB") ? (1 / rate) : 1;

  const subtotalETB = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmtETB = subtotalETB * (discount / 100);
  const taxRate = (settings?.tax_rate || 15) / 100;
  
  const taxableSubtotalETB = cart
    .filter(c => !c.taxExempt)
    .reduce((s, c) => s + (c.price * c.qty), 0);
  
  const taxableAfterDiscountETB = taxableSubtotalETB * (1 - (discount / 100));
  const taxETB = taxableAfterDiscountETB * taxRate;
  
  const totalETB = subtotalETB - discountAmtETB + taxETB;

  const handleCharge = async () => {
    if (cart.length === 0) return;
    
    try {
      // 1. Create Order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_name: customer || "Walk-in",
          total_amount: totalETB,
          payment_method: payMethod,
          status: "completed"
        })
        .select()
        .single();
      
      if (orderErr) throw orderErr;

      // 2. Add items
      const items = cart.map(c => ({
        order_id: order.id,
        variant_id: c.variantId, // Use variant_id which exists in schema
        quantity: c.qty,
        price_at_sale: c.price
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(items);
      if (itemsErr) throw itemsErr;

      // 3. Decrement Stock
      for (const item of cart) {
        if (item.variantId) {
          const { data: variant } = await supabase
            .from('variants')
            .select('stock')
            .eq('id', item.variantId)
            .single();
          
          if (variant) {
            await supabase
              .from('variants')
              .update({ stock: Math.max(0, variant.stock - item.qty) })
              .eq('id', item.variantId);
          }
        }
      }

      setReceipt(true);
      fetchCatalog(); // Refresh stock
    } catch (e: any) {
      alert(`Quick Sale Error: ${e.message}`);
    }
  };

  if (!mounted) return null;

  if (receipt) {
    return (
      <main className="flex-1 md:ml-72 pt-20 md:pt-0 min-h-screen pb-8 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="bg-surface-container-lowest rounded-3xl shadow-[0_30px_80px_-20px_rgba(25,28,30,0.2)] p-10 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.2 }}
              className="w-16 h-16 rounded-full bg-tertiary-fixed/30 flex items-center justify-center mx-auto mb-4"
            >
              <span className="material-symbols-outlined text-4xl text-on-tertiary-fixed">check_circle</span>
            </motion.div>
            <h2 className="text-2xl font-extrabold text-primary">Sale Complete!</h2>
            <p className="text-on-surface-variant text-sm mt-1">Ticket {ticketNo}</p>
          </div>

          {customer && <p className="text-center text-sm font-semibold text-on-surface-variant mb-6">Customer: <span className="text-primary">{customer}</span></p>}

          <div className="space-y-3 mb-6">
            {cart.map((c) => (
              <div key={c.id} className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{c.name} × {c.qty}</span>
                <span className="font-bold text-primary">{formatCurrency(c.price * c.qty, settings)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-outline-variant/20 pt-4 space-y-2 mb-8">
            <div className="flex justify-between text-sm text-on-surface-variant"><span>Subtotal</span><span>{formatCurrency(subtotalETB, settings)}</span></div>
            {discount > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Discount ({discount}%)</span><span>− {formatCurrency(discountAmtETB, settings)}</span></div>}
            <div className="flex justify-between text-sm text-on-surface-variant"><span>Tax ({settings?.tax_rate || 15}%)</span><span>{formatCurrency(taxETB, settings)}</span></div>
            <div className="flex justify-between font-extrabold text-lg text-primary pt-2 border-t border-outline-variant/20"><span>Total Paid</span><span>{formatCurrency(totalETB, settings)}</span></div>
          </div>

          <p className="text-center text-xs text-on-surface-variant mb-6">Paid via <strong className="capitalize">{payMethod}</strong></p>

          <div className="flex gap-3">
            <button onClick={() => { setCart([]); setReceipt(false); setCustomer(""); setDiscount(0); setNote(""); }} className="flex-1 py-4 rounded-2xl bg-surface-container-highest text-on-surface font-bold hover:bg-surface-dim transition-colors">
              New Sale
            </button>
            <button onClick={() => window.print()} className="flex-1 py-4 rounded-2xl bg-primary text-on-primary font-bold flex items-center justify-center gap-2 shadow-md">
                <span className="material-symbols-outlined text-[18px]">print</span> Print
              </button>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex-1 md:ml-72 pt-20 md:pt-8 px-6 pb-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8"
        >
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-primary">New Quick Sale</h2>
            <p className="text-on-surface-variant mt-1">Fast checkout — search, add, and charge.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeCategory === cat ? "bg-primary text-on-primary shadow-lg scale-105" : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="bg-surface-container-low rounded-xl px-4 py-2 text-sm font-semibold text-on-surface-variant border border-outline-variant/10">
              Ticket: <span className="text-primary font-bold">{ticketNo}</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          {/* LEFT: Product Search + Cart */}
          <div className="flex flex-col gap-6">
            {/* Customer + Search */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant z-10">person</span>
                <input value={customer} onChange={(e) => setCustomer(e.target.value)} className="w-full bg-surface-container-lowest rounded-full py-4 pl-12 pr-6 text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:ring-2 focus:ring-secondary-container shadow-sm font-body text-base" placeholder="Customer name (optional)" />
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant z-10">search</span>
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-surface-container-lowest rounded-full py-4 pl-12 pr-6 text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:ring-2 focus:ring-secondary-container shadow-sm font-body text-base" placeholder="Search product or SKU..." />
              </div>
            </motion.div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence>
                {filtered.map((p, i) => (
                  <motion.button
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                    whileHover={{ y: -4, boxShadow: "0 16px 40px -8px rgba(111,251,190,0.4)" }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => addToCart(p)}
                    className="bg-surface-container-lowest rounded-2xl p-4 text-left shadow-[0_4px_16px_-6px_rgba(25,28,30,0.06)] border border-outline-variant/10 flex flex-col gap-2 cursor-pointer group"
                  >
                    <div className="bg-surface-container-low rounded-xl h-28 flex items-center justify-center overflow-hidden">
                      <img alt={p.name} className="h-20 object-contain mix-blend-multiply drop-shadow group-hover:scale-105 transition-transform duration-300" src={p.img} />
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-widest">{p.sku}</p>
                    <p className="text-sm font-bold text-primary leading-tight">{p.name}</p>
                    <div className="flex justify-between items-center mt-auto">
                      <span className="text-sm font-extrabold text-primary">
                        {p.maxPrice && p.maxPrice !== p.price 
                          ? `${formatCurrency(p.price, settings)} - ${formatCurrency(p.maxPrice, settings)}`
                          : formatCurrency(p.price, settings)}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.stock <= 2 ? "bg-amber-50 text-amber-600" : "bg-tertiary-fixed/20 text-on-tertiary-fixed"}`}>
                        {p.stock <= 2 ? `Low: ${p.stock}` : `${p.stock}`}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
              {filtered.length === 0 && (
                <div className="col-span-4 text-center py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 block">search_off</span>
                  <p className="font-semibold">No products found</p>
                </div>
              )}
            </div>

            {/* Sale Note */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full bg-surface-container-lowest rounded-2xl p-4 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-secondary-container shadow-sm resize-none text-sm" placeholder="Add a note for this sale (optional)..." />
            </motion.div>
          </div>

          {/* RIGHT: Order Summary */}
          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
            className="bg-surface-container-lowest rounded-3xl shadow-[0_20px_60px_-15px_rgba(25,28,30,0.1)] flex flex-col overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary-container via-primary to-secondary-container opacity-40" />
            <div className="p-6 border-b border-outline-variant/10">
              <h3 className="text-xl font-bold text-primary">Order Summary</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{cart.length} item{cart.length !== 1 ? "s" : ""} in cart</p>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
              <AnimatePresence>
                {cart.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl mb-2 block">shopping_cart</span>
                    <p className="text-sm font-medium">Cart is empty</p>
                    <p className="text-xs mt-1">Tap a product to add it</p>
                  </motion.div>
                )}
                {cart.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="bg-surface-container-low rounded-2xl p-3 flex items-center gap-3"
                  >
                    <img alt={item.name} className="w-12 h-12 object-contain bg-white rounded-lg p-1 shadow-sm shrink-0" src={item.img} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-primary truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-on-surface-variant/40">{currency}</span>
                          <input 
                            type="number"
                            value={convertAmount(item.price, settings)}
                            onChange={(e) => updatePrice(item.id, (parseFloat(e.target.value) || 0) * (settings?.currency !== 'ETB' ? (settings?.exchange_rate || 1) : 1))}
                            className="w-16 bg-transparent text-xs font-bold text-primary outline-none focus:bg-white focus:ring-1 focus:ring-primary/20 rounded px-0.5"
                          />
                        </div>
                        <button 
                          onClick={() => toggleTax(item.id)}
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded transition-all ${item.taxExempt ? 'bg-surface-container-highest text-on-surface-variant/30' : 'bg-secondary-container/40 text-secondary'}`}
                        >
                          {item.taxExempt ? 'No Tax' : 'Tax'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-surface-dim transition-colors">
                        <span className="material-symbols-outlined text-[14px]">remove</span>
                      </button>
                      <span className="w-6 text-center font-bold text-sm text-primary">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-surface-dim transition-colors">
                        <span className="material-symbols-outlined text-[14px]">add</span>
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-on-surface-variant/40 hover:text-error transition-colors ml-1">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Discount */}
            <div className="px-6 py-4 border-t border-outline-variant/10">
              <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Discount (%)</label>
              <div className="flex flex-wrap gap-2">
                {(settings?.discount_options || "0,5,10,15,20").split(',').map((d: string) => (
                  <button 
                    key={d} 
                    onClick={() => setDiscount(Number(d.trim()))} 
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                      discount === Number(d.trim()) 
                      ? "bg-primary text-on-primary border-primary shadow-md" 
                      : "bg-surface-container-highest text-on-surface border-transparent hover:bg-surface-dim"
                    }`}
                  >
                    {d.trim() === "0" ? "None" : `${d.trim()}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="px-6 py-4 border-t border-outline-variant/10">
              <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Payment Method</label>
              <div className="flex gap-2">
                {paymentMethods.map((m) => (
                  <button key={m.id} onClick={() => setPayMethod(m.id)} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl text-xs font-bold transition-all ${payMethod === m.id ? "bg-primary text-on-primary shadow-md" : "bg-surface-container-highest text-on-surface hover:bg-surface-dim"}`}>
                    <span className="material-symbols-outlined text-[20px]">{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Totals + Charge */}
            <div className="p-6 border-t border-outline-variant/10">
              <div className="space-y-2 mb-5 text-sm">
                <div className="flex justify-between text-on-surface-variant"><span>Subtotal</span><span className="font-semibold text-primary">{formatCurrency(subtotalETB, settings)}</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount ({discount}%)</span><span className="font-semibold">− {formatCurrency(discountAmtETB, settings)}</span></div>}
                <div className="flex justify-between text-on-surface-variant"><span>Tax ({settings?.tax_rate || 15}%)</span><span className="font-semibold text-primary">{formatCurrency(taxETB, settings)}</span></div>
              </div>
              <motion.button
                whileHover={cart.length > 0 ? { scale: 1.02, boxShadow: "0 20px 48px -8px rgba(111,251,190,0.5)" } : {}}
                whileTap={cart.length > 0 ? { scale: 0.97 } : {}}
                onClick={handleCharge}
                disabled={cart.length === 0}
                className={`w-full rounded-[2rem] py-5 flex items-center justify-between px-6 font-bold transition-all ${cart.length === 0 ? "bg-surface-container-high text-on-surface-variant cursor-not-allowed" : "bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_15px_30px_-5px_rgba(19,27,46,0.3)]"}`}
              >
                <div>
                  <p className="text-xs opacity-70 uppercase tracking-widest">Total Due</p>
                  <p className="text-2xl font-extrabold tracking-tight">{formatCurrency(totalETB, settings)}</p>
                </div>
                <div className="h-10 px-4 rounded-full bg-white/10 border border-white/10 flex items-center gap-2">
                  <span className="text-sm">Charge</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </div>
              </motion.button>
            </div>
          </motion.aside>
        </div>
      </div>
    </main>
  );
}
