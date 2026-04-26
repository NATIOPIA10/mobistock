"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { convertAmount } from "@/lib/currency";

type Option = { id: string; name: string; values: string[] };
type Variant = { id: string; options: Record<string, string>; sku: string; cost: number; price: number; stock: number };

export default function NewProduct() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Basic Info
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Smartphones");
  const [image, setImage] = useState<string | null>(null);

  // Options & Variants
  const [options, setOptions] = useState<Option[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  // Local state for option input
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionValue, setNewOptionValue] = useState("");
  const [activeOptionId, setActiveOptionId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
      if (data) setSettings(data);
    } catch (e) {
      console.error("New Product Settings Error:", e);
    }
  };

  useEffect(() => {
    generateVariants(options);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, name, brand]);

  const generateVariants = (opts: Option[]) => {
    const validOpts = opts.filter((o) => o.values.length > 0 && o.name.trim() !== "");
    if (validOpts.length === 0) {
      setVariants([]);
      return;
    }

    const cartesian = validOpts.reduce<Record<string, string>[]>(
      (a, b) => a.flatMap((x) => b.values.map((y) => ({ ...x, [b.name]: y }))),
      [{}]
    );

    const newVariants = cartesian.map((c, i) => {
      // Try to preserve existing variant data if it matches exactly
      const existing = variants.find((v) => JSON.stringify(v.options) === JSON.stringify(c));
      if (existing) return existing;

      const skuSuffix = Object.values(c).map((v) => v.replace(/\s+/g, '').substring(0, 4).toUpperCase()).join('-');
      const baseSku = `${brand ? brand.substring(0, 3).toUpperCase() : 'BRD'}-${name ? name.substring(0, 4).toUpperCase() : 'PRD'}`;
      
      return {
        id: `var-${i}-${Math.random().toString(36).substr(2, 9)}`,
        options: c,
        sku: `${baseSku}-${skuSuffix}`.replace(/--/g, '-'),
        cost: 0,
        price: 0,
        stock: 0,
      };
    });

    setVariants(newVariants);
  };

  if (!mounted) return null;

  const addOption = () => {
    if (newOptionName.trim()) {
      setOptions([...options, { id: Date.now().toString(), name: newOptionName.trim(), values: [] }]);
      setNewOptionName("");
    }
  };

  const removeOption = (id: string) => {
    setOptions(options.filter((o) => o.id !== id));
  };

  const addOptionValue = (optId: string) => {
    if (newOptionValue.trim()) {
      setOptions(options.map((o) => {
        if (o.id === optId && !o.values.includes(newOptionValue.trim())) {
          return { ...o, values: [...o.values, newOptionValue.trim()] };
        }
        return o;
      }));
      setNewOptionValue("");
    }
  };

  const removeOptionValue = (optId: string, val: string) => {
    setOptions(options.map((o) => o.id === optId ? { ...o, values: o.values.filter((v) => v !== val) } : o));
  };

  const updateVariant = (id: string, field: keyof Variant, value: string | number) => {
    setVariants(variants.map((v) => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSave = async () => {
    if (!name || !brand) {
      alert("Please fill in the Product Name and Brand.");
      return;
    }

    if (variants.length === 0) {
      alert("Please add at least one variant (e.g. Color or Storage).");
      return;
    }

    try {
      // 1. Insert Product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert({
          sku: variants[0]?.sku || `PRD-${Date.now()}`,
          title: name,
          brand,
          category,
          image_url: image || "https://lh3.googleusercontent.com/aida-public/AB6AXuBQWZybuEdvsnKkag-7xAD3G4ra-ZSfUx2RTh_XBnxjthRf8oVm-u-Ae5U8LZpw1Ghjgwv3AZsM-TLeEsujzRwH4tuZh-1X9oq5gH5BMURnOqMgRCF0Hb4b0cAXDxSaGO5eBT8XWldo8GhZFRsM2-9pX2-7K_fZxANevdE8QQ42YKxbuMTNDbW6c8na8AsDqxhiz2Ce9-row3moJAWrYQWD8PVe6-spA4aUNRfn-1q-WvboUAvz1zoeOuGxqckYUwWfs91gFpFRZgU"
        })
        .select()
        .single();

      if (productError) throw productError;

      // 2. Insert Variants
      const factor = settings?.currency !== "ETB" ? (settings?.exchange_rate || 1) : 1;
      const variantsToInsert = variants.map(v => ({
        product_id: productData.id,
        sku: v.sku,
        options: v.options,
        price: v.price * factor, // Convert view price back to base ETB
        cost: v.cost * factor,   // Convert view cost back to base ETB
        stock: v.stock
      }));

      const { error: variantsError } = await supabase
        .from('variants')
        .insert(variantsToInsert);

      if (variantsError) throw variantsError;

      alert("Product and variants saved successfully to database!");
      router.push("/inventory");
    } catch (e: any) {
      console.error("Database Error:", e);
      alert(`Error saving product: ${e.message || "Unknown error"}`);
    }
  };

  return (
    <main className="flex-1 md:ml-72 pt-20 md:pt-8 px-6 pb-24 md:pb-8 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-surface-dim transition-colors">
              <span className="material-symbols-outlined text-on-surface">arrow_back</span>
            </button>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-primary">Create New Product</h2>
              <p className="text-on-surface-variant text-sm mt-1">Add a new item to your inventory catalog.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.back()} className="px-6 py-2.5 rounded-full font-bold bg-surface-container-highest text-on-surface hover:bg-surface-dim transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2.5 rounded-full font-bold bg-primary text-on-primary shadow-md hover:opacity-90 transition-opacity active:scale-95"
            >
              Save Product
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Main Content Form */}
          <div className="space-y-8">
            
            {/* Basic Info */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-[0_8px_24px_-8px_rgba(25,28,30,0.06)] border border-outline-variant/15"
            >
              <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">info</span>
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Product Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body text-base" placeholder="e.g. iPhone 15 Pro Max" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Brand</label>
                  <input value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body text-base" placeholder="e.g. Apple" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest font-semibold text-on-surface-variant mb-2">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-surface-container-lowest rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)] font-body text-base">
                    <option>Smartphones</option>
                    <option>Tablets</option>
                    <option>Wearables</option>
                    <option>Accessories</option>
                    <option>Gaming</option>
                  </select>
                </div>
              </div>
            </motion.section>

            {/* Media */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-[0_8px_24px_-8px_rgba(25,28,30,0.06)] border border-outline-variant/15"
            >
              <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">image</span>
                Media
              </h3>
              
              <div 
                onClick={handleImageClick}
                className="w-full rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-low hover:bg-surface-container transition-colors py-12 flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                />
                
                {image ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white p-4">
                    <img src={image} alt="Preview" className="max-h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2">
                      <span className="material-symbols-outlined">edit</span> Change Image
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant mb-4 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                    </div>
                    <p className="font-bold text-primary mb-1">Click to upload or drag and drop</p>
                    <p className="text-sm text-on-surface-variant">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                  </>
                )}
              </div>
            </motion.section>

            {/* Variants Pricing */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-[0_8px_24px_-8px_rgba(25,28,30,0.06)] border border-outline-variant/15"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">price_change</span>
                  Granular Pricing & Stock
                </h3>
                <span className="text-xs font-bold bg-primary-container text-on-primary-container px-3 py-1 rounded-full uppercase tracking-widest">{variants.length} Variants</span>
              </div>
              
              {variants.length === 0 ? (
                <div className="bg-surface-container p-6 rounded-xl text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-3xl mb-2">style</span>
                  <p className="font-semibold text-sm">No variants generated.</p>
                  <p className="text-xs">Add options like Storage or Color to automatically generate variants.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/20 text-xs uppercase tracking-widest text-on-surface-variant">
                        <th className="pb-3 pr-4 font-semibold">Variant</th>
                        <th className="pb-3 px-4 font-semibold">SKU</th>
                        <th className="pb-3 px-4 font-semibold">Cost ({settings?.currency || "ETB"})</th>
                        <th className="pb-3 px-4 font-semibold">Price ({settings?.currency || "ETB"})</th>
                        <th className="pb-3 pl-4 font-semibold text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v) => (
                        <tr key={v.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(v.options).map(([k, val]) => (
                                <span key={k} className="bg-surface-container-highest text-on-surface px-2 py-0.5 rounded text-[11px] font-bold">
                                  {val}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input value={v.sku} onChange={(e) => updateVariant(v.id, 'sku', e.target.value)} className="w-full bg-transparent text-sm font-mono text-primary font-bold outline-none border-b border-transparent focus:border-primary transition-colors" />
                          </td>
                          <td className="py-3 px-4">
                            <input type="number" value={v.cost} onChange={(e) => updateVariant(v.id, 'cost', parseFloat(e.target.value) || 0)} className="w-24 bg-surface-container-highest rounded py-1 px-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary-container font-mono" />
                          </td>
                          <td className="py-3 px-4">
                            <input type="number" value={v.price} onChange={(e) => updateVariant(v.id, 'price', parseFloat(e.target.value) || 0)} className="w-24 bg-surface-container-highest rounded py-1 px-2 text-sm text-primary font-bold outline-none focus:ring-2 focus:ring-secondary-container font-mono" />
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <input type="number" value={v.stock} onChange={(e) => updateVariant(v.id, 'stock', parseInt(e.target.value, 10) || 0)} className="w-20 bg-surface-container-highest rounded py-1 px-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary-container text-right font-mono" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.section>

          </div>

          {/* Sidebar (Variant Builder) */}
          <div className="space-y-8">
            <motion.aside
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
              className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_8px_24px_-8px_rgba(25,28,30,0.06)] border border-outline-variant/15 sticky top-24"
            >
              <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">style</span>
                Dynamic Variant Builder
              </h3>
              
              <p className="text-sm text-on-surface-variant mb-6">Add options to generate variants. Example: Color, Storage, Size.</p>

              <div className="space-y-4 mb-6">
                <AnimatePresence>
                  {options.map((opt) => (
                    <motion.div
                      key={opt.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border border-outline-variant/30 rounded-xl overflow-hidden"
                    >
                      <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between">
                        <span className="font-bold text-primary text-sm">{opt.name}</span>
                        <button onClick={() => removeOption(opt.id)} className="text-on-surface-variant hover:text-error transition-colors">
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                      <div className="p-4 bg-surface-container-lowest">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {opt.values.map((val) => (
                            <span key={val} className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              {val}
                              <button onClick={() => removeOptionValue(opt.id, val)} className="hover:text-error ml-1 flex items-center">
                                <span className="material-symbols-outlined text-[14px]">cancel</span>
                              </button>
                            </span>
                          ))}
                        </div>
                        
                        {activeOptionId === opt.id ? (
                          <div className="flex gap-2">
                            <input
                              autoFocus
                              value={newOptionValue}
                              onChange={(e) => setNewOptionValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addOptionValue(opt.id);
                                }
                              }}
                              className="flex-1 bg-surface-container rounded py-1.5 px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary-container"
                              placeholder="e.g. 256GB"
                            />
                            <button onClick={() => addOptionValue(opt.id)} className="bg-primary text-on-primary px-3 py-1.5 rounded text-xs font-bold hover:opacity-90">Add</button>
                            <button onClick={() => { setActiveOptionId(null); setNewOptionValue(""); }} className="text-on-surface-variant hover:text-on-surface px-2"><span className="material-symbols-outlined text-[18px]">close</span></button>
                          </div>
                        ) : (
                          <button onClick={() => setActiveOptionId(opt.id)} className="text-sm font-bold text-secondary hover:underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">add_circle</span> Add Value
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-outline-variant/20">
                <input
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                  className="flex-1 bg-surface-container rounded-lg py-2.5 px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary-container shadow-[inset_0_0_0_1px_rgba(198,198,205,0.3)]"
                  placeholder="New option (e.g. Color)"
                />
                <button onClick={addOption} className="bg-surface-container-highest text-on-surface w-10 h-10 rounded-lg flex items-center justify-center hover:bg-surface-dim transition-colors">
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </motion.aside>
          </div>
        </div>
      </div>
    </main>
  );
}
