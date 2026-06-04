"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Keep a ref so the one-time auth effect can always read the latest pathname
  // without being re-triggered by pathname changes.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // Table may not exist yet — default to approved so existing users aren't blocked
        console.warn("Could not fetch user profile:", error.message);
        return { approved: true, is_superadmin: false };
      }
      return data;
    } catch (e) {
      console.warn("Exception fetching user profile:", e);
      return { approved: true, is_superadmin: false };
    }
  };

  const handleSession = async (session: any, active: { value: boolean }) => {
    if (session) {
      const userProfile = await fetchProfile(session.user.id);
      if (!active.value) return;

      setProfile(userProfile);
      setSession(session);
      setIsLoading(false);

      const currentPath = pathnameRef.current;

      if (!userProfile.approved && currentPath !== "/approval-pending" && currentPath !== "/login") {
        router.push("/approval-pending");
      } else if (userProfile.approved && currentPath === "/approval-pending") {
        router.push(userProfile.is_superadmin ? "/superadmin" : "/");
      } else if (userProfile.is_superadmin && currentPath !== "/superadmin" && currentPath !== "/login" && currentPath !== "/approval-pending") {
        router.push("/superadmin");
      } else if (!userProfile.is_superadmin && currentPath.startsWith("/superadmin")) {
        router.push("/");
      }

      // Log login (once per tab session)
      const loggedIn = sessionStorage.getItem("mobistock_login_logged");
      if (!loggedIn) {
        supabase
          .from("security_logs")
          .insert({
            event: "User Login",
            details: `Admin authenticated via ${session.user.email}`,
            status: "success",
          })
          .then(() => sessionStorage.setItem("mobistock_login_logged", "true"));
      }
    } else {
      if (!active.value) return;
      setSession(null);
      setProfile(null);
      setIsLoading(false);

      const currentPath = pathnameRef.current;
      if (currentPath !== "/login" && currentPath !== "/approval-pending") {
        router.push("/login");
      }
    }
  };

  // Run ONCE on mount — no pathname/router in deps to avoid re-trigger loops
  useEffect(() => {
    const active = { value: true };

    // Safety net: never stay on loading screen longer than 10 seconds
    const timeout = setTimeout(() => {
      if (active.value) {
        console.warn("Auth timed out — defaulting to unauthenticated");
        setIsLoading(false);
      }
    }, 10000);

    // Resolve current session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => handleSession(session, active))
      .catch((err) => {
        console.error("getSession error:", err);
        if (active.value) {
          setIsLoading(false);
          const currentPath = pathnameRef.current;
          if (currentPath !== "/login") router.push("/login");
        }
      });

    // Listen for future auth state changes (login / logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session, active);
    });

    return () => {
      active.value = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- intentionally empty: run once on mount only

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-surface flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Auth/approval pages — no sidebar/header
  if (pathname === "/login" || pathname === "/approval-pending") {
    return <>{children}</>;
  }

  // Not logged in
  if (!session) return null;

  // Logged in but not yet approved
  if (profile && !profile.approved) return null;

  // Superadmin trying to access non-superadmin pages
  if (profile && profile.is_superadmin && pathname !== "/superadmin" && pathname !== "/login" && pathname !== "/approval-pending") {
    return null;
  }

  // Non-superadmin trying to access /superadmin
  if (pathname.startsWith("/superadmin") && profile && !profile.is_superadmin) return null;

  // Fully authenticated & approved
  return (
    <>
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <Header onMenuOpen={() => setMobileSidebarOpen(true)} />
      {children}
    </>
  );
}
