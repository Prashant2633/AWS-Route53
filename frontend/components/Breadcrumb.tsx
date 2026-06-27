import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex items-center space-x-1.5 text-xs text-[var(--text-muted-darker)] mb-4 select-none">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-[var(--border-color)]" />}

            {isLast || !item.href ? (
              <span className="text-[var(--text-muted)] font-medium max-w-[200px] truncate">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-[#FF9900] hover:underline transition-colors max-w-[200px] truncate"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
export default Breadcrumb;
