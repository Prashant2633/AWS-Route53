"use client";

import React, { useState, useEffect } from "react";
import Modal from "./Modal";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  itemType: "hosted zone" | "DNS record" | "selected items";
  isLoading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
  isLoading = false,
}) => {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  const isMatched = inputValue.trim() === itemName;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMatched && !isLoading) {
      onConfirm();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <form onSubmit={handleConfirm} className="space-y-4">
        <div className="text-sm text-[#8BA3BB] space-y-2">
          <p>
            Are you sure you want to delete this {itemType}? This action cannot be
            undone.
          </p>
          <p className="p-3 bg-[#0D1520] border border-[#1E2D3D] rounded text-xs text-[#F85149] font-mono break-all">
            {itemName}
          </p>
          <p>
            To confirm deletion, type{" "}
            <span className="font-semibold text-[#E8EDF2] select-none">
              {itemName}
            </span>{" "}
            in the field below:
          </p>
        </div>

        <div>
          <input
            type="text"
            className="w-full px-3 py-2 bg-[#0F1923] border border-[#1E2D3D] rounded-md text-sm text-[#E8EDF2] focus:outline-none focus:border-[#F85149] transition-colors"
            placeholder="Type name here"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            autoComplete="off"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-2 border-t border-[#1E2D3D]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded text-sm font-semibold border border-[#2D4A6A] text-[#8BA3BB] hover:bg-[#1E2D3D] hover:text-[#E8EDF2] transition-colors cursor-pointer"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isMatched || isLoading}
            className="px-4 py-1.5 rounded text-sm font-semibold bg-[#F85149] text-white hover:bg-[#d83c35] disabled:opacity-30 disabled:hover:bg-[#F85149] transition-colors flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
export default ConfirmDeleteModal;
