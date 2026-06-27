"use client";

import React from "react";
import LoadingSkeleton from "./LoadingSkeleton";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  rowKey: (row: T) => string;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyState?: {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  };
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  rowKey,
  sortKey,
  sortOrder,
  onSort,
  selectedIds,
  onSelectionChange,
  emptyState,
}: DataTableProps<T>) {
  
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange(data.map(rowKey));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (!onSelectionChange || !selectedIds) return;
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((item) => item !== id));
    }
  };

  const isAllSelected =
    data.length > 0 && selectedIds && selectedIds.length === data.length;
  const isSomeSelected =
    selectedIds && selectedIds.length > 0 && selectedIds.length < data.length;

  if (isLoading) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6 transition-colors duration-200">
        <LoadingSkeleton rows={5} cols={columns.length + (onSelectionChange ? 1 : 0)} />
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-12 flex flex-col items-center justify-center text-center transition-colors duration-200">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{emptyState.title}</h3>
        <p className="text-sm text-[var(--text-muted-darker)] mb-6 max-w-sm">{emptyState.description}</p>
        {emptyState.actionLabel && emptyState.onAction && (
          <button
            onClick={emptyState.onAction}
            className="px-4 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#0F1923] text-sm font-semibold rounded transition-colors cursor-pointer"
          >
            {emptyState.actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg overflow-x-auto transition-colors duration-200">
      <table className="w-full text-left border-collapse table-auto min-w-[600px]">
        <thead>
          <tr className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] transition-colors duration-200">
            {onSelectionChange && (
              <th className="p-4 w-12 text-center">
                <input
                  type="checkbox"
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = !!isSomeSelected;
                    }
                  }}
                  checked={!!isAllSelected}
                  onChange={handleSelectAll}
                  className="rounded border-[var(--border-color)] text-[#FF9900] bg-[var(--card-bg)] focus:ring-offset-0 focus:ring-[#FF9900] cursor-pointer"
                />
              </th>
            )}

            {columns.map((col) => {
              const alignClass =
                col.align === "center"
                  ? "text-center"
                  : col.align === "right"
                  ? "text-right"
                  : "text-left";
              
              const isSorted = sortKey === col.key;

              return (
                <th
                  key={col.key}
                  className={`p-4 font-semibold ${alignClass} ${
                    col.sortable && onSort ? "cursor-pointer select-none hover:text-[var(--text-primary)]" : ""
                  }`}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                >
                  <div className={`flex items-center gap-1 ${col.align === "center" ? "justify-center" : col.align === "right" ? "justify-end" : ""}`}>
                    {col.header}
                    {col.sortable && onSort && (
                      <span className="text-[10px]">
                        {isSorted ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-color)]/50 text-sm text-[var(--text-primary)] transition-colors duration-200">
          {data.map((row) => {
            const id = rowKey(row);
            const isSelected = selectedIds?.includes(id);

            return (
              <tr
                key={id}
                className={`hover:bg-[var(--page-bg)]/50 transition-colors ${
                  isSelected ? "bg-[#FF9900]/5" : ""
                }`}
              >
                {onSelectionChange && (
                  <td className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      onChange={(e) => handleSelectRow(id, e.target.checked)}
                      className="rounded border-[var(--border-color)] text-[#FF9900] bg-[var(--card-bg)] focus:ring-offset-0 focus:ring-[#FF9900] cursor-pointer"
                    />
                  </td>
                )}

                {columns.map((col) => {
                  const alignClass =
                    col.align === "center"
                      ? "text-center"
                      : col.align === "right"
                      ? "text-right"
                      : "text-left";

                  return (
                    <td key={col.key} className={`p-4 ${alignClass}`}>
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export default DataTable;
