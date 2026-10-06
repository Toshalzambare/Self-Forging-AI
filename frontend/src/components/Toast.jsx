import React, { useState, useEffect, useRef } from 'react';

const Toast = ({ toast, onClose }) => {
      if (!toast.visible) return null;
      return (
        <div className="fixed bottom-6 right-6 z-50 transition-all duration-300 pointer-events-none flex items-center space-x-3 px-4 py-3 rounded-2xl bg-surface-container-high border border-outline-variant/40 shadow-2xl text-on-surface animate-bounce-short">
          <div className="w-7 h-7 rounded-lg bg-emerald-400/20 text-emerald-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">verified</span>
          </div>
          <div>
            <div className="font-body-sm text-body-sm font-semibold text-on-surface">{toast.title || "Notification"}</div>
            <div className="text-xs text-on-surface-variant">{toast.message}</div>
          </div>
        </div>
      );
    };

export default Toast;
