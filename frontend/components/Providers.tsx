"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../lib/auth";
import { ToastProvider } from "./Notification";
import Sidebar from "./Sidebar";

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5000,
          },
        },
      })
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    let lastKey = "";
    let timeoutId: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in inputs or textareas
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (!e.key) return;
      const key = e.key.toLowerCase();
      console.log(`[Shortcut Debug] Key pressed: "${key}", Last key: "${lastKey}"`);

      // Theme toggle shortcut: Alt + L
      if (e.altKey && key === "l") {
        e.preventDefault();
        console.log("[Shortcut Debug] Triggering theme toggle...");
        const isLight = document.documentElement.classList.contains("light");
        if (isLight) {
          document.documentElement.classList.remove("light");
          localStorage.setItem("route53_theme", "dark");
        } else {
          document.documentElement.classList.add("light");
          localStorage.setItem("route53_theme", "light");
        }
        window.dispatchEvent(new Event("theme-toggle"));
        return;
      }

      // Check for 'g' sequence
      if (lastKey === "g") {
        clearTimeout(timeoutId);
        lastKey = "";

        console.log(`[Shortcut Debug] Evaluating sequence: g -> ${key}`);

        if (key === "d" || key === "h") {
          e.preventDefault();
          console.log("[Shortcut Debug] Navigating to /dashboard");
          router.push("/dashboard");
        } else if (key === "z") {
          e.preventDefault();
          console.log("[Shortcut Debug] Navigating to /hosted-zones");
          router.push("/hosted-zones");
        } else if (key === "c") {
          e.preventDefault();
          console.log("[Shortcut Debug] Navigating to /health-checks");
          router.push("/health-checks");
        } else if (key === "t") {
          e.preventDefault();
          console.log("[Shortcut Debug] Navigating to /traffic-policies");
          router.push("/traffic-policies");
        } else if (key === "r") {
          e.preventDefault();
          console.log("[Shortcut Debug] Navigating to /resolver");
          router.push("/resolver");
        } else if (key === "p") {
          e.preventDefault();
          console.log("[Shortcut Debug] Navigating to /profiles");
          router.push("/profiles");
        }
      } else if (key === "g") {
        lastKey = "g";
        console.log("[Shortcut Debug] Detected 'g', waiting for next key...");
        timeoutId = setTimeout(() => {
          lastKey = "";
          console.log("[Shortcut Debug] 'g' sequence timed out.");
        }, 1000); // 1 second window
      }
    };

    // Attach to document for better compatibility with Brave/Chrome
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeoutId);
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <div className="flex h-screen w-screen overflow-hidden bg-[var(--page-bg)] text-[var(--text-primary)] transition-colors duration-200">
            <Sidebar />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <main className="flex-1 overflow-y-auto p-6 md:p-8">
                {children}
              </main>
            </div>
          </div>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};
export default Providers;
