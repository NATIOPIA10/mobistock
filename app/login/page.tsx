"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // If already logged in, go to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/");
    });
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              is_superadmin: false,
            },
          },
        });
        if (error) throw error;
        alert(
          "Success! Your account is pending approval. You will be notified once an existing owner approves your access."
        );
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-surface flex items-center justify-center p-6 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="bg-surface-container-lowest rounded-[3rem] p-10 md:p-14 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.15)] border border-outline-variant/10 text-center">
          {/* Logo / Branding */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10"
          >
            <div className="w-20 h-20 rounded-3xl mx-auto overflow-hidden shadow-2xl shadow-primary/30 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
              <img src="/icon.png" alt="MobiStock Pro" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-primary">MobiStock Pro</h1>
            <p className="text-on-surface-variant font-bold text-sm mt-2 uppercase tracking-[0.2em]">
              {isSignUp ? "Create Store Owner Account" : "The Digital Concierge"}
            </p>
          </motion.div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-4">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-low rounded-2xl py-4 px-6 text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:border-primary/30"
                placeholder="owner@mystore.com"
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-4">
                Access Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-low rounded-2xl py-4 px-6 text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:border-primary/30"
                placeholder="••••••••"
              />
            </div>

            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-left flex gap-3"
              >
                <span className="material-symbols-outlined text-primary shrink-0 text-[20px] mt-0.5">info</span>
                <p className="text-xs text-on-surface-variant font-semibold leading-relaxed">
                  New accounts require approval from an existing owner before you can access the system.
                </p>
              </motion.div>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-error text-xs font-bold"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
              className="w-full py-5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-4"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <>
                  {isSignUp ? "Create Account" : "Authenticate"}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </motion.button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-6 text-xs font-bold text-primary hover:underline"
          >
            {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}
          </button>

          <p className="mt-10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">
            Secure Store Owner Access
          </p>
        </div>
      </motion.div>
    </div>
  );
}
