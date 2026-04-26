"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function Search() {
  const [query, setQuery] = useState("");

  return (
    <main className="flex-1 md:ml-72 pt-20 md:pt-8 px-6 pb-24 md:pb-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="mb-8"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-primary">Search</h2>
          <p className="text-on-surface-variant mt-1">Find products, receipts, or customers.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
          className="relative mb-8"
        >
          <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant text-2xl z-10">search</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-surface-container-lowest rounded-full py-5 pl-16 pr-6 text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:ring-2 focus:ring-secondary-container shadow-[0_8px_30px_-10px_rgba(25,28,30,0.08)] font-body text-lg transition-all"
            placeholder="Type to search..."
          />
        </motion.div>

        {query.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-surface-container-lowest rounded-3xl p-8 text-center text-on-surface-variant border border-outline-variant/15"
          >
            <span className="material-symbols-outlined text-4xl mb-2">manage_search</span>
            <p className="font-semibold text-lg text-primary">Searching for &quot;{query}&quot;</p>
            <p>Mock search results will appear here.</p>
          </motion.div>
        ) : (
          <div className="bg-surface-container-low rounded-3xl p-8 text-center text-on-surface-variant border border-outline-variant/15 border-dashed">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search</span>
            <p className="font-semibold">Start typing to see results</p>
          </div>
        )}
      </div>
    </main>
  );
}
