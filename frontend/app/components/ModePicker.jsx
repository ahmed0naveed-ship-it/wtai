"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ModePicker({ mode, setMode, modes }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const activeMode = modes.find((m) => m.id === mode) || modes[0];

  useEffect(() => {
    function handleClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <motion.button
        onClick={() => setOpen((p) => !p)}
        className="flex h-10 items-center gap-1 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
        whileTap={{ scale: 0.96 }}
      >
        {activeMode.label}
        <span className="text-[10px]">⌄</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-12 right-0 z-50 w-64 overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--popover-bg)] p-1.5 shadow-2xl shadow-black/20"
            initial={{ opacity: 0, y: 8, scale: 0.98, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8, scale: 0.98, filter: "blur(8px)" }}
            transition={{ duration: 0.16 }}
          >
            {modes.map((item) => {
              const active = item.id === mode;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setMode(item.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full rounded-xl px-3 py-2.5 text-left transition",
                    active
                      ? "bg-[var(--primary)] text-[var(--primary-text)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
                  )}
                >
                  <div className="text-sm font-medium">{item.label}</div>
                  <div
                    className={cn(
                      "text-xs",
                      active ? "opacity-65" : "text-[var(--text-faint)]"
                    )}
                  >
                    {item.desc}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}