import React from "react";

interface StatusBadgeProps {
  type: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type }) => {
  const isPublic = type.toLowerCase() === "public";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        isPublic
          ? "bg-[rgba(63,185,80,0.15)] border-[rgba(63,185,80,0.3)] text-[#3FB950]"
          : "bg-[rgba(139,163,187,0.1)] border-[rgba(139,163,187,0.2)] text-[#8BA3BB]"
      }`}
    >
      {type}
    </span>
  );
};
export default StatusBadge;
