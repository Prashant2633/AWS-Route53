import React from "react";

interface LoadingSkeletonProps {
  rows?: number;
  cols?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  rows = 5,
  cols = 5,
}) => {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="flex space-x-4 border-b border-[var(--border-color)] pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={`header-${i}`}
            className="h-4 bg-[var(--border-color)] rounded flex-1"
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={`row-${r}`}
          className="flex space-x-4 py-3 border-b border-[var(--border-color)]/50"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={`cell-${r}-${c}`}
              className="h-4 bg-[var(--border-color)]/70 rounded flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
};
export default LoadingSkeleton;
