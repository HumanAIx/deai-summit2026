'use client';
import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center pointer-events-none">
      <div className="bg-[#050A1F] text-white px-6 py-3 rounded-full shadow-2xl border border-white/10 flex items-center gap-3 animate-fade-in-up pointer-events-auto">
        <div className="bg-brand-teal rounded-full p-1">
          <i className="ri-check-line text-black text-xs font-bold block"></i>
        </div>
        <span className="text-sm font-medium tracking-wide">{message}</span>
      </div>
    </div>
  );
};