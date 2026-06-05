"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  id: string;
  email: string;
  approved: boolean;
  is_superadmin: boolean;
  created_at: string;
};

export default function UserManagement() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUser(user);
    fetchProfiles();
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      alert(`Error fetching registrations: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (user: UserProfile) => {
    if (user.id === currentUser?.id) {
      alert("You cannot modify your own approval status.");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ approved: !user.approved })
        .eq("id", user.id);

      if (error) throw error;
      setProfiles((prev) =>
        prev.map((p) => (p.id === user.id ? { ...p, approved: !p.approved } : p))
      );
    } catch (err: any) {
      alert(`Operation failed: ${err.message}`);
    }
  };

  const handleDeleteProfile = async (user: UserProfile) => {
    if (user.id === currentUser?.id) {
      alert("You cannot delete your own account.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to remove ${user.email}? They will need to sign up again.`
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", user.id);

      if (error) throw error;
      setProfiles((prev) => prev.filter((p) => p.id !== user.id));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const pendingProfiles = profiles.filter((p) => !p.approved);
  const displayProfiles = (activeTab === "pending" ? pendingProfiles : profiles).filter((p) =>
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: profiles.length,
    pending: profiles.filter((p) => !p.approved).length,
    approved: profiles.filter((p) => p.approved).length,
  };

  return (
    <main className="flex-1 md:ml-72 pt-20 md:pt-8 px-6 pb-8 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-primary">User Management</h2>
          <p className="text-on-surface-variant mt-1">
            Approve new store owner registrations and manage existing accounts.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "Total Users",
              value: stats.total,
              icon: "groups",
              color: "bg-primary/10 text-primary",
            },
            {
              label: "Pending Approval",
              value: stats.pending,
              icon: "hourglass_empty",
              color: "bg-amber-500/10 text-amber-600",
            },
            {
              label: "Approved Owners",
              value: stats.approved,
              icon: "storefront",
              color: "bg-emerald-500/10 text-emerald-600",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant/10 flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${stat.color}`}
              >
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">
                  {stat.label}
                </p>
                <h3 className="text-2xl font-black text-primary mt-1">{stat.value}</h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pending Alert Banner */}
        {stats.pending > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl px-6 py-4 flex items-center gap-4"
          >
            <span className="material-symbols-outlined text-amber-500 text-[28px]">
              notification_important
            </span>
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">
                {stats.pending} owner{stats.pending > 1 ? "s are" : " is"} waiting for approval
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Review pending registrations below to grant or deny access.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("pending")}
              className="ml-auto px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors shrink-0"
            >
              Review Now
            </button>
          </motion.div>
        )}

        {/* Table Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/10 overflow-hidden"
        >
          {/* Toolbar */}
          <div className="p-6 border-b border-outline-variant/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Tabs */}
            <div className="flex gap-2 bg-surface-container-low rounded-2xl p-1">
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "pending"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                Pending{stats.pending > 0 && ` (${stats.pending})`}
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "all"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                All Users
              </button>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant z-10 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container-low rounded-full py-3 pl-11 pr-5 text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  placeholder="Search by email..."
                />
              </div>
              <button
                onClick={fetchProfiles}
                className="px-5 py-3 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-dim font-bold text-sm transition-all flex items-center gap-2 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          {loading && profiles.length === 0 ? (
            <div className="py-20 flex justify-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/10 text-on-surface-variant font-black text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">Owner Email</th>
                    <th className="px-6 py-4">Registered</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  <AnimatePresence>
                    {displayProfiles.map((user) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-surface-container-low/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black">
                              {user.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-primary text-sm">{user.email}</p>
                              <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">
                                {user.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-on-surface-variant">
                          {new Date(user.created_at).toLocaleDateString()} at{" "}
                          {new Date(user.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              user.approved
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                user.approved ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                            {user.approved ? "Approved" : "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Approve / Revoke */}
                            <button
                              onClick={() => handleToggleApproval(user)}
                              disabled={user.id === currentUser?.id}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                user.approved
                                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              } disabled:opacity-50`}
                            >
                              {user.approved ? "Revoke" : "Approve"}
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteProfile(user)}
                              disabled={user.id === currentUser?.id}
                              className="p-2 rounded-xl text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                              title="Remove user"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                delete
                              </span>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>

                  {displayProfiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">
                          {activeTab === "pending" ? "check_circle" : "search_off"}
                        </span>
                        <p className="font-semibold text-sm">
                          {activeTab === "pending"
                            ? "No pending approvals — you're all caught up!"
                            : "No users match your search."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
