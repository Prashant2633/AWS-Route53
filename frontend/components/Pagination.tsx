import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
}) => {
  if (totalItems === 0) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalItems);

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between py-3 px-4 bg-[var(--card-bg)] border-t border-[var(--border-color)] gap-4 transition-colors duration-200">
      <div className="text-sm text-[var(--text-muted-darker)]">
        Showing <span className="font-semibold text-[var(--text-primary)]">{startItem}</span>–
        <span className="font-semibold text-[var(--text-primary)]">{endItem}</span> of{" "}
        <span className="font-semibold text-[var(--text-primary)]">{totalItems}</span> records
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-md border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--page-bg)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)] transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p) => {
          const isCurrent = p === page;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                isCurrent
                  ? "bg-[#FF9900] border-[#FF9900] text-[#0F1923]"
                  : "border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--page-bg)] hover:text-[var(--text-primary)]"
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-md border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--page-bg)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)] transition-all cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
export default Pagination;
