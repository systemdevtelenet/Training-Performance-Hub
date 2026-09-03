'use client';

import { useState, useEffect } from 'react';

export default function DataSyncOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [stepText, setStepText] = useState('Loading workspace data...');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isPostLogin = sessionStorage.getItem('show_login_toast') === 'true';
      if (isPostLogin) {
        setIsVisible(true);

        const timer = setTimeout(() => {
          setIsVisible(false);
        }, 1200);

        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white animate-in fade-in duration-150">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-full border-4 border-slate-100 border-t-[#2F6798] animate-spin" />
        <p className="text-sm font-bold text-slate-600 tracking-tight">
          {stepText}
        </p>
      </div>
    </div>
  );
}
