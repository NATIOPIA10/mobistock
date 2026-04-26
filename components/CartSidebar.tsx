import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency, convertAmount } from "@/lib/currency";

export type CartItem = {
  id?: string;
  sku: string;
  title: string;
  price: number;
  qty: number;
  imageUrl: string;
  variants: string;
  taxExempt?: boolean;
  variantId?: string;
};

interface CartSidebarProps {
  cart: CartItem[];
  settings: any;
  discount: number;
  onUpdateQty: (sku: string, newQty: number) => void;
  onUpdatePrice: (sku: string, newPrice: number) => void;
  onUpdateDiscount: (value: number) => void;
  onToggleTax: (sku: string) => void;
  onRemove: (sku: string) => void;
  onClear: () => void;
  onCharge: () => void;
}

export default function CartSidebar({ cart, settings, discount, onUpdateQty, onUpdatePrice, onUpdateDiscount, onToggleTax, onRemove, onClear, onCharge }: CartSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const [ticketNo, setTicketNo] = useState("");

  useEffect(() => {
    setMounted(true);
    setTicketNo(`#${Math.floor(8000 + Math.random() * 2000)}-Q`);
  }, []);

  if (!mounted) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const taxRate = (settings?.tax_rate || 15) / 100;
  const currency = settings?.currency || "ETB";
  const discountAmt = subtotal * (discount / 100);
  
  const taxableSubtotal = cart
    .filter(item => !item.taxExempt)
    .reduce((acc, item) => acc + (item.price * item.qty), 0);
  
  const taxableAfterDiscount = taxableSubtotal * (1 - (discount / 100));
  const tax = taxableAfterDiscount * taxRate;
  const total = subtotal - discountAmt + tax;

  return (
    <aside className="hidden lg:flex w-[420px] bg-surface-container-lowest rounded-2xl shadow-[0_20px_60px_-15px_rgba(25,28,30,0.12)] flex-col relative overflow-hidden flex-shrink-0 border border-outline-variant/10">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-primary-container to-primary opacity-80 z-20"></div>
      
      <div className="p-8 pb-4 flex justify-between items-start bg-surface-container-lowest z-10">
        <div>
          <h2 className="font-headline font-black text-3xl tracking-tighter text-primary mb-1">Current Sale</h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-pulse"></span>
            <p className="text-sm text-on-surface-variant font-bold uppercase tracking-widest">{ticketNo}</p>
          </div>
        </div>
        {cart.length > 0 && (
          <button onClick={onClear} className="w-10 h-10 rounded-xl bg-error/5 text-error hover:bg-error hover:text-on-error transition-all flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {cart.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20"
            >
              <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl">shopping_cart_checkout</span>
              </div>
              <p className="font-headline font-bold text-lg">Cart is empty</p>
              <p className="text-xs uppercase tracking-widest mt-1">Ready for a new sale</p>
            </motion.div>
          ) : (
            cart.map((item) => (
              <motion.div
                key={item.sku}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                className="bg-surface-container-low/50 rounded-2xl p-4 relative group border border-outline-variant/5 hover:border-primary/20 transition-all shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white p-2 flex items-center justify-center shadow-sm shrink-0 border border-outline-variant/10">
                    <img alt={item.title} className="w-full h-full object-contain" src={item.imageUrl} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-headline font-bold text-primary leading-tight truncate">{item.title}</h4>
                      <button onClick={() => onRemove(item.sku)} className="text-on-surface-variant/30 hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mt-1 opacity-60">{item.variants}</p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center bg-surface-container-highest/50 rounded-lg p-0.5 border border-outline-variant/10">
                        <button onClick={() => onUpdateQty(item.sku, item.qty - 1)} className="w-8 h-8 rounded-md flex items-center justify-center text-on-surface hover:bg-white hover:shadow-sm transition-all active:scale-90"><span className="material-symbols-outlined text-[14px]">remove</span></button>
                        <span className="w-8 text-center font-black text-sm text-primary">{item.qty}</span>
                        <button onClick={() => onUpdateQty(item.sku, item.qty + 1)} className="w-8 h-8 rounded-md flex items-center justify-center text-on-surface hover:bg-white hover:shadow-sm transition-all active:scale-90"><span className="material-symbols-outlined text-[14px]">add</span></button>
                      </div>
                      <button 
                        onClick={() => onToggleTax(item.sku)}
                        className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all border ${
                          item.taxExempt 
                          ? "bg-surface-container-high text-on-surface-variant/40 border-outline-variant/10" 
                          : "bg-secondary-container/30 text-secondary border-secondary/20 shadow-sm"
                        }`}
                      >
                        {item.taxExempt ? 'Tax Exempt' : 'Taxable'}
                      </button>
                      <div className="text-right">
                        <div className="flex flex-col items-end">
                          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Price</p>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-primary/40">{currency}</span>
                            <input 
                              type="number"
                              value={convertAmount(item.price, settings)}
                              onChange={(e) => onUpdatePrice(item.sku, (parseFloat(e.target.value) || 0) * (settings?.currency !== 'ETB' ? (settings?.exchange_rate || 1) : 1))}
                              className="w-20 bg-transparent text-right font-headline font-black text-primary text-base outline-none focus:bg-white focus:ring-1 focus:ring-primary/20 rounded-md px-1 transition-all"
                            />
                          </div>
                          <p className="text-[10px] font-bold text-on-surface-variant/40 mt-1 italic">Total: {formatCurrency(item.price * item.qty, settings)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="mt-auto bg-surface-container-lowest z-20 shadow-[0_-15px_50px_rgba(0,0,0,0.05)] rounded-t-[2.5rem] pt-8 pb-8 px-8 border-t border-outline-variant/10">
        <div className="space-y-3 mb-8">
          <div className="flex justify-between items-center text-sm font-bold text-on-surface-variant/60 uppercase tracking-widest">
            <span>Subtotal ({cart.reduce((a,b)=>a+b.qty,0)} items)</span>
            <span className="font-headline text-on-surface font-black">{formatCurrency(subtotal, settings)}</span>
          </div>

          <div className="py-2">
            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.1em] mb-2">Apply Discount (%)</p>
            <div className="flex flex-wrap gap-1.5">
              {(settings?.discount_options || "0,5,10,15,20").split(',').map((val: string) => (
                <button
                  key={val}
                  onClick={() => onUpdateDiscount(Number(val))}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                    discount === Number(val)
                    ? "bg-primary text-on-primary border-primary shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant border-outline-variant/10 hover:bg-white"
                  }`}
                >
                  {val === "0" ? "None" : `${val}%`}
                </button>
              ))}
            </div>
          </div>

          {discount > 0 && (
            <div className="flex justify-between items-center text-sm font-bold text-emerald-600 uppercase tracking-widest">
              <span>Discount ({discount}%)</span>
              <span className="font-headline font-black">- {formatCurrency(subtotal * (discount / 100), settings)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm font-bold text-on-surface-variant/60 uppercase tracking-widest">
            <span>Tax ({settings?.tax_rate || 15}%)</span>
            <span className="font-headline text-on-surface font-black">{formatCurrency(tax, settings)}</span>
          </div>
          <div className="pt-3 border-t border-dashed border-outline-variant/30 flex justify-between items-center">
             <span className="font-headline font-black text-lg text-primary">Total Amount</span>
             <span className="font-headline font-black text-2xl text-primary tracking-tighter">{formatCurrency(total, settings)}</span>
          </div>
        </div>

        <button 
          disabled={cart.length === 0}
          onClick={onCharge}
          className={`w-full relative overflow-hidden rounded-[1.5rem] group shadow-2xl transition-all duration-300 transform active:scale-[0.98] ${cart.length === 0 ? 'grayscale cursor-not-allowed' : 'cursor-pointer hover:shadow-primary/25'}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary z-0"></div>
          <div className="relative z-10 px-6 py-6 flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-on-primary/50 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Confirm Sale</span>
              <span className="text-on-primary font-headline font-black text-2xl tracking-tighter leading-none">Charge Order</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-all group-hover:translate-x-1">
              <span className="material-symbols-outlined text-on-primary text-2xl">arrow_forward</span>
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}
