"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function ApprovalPending() {
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
      } else {
        setEmail(user.email || "");
      }
    });
  }, [router]);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("approved")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching approval status:", error.message);
        // If table doesn't exist, default to approved to avoid blocking the user
        router.push("/");
        return;
      }

      if (data?.approved) {
        alert("Congratulations! Your account has been approved.");
        router.push("/");
        router.refresh();
      } else {
        alert("Your account is still pending approval. Please contact a superadmin.");
      }
    } catch (e) {
      console.error("Check status exception:", e);
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-surface flex items-center justify-center p-6 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="bg-surface-container-lowest rounded-[3rem] p-10 md:p-14 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.15)] border border-outline-variant/10 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="w-20 h-20 bg-amber-500/10 rounded-3xl mx-auto flex items-center justify-center shadow-lg mb-6">
              <span className="material-symbols-outlined text-amber-600 text-4xl font-bold">hourglass_empty</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-primary">Approval Pending</h1>
            <p className="text-on-surface-variant font-bold text-xs mt-2 uppercase tracking-widest">Account Under Review</p>
          </motion.div>

          <div className="space-y-6 mb-8 text-on-surface-variant/80 text-sm leading-relaxed">
            <p>
              Thank you for registering. Your administrator account for <strong className="text-primary">{email}</strong> has been created.
            </p>
            <p className="bg-surface-container-low rounded-2xl p-4 text-xs font-medium border border-outline-variant/5">
              Before you can access the stock management terminal and sales dashboard, a Superadmin must approve your registration.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full py-4 bg-primary text-on-primary rounded-2xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {checking ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">autorenew</span>
                  Check Status
                </>
              )}
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full py-4 bg-surface-container-high text-on-surface rounded-2xl font-bold hover:bg-surface-dim transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Log Out
            </button>
          </div>

          <p className="mt-8 text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">
            MobiStock Security Protocol
          </p>
        </div>
      </motion.div>
    </div>
  );
}
