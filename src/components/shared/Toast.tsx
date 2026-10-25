"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-[10px] shadow-lg border text-sm font-medium transition-all animate-in fade-in slide-in-from-top-2",
              t.type === "success" &&
                "bg-good-soft text-good-text border-good/20 shadow-good/5",
              t.type === "error" &&
                "bg-bad-soft text-bad-text border-bad/20 shadow-bad/5",
              t.type === "info" &&
                "bg-surface text-ink border-line shadow-xs"
            )}
          >
            {t.type === "success" && (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-good" />
            )}
            {t.type === "error" && (
              <AlertCircle className="h-4 w-4 shrink-0 text-bad" />
            )}
            <span className="flex-1 text-xs leading-normal">{t.message}</span>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-muted hover:text-ink cursor-pointer p-0.5 rounded-sm"
              aria-label="Close notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: (msg: string) => console.log(msg),
    };
  }
  return context;
}
