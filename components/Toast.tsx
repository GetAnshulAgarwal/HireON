"use client";

import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";

interface ToastProps {
  message: string;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setVisible(false);
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [handleClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 bg-accent text-white p-4 rounded-lg shadow-lg z-50 flex items-center gap-3 max-w-md transition-all duration-300 ${
        isExiting ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-1">{message}</div>
      <button
        onClick={handleClose}
        className="text-white hover:text-primary transition-colors"
        aria-label="Close toast"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}