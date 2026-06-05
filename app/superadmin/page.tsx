"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperadminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/user-management");
  }, [router]);

  return (
    <div className="fixed inset-0 bg-surface flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
