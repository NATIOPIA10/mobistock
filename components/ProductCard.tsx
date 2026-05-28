"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { formatCurrency } from "@/lib/currency";

export default function ProductCard({
  title, sku, variants, price, maxPrice, stock, stockLabel, isLowStock, isOutOfStock, imageUrl, settings, onAdd, onClick, index = 0
}: {
  title: string; sku: string; variants: string; price: number; maxPrice?: number; stock: number; stockLabel: string;
  isLowStock?: boolean; isOutOfStock?: boolean; imageUrl: string; settings?: any; onAdd?: () => void; onClick?: () => void; index?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
      whileHover={!isOutOfStock ? { y: -4, scale: 1.01 } : {}}
      whileTap={!isOutOfStock ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`bg-surface-container-lowest rounded-xl p-2.5 shadow-[0_4px_16px_-8px_rgba(25,28,30,0.05)] transition-shadow flex flex-col ${isOutOfStock ? 'cursor-not-allowed opacity-75' : 'cursor-pointer group hover:shadow-[0_12px_32px_-6px_rgba(111,251,190,0.3)]'}`}
    >
      <div className={`bg-surface-container-low rounded-lg h-24 mb-2 flex items-center justify-center p-2 relative overflow-hidden transition-colors ${!isOutOfStock && 'group-hover:bg-surface-container'}`}>
        {isOutOfStock ? (
          <div className="absolute top-1.5 left-1.5 bg-error-container text-on-error-container text-[8px] font-label font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md">Out of Stock</div>
        ) : isLowStock ? (
          <div className="absolute top-1.5 left-1.5 bg-[#fff8e1] text-[#ff8f00] text-[8px] font-label font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md">{stockLabel}</div>
        ) : (
          <div className="absolute top-1.5 left-1.5 bg-tertiary-fixed text-on-tertiary-fixed text-[8px] font-label font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md shadow-[0_0_8px_rgba(111,251,190,0.2)]">{stockLabel}</div>
        )}
        <motion.img
          alt={title}
          className={`h-full object-contain mix-blend-multiply drop-shadow-md ${isOutOfStock ? 'grayscale saturate-50 opacity-60' : ''}`}
          src={imageUrl}
          whileHover={!isOutOfStock ? { scale: 1.08, rotate: 1 } : {}}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] text-on-surface-variant/70 font-label uppercase tracking-widest mb-0.5 truncate">{sku}</p>
        <h3 className="font-headline font-black text-sm leading-tight mb-0.5 text-on-surface line-clamp-1 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-[10px] text-on-surface-variant/70 mb-2 truncate">{variants || "Standard"}</p>
      </div>
      <div className="flex justify-between items-center mt-auto pt-1 border-t border-outline-variant/5">
        <div className={`font-headline font-black text-sm tracking-tight ${isOutOfStock ? 'text-on-surface-variant line-through decoration-on-surface-variant/30' : 'text-primary'}`}>
          {maxPrice && maxPrice !== price 
            ? `${formatCurrency(price, settings)} - ${formatCurrency(maxPrice, settings)}`
            : formatCurrency(price, settings)}
        </div>
        {!isOutOfStock && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onAdd?.();
            }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors z-10"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
