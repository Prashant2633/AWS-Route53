"use client";

import React from "react";
import Breadcrumb from "./Breadcrumb";
import { AlertCircle } from "lucide-react";

interface ComingSoonProps {
  title: string;
  icon?: React.ComponentType<any>;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ title, icon: Icon = AlertCircle }) => {
  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: "Route 53", href: "/hosted-zones" }, { label: title }]} />
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{title}</h1>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-16 flex flex-col items-center justify-center text-center min-h-[50vh] transition-colors duration-200">
        <div className="p-4 bg-[#FF9900]/10 rounded-full border border-[#FF9900]/20 mb-4 animate-pulse">
          <Icon className="w-12 h-12 text-[#FF9900]" />
        </div>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-2">Coming Soon</h2>
        <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed">
          This feature is not yet implemented. We are working hard to bring this Route 53 console capability to life in an upcoming release.
        </p>
      </div>
    </div>
  );
};
export default ComingSoon;
