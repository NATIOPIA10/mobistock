"use client";

import { useEffect, useState } from "react";
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn("Could not fetch user profile (table might not exist yet):", error.message);
        // Default to approved = true to avoid breaking backward compatibility
        return { approved: true, is_superadmin: false };
      }
      return data;
    } catch (e) {
      console.warn("Exception fetching user profile:", e);
      return { approved: true, is_superadmin: false };
    }
  };

  useEffect(() => {
    let active = true;

    // Check current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      
      if (session) {
        // Fetch user profile status
        const userProfile = await fetchProfile(session.user.id);
        if (active) {
          setProfile(userProfile);
          setIsLoading(false);

          // Handle redirection based on approval status
          if (!userProfile.approved && pathname !== "/approval-pending" && pathname !== "/login") {
            router.push("/approval-pending");
          } else if (userProfile.approved && pathname === "/approval-pending") {
            router.push("/");
          } else if (pathname.startsWith("/superadmin") && !userProfile.is_superadmin) {
            router.push("/");
          }
        }

        // Log login event (only if not already logged in this tab session)
        const loggedIn = sessionStorage.getItem('mobistock_login_logged');
        if (!loggedIn) {
          supabase.from('security_logs').insert({
            event: "User Login",
            details: `Admin authenticated via ${session.user.email}`,
            status: "success"
          }).then(() => sessionStorage.setItem('mobistock_login_logged', 'true'));
        }
      } else {
        if (active) {
          setIsLoading(false);
          if (pathname !== "/login" && pathname !== "/approval-pending") {
            router.push("/login");
          }
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      setSession(session);
      
      if (session) {
        const userProfile = await fetchProfile(session.user.id);
        if (active) {
          setProfile(userProfile);
          if (!userProfile.approved && pathname !== "/approval-pending" && pathname !== "/login") {
            router.push("/approval-pending");
          } else if (userProfile.approved && pathname === "/approval-pending") {
            router.push("/");
          } else if (pathname.startsWith("/superadmin") && !userProfile.is_superadmin) {
            router.push("/");
          }
        }
      } else {
        if (active) {
          setProfile(null);
          if (pathname !== "/login" && pathname !== "/approval-pending") {
            router.push("/login");
          }
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  // Close mobile sidebar when route changes
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

  // If on login or approval-pending page, show the page content without sidebar/header
  if (pathname === "/login" || pathname === "/approval-pending") {
    return <>{children}</>;
  }

  // If not logged in and not on login page, show nothing (redirecting)
  if (!session) {
    return null;
  }

  // If logged in but not approved, show nothing (redirecting to /approval-pending)
  if (profile && !profile.approved) {
    return null;
  }

  // If trying to access superadmin but not a superadmin, show nothing (redirecting)
  if (pathname.startsWith("/superadmin") && profile && !profile.is_superadmin) {
    return null;
  }

  // Logged in and approved: show sidebar, header and content
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
