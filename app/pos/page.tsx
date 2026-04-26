"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import CartSidebar, { CartItem } from "@/components/CartSidebar";
import { supabase } from "@/lib/supabase";
import { formatCurrency, convertAmount } from "@/lib/currency";



export default function POS() {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Products");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [detailProduct, setDetailProduct] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [customerName, setCustomerName] = useState("");

  // Derived categories from settings
  const categories = ["All Products", ...(settings?.product_categories?.split(',').map((c: string) => c.trim()) || ["Phones", "Tablets", "Wearables", "Accessories"])];

  useEffect(() => {
    setMounted(true);
    fetchProducts();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
      if (data) setSettings(data);
    } catch (e) {
      console.error("POS Settings Fetch Error:", e);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, variants(*)');
      
      if (error) throw error;

      if (data) {
        const formatted = data.map((p: any) => {
          const mainVariant = p.variants && p.variants.length > 0 ? p.variants[0] : null;
          const totalStock = p.variants ? p.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) : 0;
          
          return {
            id: p.id,
            variantId: mainVariant?.id,
            title: p.title,
            sku: p.sku,
            brand: p.brand,
            category: p.category,
            variants: p.variants ? p.variants.map((v: any) => v.options ? Object.values(v.options).join(' / ') : '').filter(Boolean).join(', ') : '',
            price: p.variants && p.variants.length > 0 ? Math.min(...p.variants.map((v: any) => v.price)) : 0,
            maxPrice: p.variants && p.variants.length > 0 ? Math.max(...p.variants.map((v: any) => v.price)) : 0,
            stock: totalStock,
            stockLabel: totalStock === 0 ? "Out of Stock" : totalStock < 10 ? `Low Stock: ${totalStock}` : `In Stock: ${totalStock}`,
            isOutOfStock: totalStock === 0,
            isLowStock: totalStock > 0 && totalStock < 10,
            imageUrl: p.image_url,
            description: p.description || `High quality ${p.title} from ${p.brand}.`
          };
        });
        setProducts(formatted);
      }
    } catch (e) {
      console.error("POS Fetch Error:", e);
    }
  };

  if (!mounted) return null;

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                         p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All Products" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.sku === product.sku);
      if (existing) {
        return prev.map(item => 
          item.sku === product.sku ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { 
        sku: product.sku, 
        title: product.title, 
        price: product.price, 
        qty: 1, 
        imageUrl: product.imageUrl,
        variants: product.variants,
        id: product.id,
        variantId: product.variantId
      }];
    });
  };

  const handleUpdateQty = (sku: string, newQty: number) => {
    if (newQty < 1) {
      handleRemoveItem(sku);
      return;
    }
    setCart(prev => prev.map(item => 
      item.sku === sku ? { ...item, qty: newQty } : item
    ));
  };

  const handleUpdatePrice = (sku: string, newPrice: number) => {
    setCart(prev => prev.map(item => 
      item.sku === sku ? { ...item, price: newPrice } : item
    ));
  };

  const handleToggleTax = (sku: string) => {
    setCart(prev => prev.map(item => 
      item.sku === sku ? { ...item, taxExempt: !item.taxExempt } : item
    ));
  };

  const handleRemoveItem = (sku: string) => {
    setCart(prev => prev.filter(item => item.sku !== sku));
  };

  const handleClearCart = () => {
    if (confirm("Are you sure you want to clear the current sale?")) {
      setCart([]);
    }
  };

  const handleCharge = () => {
    if (cart.length === 0) return;
    setShowReceipt(true);
  };

  const rate = settings?.exchange_rate || 1;
  const currency = settings?.currency || "ETB";
  const factor = (currency !== "ETB") ? (1 / rate) : 1;

  const subtotalETB = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const discountAmtETB = subtotalETB * (discount / 100);
  const taxRate = (settings?.tax_rate || 15) / 100;
  
  // Calculate tax only on items that are NOT taxExempt
  const taxableSubtotalETB = cart
    .filter(item => !item.taxExempt)
    .reduce((acc, item) => acc + (item.price * item.qty), 0);
  
  // Apply proportional discount to the taxable portion
  const taxableAfterDiscountETB = taxableSubtotalETB * (1 - (discount / 100));
  const taxETB = taxableAfterDiscountETB * taxRate;
  
  const totalETB = subtotalETB - discountAmtETB + taxETB;

  // Use the converted totals for database/checkout if needed, 
  // but for display we pass the ETB values to formatCurrency

  const completeSale = async () => {
    if (cart.length === 0) return;

    try {
      // 1. Create Order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          total_amount: totalETB,
          customer_name: customerName || "Walk-in Customer",
          payment_method: "Cash",
          status: "completed",
          currency: settings?.currency || "ETB",
          tax_amount: taxETB
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert Order Items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        variant_id: item.variantId, // Use variant_id which exists in schema
        quantity: item.qty,
        price_at_sale: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Decrement Stock
      for (const item of cart) {
        if (item.variantId) {
          // Fetch current stock first (to avoid negative if needed, but here we just decrement)
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

      // 4. Clear cart and refresh
      setCart([]);
      setCustomerName("");
      setShowReceipt(false);
      fetchProducts(); // Refresh stock labels
      alert("Order synced to cloud database!");
    } catch (e: any) {
      console.error("Checkout Sync Error:", e);
      alert("Error syncing sale: " + (e.message || JSON.stringify(e)));
      setCart([]);
      setShowReceipt(false);
    }
  };

  return (
    <main className="flex-1 md:ml-72 flex gap-6 pt-24 md:pt-8 px-6 pb-6 overflow-hidden h-full relative">
      <section className="flex-1 flex flex-col min-w-0 bg-surface rounded-3xl shadow-[inset_0_0_0_1px_rgba(198,198,205,0.15)] overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="p-6 bg-surface-container-low/30 border-b border-outline-variant/10 flex flex-col gap-6"
        >
          <div className="relative group max-w-2xl mx-auto w-full">
            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 z-10 text-2xl group-focus-within:text-primary transition-colors">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/40 rounded-2xl py-5 pl-14 pr-16 outline-none ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary shadow-[0_12px_40px_-12px_rgba(0,0,0,0.06)] focus:shadow-[0_20px_60px_-15px_rgba(111,251,190,0.15)] transition-all font-headline font-bold text-lg"
              placeholder="Search by SKU, Model, or Brand..."
              type="text"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {search && (
                <button onClick={() => setSearch("")} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant/40 hover:bg-surface-container-highest transition-colors">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              )}
              <button className="w-11 h-11 bg-primary text-on-primary hover:bg-primary/90 transition-all text-on-surface rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95">
                <span className="material-symbols-outlined text-xl">barcode_scanner</span>
              </button>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat, i) => (
              <motion.button
                key={cat}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.05 + i * 0.04 }}
                onClick={() => setActiveCategory(cat)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                className={`whitespace-nowrap px-6 py-3 rounded-xl font-headline text-xs tracking-widest uppercase font-black transition-all border ${
                  activeCategory === cat
                    ? "bg-primary text-on-primary border-primary shadow-xl shadow-primary/20"
                    : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/10 hover:border-primary/30 hover:bg-surface-container-high"
                }`}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
            {filteredProducts.map((p, i) => (
              <ProductCard 
                key={p.sku} 
                {...p} 
                index={i} 
                settings={settings}
                onAdd={() => handleAddToCart(p)}
                onClick={() => setDetailProduct(p)}
              />
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-32 text-center">
                <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant/20">search_off</span>
                </div>
                <h3 className="text-2xl font-black text-primary mb-2">No items found</h3>
                <p className="text-on-surface-variant max-w-xs mx-auto">We couldn&apos;t find any products matching <span className="text-primary font-bold">&quot;{search || activeCategory}&quot;</span></p>
                <button onClick={() => { setSearch(""); setActiveCategory("All Products"); }} className="mt-8 px-8 py-3 bg-surface-container-highest text-on-surface rounded-full font-bold hover:bg-surface-dim transition-colors">Clear All Filters</button>
              </div>
            )}
          </div>
        </div>
      </section>

      <CartSidebar 
        cart={cart} 
        settings={settings}
        discount={discount}
        onUpdateQty={handleUpdateQty} 
        onUpdatePrice={handleUpdatePrice}
        onUpdateDiscount={setDiscount}
        customerName={customerName}
        onUpdateCustomerName={setCustomerName}
        onToggleTax={handleToggleTax}
        onRemove={handleRemoveItem}
        onClear={handleClearCart}
        onCharge={handleCharge}
      />

      {/* Product Detail Popup */}
      <AnimatePresence>
        {detailProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
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
              className="relative w-full max-w-4xl bg-surface-container-lowest rounded-[3rem] shadow-2xl border border-outline-variant/15 overflow-hidden flex flex-col md:flex-row"
            >
              <div className="md:w-1/2 bg-surface-container-low p-12 flex items-center justify-center relative">
                <button 
                  onClick={() => setDetailProduct(null)}
                  className="absolute top-6 left-6 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-on-surface hover:rotate-90 transition-transform duration-300 md:hidden"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
                <motion.img 
                  layoutId={`img-${detailProduct.sku}`}
                  src={detailProduct.imageUrl} 
                  className="max-h-full object-contain mix-blend-multiply drop-shadow-2xl"
                />
              </div>
              <div className="md:w-1/2 p-12 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-[0.2em]">{detailProduct.category}</span>
                    <h2 className="text-4xl font-black text-primary mt-4 tracking-tighter leading-none">{detailProduct.title}</h2>
                    <p className="text-on-surface-variant font-bold text-sm mt-2">{detailProduct.sku}</p>
                  </div>
                  <button 
                    onClick={() => setDetailProduct(null)}
                    className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface hover:rotate-90 transition-transform duration-300 hidden md:flex"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="flex-1">
                  <p className="text-on-surface-variant leading-relaxed text-lg mb-8 opacity-70">
                    {detailProduct.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-8 mb-10">
                    <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10">
                      <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-2">Variant</p>
                      <p className="font-headline font-black text-primary">{detailProduct.variants}</p>
                    </div>
                    <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10">
                      <p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-2">Inventory</p>
                      <p className={`font-headline font-black ${detailProduct.stock === 0 ? 'text-error' : detailProduct.stock < 10 ? 'text-amber-600' : 'text-primary'}`}>{detailProduct.stockLabel}</p>
                    </div>
                  </div>
                </div>

                 <div className="flex items-center justify-between pt-8 border-t border-outline-variant/10 mt-auto">
                    <div className="flex-1 mr-6">
                      <p className="text-xs font-black text-on-surface-variant/40 uppercase tracking-widest mb-2">Sale Price ({settings?.currency || "ETB"})</p>
                      <div className="relative group">
                        <input 
                          type="number"
                          value={convertAmount(detailProduct.price, settings)}
                          onChange={(e) => setDetailProduct({...detailProduct, price: (parseFloat(e.target.value) || 0) * (settings?.currency !== 'ETB' ? (settings?.exchange_rate || 1) : 1)})}
                          className="w-full bg-surface-container-low text-3xl font-black text-primary tracking-tighter outline-none focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-2 transition-all border border-transparent focus:border-primary/20"
                        />
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-primary transition-colors">edit</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-2 opacity-50 uppercase tracking-wider font-bold">* Price can be adjusted by seller</p>
                    </div>
                   <button 
                     disabled={detailProduct.stock === 0}
                     onClick={() => {
                       handleAddToCart(detailProduct);
                       setDetailProduct(null);
                     }}
                     className="px-10 py-5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-1 transition-all active:scale-95 disabled:grayscale disabled:cursor-not-allowed"
                   >
                     {detailProduct.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checkout Success / Receipt Popup */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/20 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-lg bg-surface-container-lowest rounded-[3rem] shadow-2xl p-12 text-center"
            >
              <div className="w-24 h-24 bg-tertiary-fixed rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-tertiary-fixed/20">
                <span className="material-symbols-outlined text-5xl text-on-tertiary-fixed">check_circle</span>
              </div>
              <h2 className="text-4xl font-black text-primary tracking-tighter mb-2">Sale Complete!</h2>
              <p className="text-on-surface-variant font-bold mb-8">Transaction successfully processed</p>
              
              <div className="bg-surface-container-low rounded-3xl p-6 mb-8 text-left space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-on-surface-variant/60 uppercase tracking-widest text-[10px]">Subtotal</span>
                  <span className="font-headline font-black text-on-surface">{formatCurrency(subtotalETB, settings)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center text-sm text-emerald-600">
                    <span className="font-bold uppercase tracking-widest text-[10px]">Discount ({discount}%)</span>
                    <span className="font-headline font-black">- {formatCurrency(discountAmtETB, settings)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-on-surface-variant/60 uppercase tracking-widest text-[10px]">Tax ({settings?.tax_rate || 15}%)</span>
                  <span className="font-headline font-black text-on-surface">{formatCurrency(taxETB, settings)}</span>
                </div>
                <div className="flex justify-between border-t border-outline-variant/20 pt-4 mt-2">
                  <span className="text-xs font-black uppercase tracking-widest text-primary">Total Paid</span>
                  <span className="font-headline font-black text-primary text-xl">{formatCurrency(totalETB, settings)}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Payment Method</span>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Cash / Digital</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={completeSale}
                  className="flex-1 py-5 bg-surface-container-highest text-on-surface rounded-2xl font-black uppercase tracking-widest hover:bg-surface-dim transition-all"
                >
                  Print Receipt
                </button>
                <button 
                  onClick={completeSale}
                  className="flex-1 py-5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all"
                >
                  New Sale
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
