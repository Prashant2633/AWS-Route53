"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("route53_token") : null;
    if (token) {
      router.push("/hosted-zones");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#1A2332] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#FF9900] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
