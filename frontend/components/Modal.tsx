"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div
        className={`relative w-full ${sizeClasses[size]} bg-[#1A2332] border border-[#2D3D4A] rounded-lg shadow-2xl overflow-hidden transform scale-100 transition-all z-10`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D3D] bg-[#0F1923]">
          <h3 className="text-base font-semibold text-[#E8EDF2]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#5A7A9A] hover:text-[#E8EDF2] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto bg-[#1A2332]">
          {children}
        </div>
      </div>
    </div>
  );
};
export default Modal;
