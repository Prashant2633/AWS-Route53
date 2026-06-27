"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";
import {
  LayoutDashboard,
  Globe,
  Activity,
  GitFork,
  Settings,
  User,
  LogOut,
  Sun,
  Moon,
  CloudLightning
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("route53_theme");
      if (storedTheme === "light") {
        setIsLightMode(true);
        document.documentElement.classList.add("light");
      } else {
        setIsLightMode(false);
        document.documentElement.classList.remove("light");
      }
    }
  }, []);

  // Listen to keyboard-triggered theme toggles to keep state in sync
  useEffect(() => {
    const syncTheme = () => {
      const storedTheme = localStorage.getItem("route53_theme");
      setIsLightMode(storedTheme === "light");
    };
    window.addEventListener("theme-toggle", syncTheme);
    return () => window.removeEventListener("theme-toggle", syncTheme);
  }, []);

  const toggleTheme = () => {
    if (isLightMode) {
      document.documentElement.classList.remove("light");
      localStorage.setItem("route53_theme", "dark");
      setIsLightMode(false);
    } else {
      document.documentElement.classList.add("light");
      localStorage.setItem("route53_theme", "light");
      setIsLightMode(true);
    }
  };

  if (!isAuthenticated || pathname === "/login") return null;

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Hosted Zones", href: "/hosted-zones", icon: Globe },
    { label: "Health Checks", href: "/health-checks", icon: Activity },
    { label: "Traffic Policies", href: "/traffic-policies", icon: GitFork },
    { label: "Resolver", href: "/resolver", icon: Settings },
    { label: "Profiles", href: "/profiles", icon: User },
  ];

  return (
    <aside className="w-64 bg-[#0F1923] border-r border-[#1E2D3D] flex flex-col h-screen shrink-0 text-[#8BA3BB] select-none transition-colors duration-200">
      <div className="h-14 border-b border-[#1E2D3D] flex items-center px-6 gap-3 text-white bg-[#0A1520] transition-colors duration-200">
        <CloudLightning className="w-6 h-6 text-[#FF9900]" />
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-wide">AWS Route 53</span>
          <span className="text-[10px] text-[#5A7A9A] font-semibold">DNS CONSOLE CLONE</span>
        </div>
      </div>

      <nav className="flex-1 py-6 space-y-1 overflow-y-auto px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/hosted-zones"
              ? pathname.startsWith("/hosted-zones")
              : pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-md transition-all ${
                isActive
                  ? "border-l-4 border-[#FF9900] bg-[#FF9900]/5 text-[#FF9900] pl-3"
                  : "hover:bg-[#152332] hover:text-[#E8EDF2]"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#FF9900]" : "text-[#5A7A9A]"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#1E2D3D] p-4 bg-[#0A1520] flex flex-col gap-3 transition-colors duration-200">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between w-full px-3 py-1.5 rounded-md text-xs font-semibold border border-[#1E2D3D] hover:bg-[#152332] hover:text-[#E8EDF2] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {isLightMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {isLightMode ? "Light Mode" : "Dark Mode"}
          </span>
          <span className="text-[10px] text-[#5A7A9A]">Toggle</span>
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#1E2D3D] flex items-center justify-center text-xs font-bold text-white uppercase border border-[#FF9900]">
              {user?.username ? user.username.substring(0, 2) : "AD"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#E8EDF2] truncate">
                {user?.username || "admin"}
              </span>
              <span className="text-[10px] text-[#5A7A9A]">AWS Account</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-md text-[#5A7A9A] hover:text-[#F85149] hover:bg-[#1E2D3D] transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
