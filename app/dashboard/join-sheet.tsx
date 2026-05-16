"use client";

import { useEffect } from "react";
import JoinForm from "./join-form";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function JoinSheet({ open, onClose }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} />
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl px-6 pt-5"
        style={{
          background: "#1A1A1A",
          paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: "#2A2A2A" }} />
        <p className="font-semibold text-base mb-5" style={{ color: "#F5F5F5" }}>
          Unirse a un evento
        </p>
        <JoinForm />
      </div>
    </div>
  );
}
