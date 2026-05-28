"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  id: string;
  email: string;
  approved: boolean;
  is_superadmin: boolean;
  created_at: string;
};

export default function SuperadminDashboard() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkAccessAndFetch();
  }, []);

  const checkAccessAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUser(user);

      // Verify superadmin status
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_superadmin, approved")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || !profile.is_superadmin || !profile.approved) {
        console.error("Access denied: Not a superadmin");
        router.push("/");
        return;
      }

      fetchProfiles();
    } catch (e) {
      console.error("Superadmin check exception:", e);
      router.push("/");
    }
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
    // Prevent superadmin from revoking their own approval
    if (user.id === currentUser?.id) {
      alert("You cannot revoke your own approval status.");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ approved: !user.approved })
        .eq("id", user.id);

      if (error) throw error;
      
      // Update local state
      setProfiles(prev =>
        prev.map(p => (p.id === user.id ? { ...p, approved: !p.approved } : p))
      );
    } catch (err: any) {
      alert(`Operation failed: ${err.message}`);
    }
  };

  const handleToggleSuperadmin = async (user: UserProfile) => {
    // Prevent superadmin from revoking their own superadmin status
    if (user.id === currentUser?.id) {
      alert("You cannot revoke your own superadmin status.");
      return;
    }

    const confirmMsg = user.is_superadmin 
      ? `Are you sure you want to demote ${user.email} to regular Admin?`
      : `Are you sure you want to promote ${user.email} to Superadmin? They will have full access to approve/delete other users.`;

    if (!confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ is_superadmin: !user.is_superadmin })
        .eq("id", user.id);

      if (error) throw error;
      
      // Update local state
      setProfiles(prev =>
        prev.map(p => (p.id === user.id ? { ...p, is_superadmin: !p.is_superadmin } : p))
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

    if (!confirm(`Are you sure you want to delete ${user.email}? This will revoke their access permanently (they will need to sign up again).`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", user.id);

      if (error) throw error;
      
      // Update local state
      setProfiles(prev => prev.filter(p => p.id !== user.id));
      alert("User registration deleted successfully.");
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: profiles.length,
    pending: profiles.filter(p => !p.approved).length,
    approved: profiles.filter(p => p.approved && !p.is_superadmin).length,
    superadmins: profiles.filter(p => p.is_superadmin).length,
  };

  if (loading && profiles.length === 0) {
    return (
      <main className="flex-1 md:ml-72 pt-20 md:pt-8 px-6 pb-8 min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="flex-1 md:ml-72 pt-20 md:pt-8 px-6 pb-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-primary">Superadmin Console</h2>
          <p className="text-on-surface-variant mt-1">Manage, approve, and configure user registrations and system privileges.</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Registrations", value: stats.total, icon: "groups", color: "bg-primary/10 text-primary" },
            { label: "Pending Approvals", value: stats.pending, icon: "hourglass_empty", color: "bg-amber-500/10 text-amber-600" },
            { label: "Approved Admins", value: stats.approved, icon: "admin_panel_settings", color: "bg-emerald-500/10 text-emerald-600" },
            { label: "Superadmins", value: stats.superadmins, icon: "shield_person", color: "bg-purple-500/10 text-purple-600" }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant/10 flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${stat.color}`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-black text-primary mt-1">{stat.value}</h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters & Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/10 overflow-hidden"
        >
          {/* Toolbar */}
          <div className="p-6 border-b border-outline-variant/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant z-10">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low rounded-full py-3.5 pl-12 pr-6 text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:ring-2 focus:ring-primary/20 shadow-sm text-sm"
                placeholder="Search registered emails..."
              />
            </div>
            <button
              onClick={fetchProfiles}
              className="px-6 py-3.5 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-dim font-bold text-sm transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refresh List
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/10 text-on-surface-variant font-black text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Administrator Email</th>
                  <th className="px-6 py-4">Registered Date</th>
                  <th className="px-6 py-4">Approval Status</th>
                  <th className="px-6 py-4">Privilege Role</th>
                  <th className="px-6 py-4 text-right">Console Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                <AnimatePresence>
                  {filteredProfiles.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-surface-container-low/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${user.is_superadmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-primary text-sm">{user.email}</p>
                            <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">{user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {new Date(user.created_at).toLocaleDateString()} at {new Date(user.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${user.approved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          <span className={`w-2 h-2 rounded-full ${user.approved ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          {user.approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${user.is_superadmin ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                          <span className="material-symbols-outlined text-[14px]">{user.is_superadmin ? 'shield_person' : 'person'}</span>
                          {user.is_superadmin ? 'Superadmin' : 'Stock Owner'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Approve/Revoke Button */}
                          <button
                            onClick={() => handleToggleApproval(user)}
                            disabled={user.id === currentUser?.id}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              user.approved
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            } disabled:opacity-50`}
                          >
                            {user.approved ? 'Revoke Access' : 'Approve'}
                          </button>

                          {/* Superadmin Toggle Button */}
                          <button
                            onClick={() => handleToggleSuperadmin(user)}
                            disabled={user.id === currentUser?.id}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all bg-surface-container-high text-on-surface hover:bg-surface-dim border border-outline-variant/10 disabled:opacity-50`}
                          >
                            {user.is_superadmin ? 'Make Admin' : 'Make Superadmin'}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteProfile(user)}
                            disabled={user.id === currentUser?.id}
                            className="p-2 rounded-xl text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                            title="Delete Registration"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl mb-2 block">search_off</span>
                      <p className="font-semibold text-sm">No registered users match your search criteria.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
