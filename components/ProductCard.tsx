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
      whileHover={!isOutOfStock ? { y: -6, scale: 1.02 } : {}}
      whileTap={!isOutOfStock ? { scale: 0.97 } : {}}
      onClick={onClick}
      className={`bg-surface-container-lowest rounded-2xl p-4 shadow-[0_8px_24px_-12px_rgba(25,28,30,0.06)] transition-shadow flex flex-col ${isOutOfStock ? 'cursor-not-allowed opacity-75' : 'cursor-pointer group hover:shadow-[0_16px_40px_-8px_rgba(111,251,190,0.4)]'}`}
    >
      <div className={`bg-surface-container-low rounded-xl h-40 mb-4 flex items-center justify-center p-4 relative overflow-hidden transition-colors ${!isOutOfStock && 'group-hover:bg-surface-container'}`}>
        {isOutOfStock ? (
          <div className="absolute top-3 left-3 bg-error-container text-on-error-container text-[10px] font-label font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">Out of Stock</div>
        ) : isLowStock ? (
          <div className="absolute top-3 left-3 bg-[#fff8e1] text-[#ff8f00] text-[10px] font-label font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">{stockLabel}</div>
        ) : (
          <div className="absolute top-3 left-3 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-label font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-[0_0_12px_rgba(111,251,190,0.3)]">{stockLabel}</div>
        )}
        <motion.img
          alt={title}
          className={`h-full object-contain mix-blend-multiply drop-shadow-lg ${isOutOfStock ? 'grayscale saturate-50 opacity-60' : ''}`}
          src={imageUrl}
          whileHover={!isOutOfStock ? { scale: 1.1, rotate: 2 } : {}}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>
      <div className="flex-1">
        <p className="text-xs text-on-surface-variant font-label uppercase tracking-widest mb-1">{sku}</p>
        <h3 className="font-headline font-bold text-lg leading-tight mb-1 text-on-surface">{title}</h3>
        <p className="text-sm text-on-surface-variant mb-4">{variants}</p>
      </div>
      <div className="flex justify-between items-end mt-auto">
        <div className={`font-headline font-bold text-lg tracking-tight ${isOutOfStock ? 'text-on-surface-variant line-through decoration-on-surface-variant/30' : 'text-primary'}`}>
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
            whileHover={{ scale: 1.15, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors z-10"
          >
            <span className="material-symbols-outlined text-sm">add</span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
