"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency, convertAmount } from "@/lib/currency";

function OrderSummary({ subtotal, discountAmt, tax, total, settings, itemCount, paymentMethod, onUpdatePaymentMethod }: { subtotal: number; discountAmt: number; tax: number; total: number; settings: any; itemCount: number; paymentMethod: string; onUpdatePaymentMethod: (method: string) => void }) {
  return (
    <div className="space-y-2 mb-4">
      <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
        <span>Subtotal ({itemCount} items)</span>
        <span className="font-headline text-on-surface font-black">{formatCurrency(subtotal, settings)}</span>
      </div>
      {discountAmt > 0 && (
        <div className="flex justify-between items-center text-xs font-bold text-emerald-600 uppercase tracking-widest">
          <span>Discount</span>
          <span className="font-headline font-black">- {formatCurrency(discountAmt, settings)}</span>
        </div>
      )}
      <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
        <span>Tax ({settings?.tax_rate || 15}%)</span>
        <span className="font-headline text-on-surface font-black">{formatCurrency(tax, settings)}</span>
      </div>
      <div className="flex justify-between border-t border-outline-variant/20 pt-2.5 mt-1.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Total Amount</span>
        <span className="font-headline font-black text-primary text-lg">{formatCurrency(total, settings)}</span>
      </div>
      {/* Payment Method Selection */}
      <div className="mt-2.5 p-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/10">
        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Payment Method</span>
        <div className="flex gap-1.5 mt-1.5">
          {['cash','card','transfer'].map((m) => (
            <button
              key={m}
              onClick={() => onUpdatePaymentMethod(m)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${paymentMethod === m ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface hover:bg-surface-dim'}`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  customerName: string;
  onUpdateCustomerName: (name: string) => void;
  customerPhone: string;
  onUpdateCustomerPhone: (phone: string) => void;
  paymentMethod: string;
  onUpdatePaymentMethod: (method: string) => void;
  onToggleTax: (sku: string) => void;
  onRemove: (sku: string) => void;
  onClear: () => void;
  onCharge: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function CartSidebar({ cart, settings, discount, onUpdateQty, onUpdatePrice, onUpdateDiscount, customerName, onUpdateCustomerName, customerPhone, onUpdateCustomerPhone, paymentMethod, onUpdatePaymentMethod, onToggleTax, onRemove, onClear, onCharge, isOpenMobile = false, onCloseMobile }: CartSidebarProps) {
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

  // Discount options derived from settings
  const discountOptions = (settings?.discount_options || "0,5,10,15,20").split(',').map((d: string) => d.trim());

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpenMobile && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-[80]"
          onClick={onCloseMobile}
        />
      )}
      <aside className={`
        ${isOpenMobile 
          ? 'fixed right-0 top-0 bottom-0 w-full sm:w-[420px] z-[90] flex shadow-2xl' 
          : 'hidden lg:flex w-[420px]'
        }
        bg-surface-container-lowest rounded-2xl shadow-[0_20px_60px_-15px_rgba(25,28,30,0.12)] flex flex-col relative flex-shrink-0 border border-outline-variant/10 h-full max-h-full overflow-hidden
      `}>
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-primary-container to-primary opacity-80 z-20"></div>

        {/* Header */}
        <div className="p-6 pb-2 flex justify-between items-start bg-surface-container-lowest z-10 shrink-0">
          <div>
            <h2 className="font-headline font-black text-2xl tracking-tighter text-primary mb-0.5">Current Sale</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed animate-pulse"></span>
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">{ticketNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {cart.length > 0 && (
              <button onClick={onClear} className="w-9 h-9 rounded-xl bg-error/5 text-error hover:bg-error hover:text-on-error transition-all flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
              </button>
            )}
            {onCloseMobile && (
              <button onClick={onCloseMobile} className="lg:hidden w-9 h-9 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface hover:bg-surface-dim transition-all">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>

      {/* FIX: Customer inputs are now their own closed section, not wrapping everything below */}
      <div className="px-6 pb-2 space-y-2 shrink-0">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-base group-focus-within:text-primary transition-colors">person</span>
          <input
            type="text"
            value={customerName}
            onChange={(e) => onUpdateCustomerName(e.target.value)}
            placeholder="Customer Name (Optional)"
            className="w-full bg-surface-container-low rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-primary outline-none ring-1 ring-outline-variant/10 focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-base group-focus-within:text-primary transition-colors">call</span>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => onUpdateCustomerPhone(e.target.value)}
            placeholder="Phone Number (Optional)"
            className="w-full bg-surface-container-low rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-primary outline-none ring-1 ring-outline-variant/10 focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>
      {/* END of customer inputs — cart items are now siblings, not children */}

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3 custom-scrollbar">
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

      {/* Discount Selector — FIX: onUpdateDiscount was passed as prop but never rendered */}
      <div className="px-6 py-3 border-t border-outline-variant/10 shrink-0">
        <label className="block text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-1.5">Discount (%)</label>
        <div className="flex flex-wrap gap-1.5">
          {discountOptions.map((d: string) => (
            <button
              key={d}
              onClick={() => onUpdateDiscount(Number(d))}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                discount === Number(d)
                ? "bg-primary text-on-primary border-primary shadow-md"
                : "bg-surface-container-highest text-on-surface border-transparent hover:bg-surface-dim"
              }`}
            >
              {d === "0" ? "None" : `${d}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="px-6 pt-1 shrink-0">
        <OrderSummary subtotal={subtotal} discountAmt={discountAmt} tax={tax} total={total} settings={settings} itemCount={cart.length} paymentMethod={paymentMethod} onUpdatePaymentMethod={onUpdatePaymentMethod} />
      </div>

      {/* Charge Button */}
      <div className="px-6 pb-4 shrink-0">
        <button
          disabled={cart.length === 0}
          onClick={onCharge}
          className={`w-full relative overflow-hidden rounded-[1.25rem] group shadow-xl transition-all duration-300 transform active:scale-[0.98] ${cart.length === 0 ? 'grayscale cursor-not-allowed' : 'cursor-pointer hover:shadow-primary/25'}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary z-0"></div>
          <div className="relative z-10 px-5 py-4 flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-on-primary/50 text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">Confirm Sale</span>
              <span className="text-on-primary font-headline font-black text-xl tracking-tighter leading-none">Charge Order</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-all group-hover:translate-x-1">
              <span className="material-symbols-outlined text-on-primary text-xl">arrow_forward</span>
            </div>
          </div>
        </button>
      </div>
    </aside>
    </>
  );
}
