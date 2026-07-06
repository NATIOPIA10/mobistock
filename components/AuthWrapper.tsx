"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Keep a ref so the one-time auth effect can always read the latest pathname
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const handleSession = (session: any, active: { value: boolean }) => {
    if (!active.value) return;

    if (session) {
      setSession(session);
      setIsLoading(false);

      // Log login (once per tab session)
      const loggedIn = sessionStorage.getItem("mobistock_login_logged");
      if (!loggedIn) {
        supabase
          .from("security_logs")
          .insert({
            event: "User Login",
            details: `Owner authenticated via ${session.user.email}`,
            status: "success",
          })
          .then(() => sessionStorage.setItem("mobistock_login_logged", "true"));
      }

      // If sitting on login page after sign-in, go to dashboard
      if (pathnameRef.current === "/login") {
        router.push("/");
      }
    } else {
      setSession(null);
      setIsLoading(false);

      // Not logged in → force to login page
      if (pathnameRef.current !== "/login") {
        router.push("/login");
      }
    }
  };

  // Run ONCE on mount — check existing session, redirect if not logged in
  useEffect(() => {
    const active = { value: true };

    // Check for an existing valid session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session, active);
    });

    // Listen for future auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session, active);
    });

    return () => {
      active.value = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty: run once on mount only

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

  // Login page — no sidebar/header
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Not logged in → show nothing (redirect handled above)
  if (!session) return null;

  // Fully authenticated — show full owner layout
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
