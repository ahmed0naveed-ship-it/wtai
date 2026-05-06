"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const DESMOS_SCRIPT_ID = "desmos-api-script";
const DEMO_KEY = "dcb31709b452b1cf9dc26972add0fda6";
function simplifyNumericFraction(match, top, bottom) {
  const a = Number(top);
  const b = Number(bottom);

  if (Number.isNaN(a) || Number.isNaN(b) || b === 0) {
    return match;
  }

  const value = a / b;

  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Number(value.toFixed(4)));
}

function stripOuterParens(text = "") {
  let s = text.trim();

  while (s.startsWith("(") && s.endsWith(")")) {
    let depth = 0;
    let valid = true;

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];

      if (ch === "(") depth++;
      if (ch === ")") depth--;

      if (depth === 0 && i < s.length - 1) {
        valid = false;
        break;
      }
    }

    if (!valid) break;
    s = s.slice(1, -1).trim();
  }

  return s;
}

function formatGraphLabel(latex = "") {
  let label = (latex || "").trim();

  if (!label) return "";

  label = label.replace(/\\left/g, "");
  label = label.replace(/\\right/g, "");

  label = label.replace(/\\sin/g, "sin");
  label = label.replace(/\\cos/g, "cos");
  label = label.replace(/\\tan/g, "tan");
  label = label.replace(/\\pi/g, "π");

  // Simplify numeric fractions: \frac{360}{180} -> 2
  label = label.replace(
    /\\frac\{(-?\d+(?:\.\d+)?)\}\{(-?\d+(?:\.\d+)?)\}/g,
    simplifyNumericFraction
  );

  // Convert \frac{π}{180} and \frac{\pi}{180} wrappers
  label = label.replace(/\\frac\{π\}\{180\}/g, "π/180");
  label = label.replace(/\\frac\{\\pi\}\{180\}/g, "π/180");

  // Remove degree conversion wrapper:
  // sin(π/180(2(x-30))) -> sin(2(x-30))
  label = label.replace(
    /(sin|cos|tan)\(\s*π\/180\s*\((.*)\)\s*\)/g,
    (_, fn, inner) => `${fn}(${stripOuterParens(inner)})`
  );

  // Also catch cases without the extra parentheses
  label = label.replace(
    /(sin|cos|tan)\(\s*π\/180\s*(.*)\s*\)/g,
    (_, fn, inner) => `${fn}(${stripOuterParens(inner)})`
  );

  // x--60 -> x+60
  label = label.replace(/x--/g, "x+");

  // y= -> y =
  label = label.replace(/^y=/, "y = ");

  // Add spacing around + and - but avoid breaking negative numbers too badly
  label = label.replace(/([^\s])([+\-])([^\s])/g, "$1 $2 $3");

  // Clean spaces
  label = label.replace(/\(\s+/g, "(");
  label = label.replace(/\s+\)/g, ")");
  label = label.replace(/\s+/g, " ").trim();

  return label;
}


function loadDesmos() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;

    if (window.Desmos) {
      resolve(window.Desmos);
      return;
    }

    const existing = document.getElementById(DESMOS_SCRIPT_ID);

    if (existing) {
      existing.addEventListener("load", () => resolve(window.Desmos));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = DESMOS_SCRIPT_ID;

    const key = process.env.NEXT_PUBLIC_DESMOS_API_KEY || DEMO_KEY;

    script.src = `https://www.desmos.com/api/v1.12/calculator.js?apiKey=${key}`;
    script.async = true;

    script.onload = () => resolve(window.Desmos);
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

export default function GraphCard({ latex = "y=x^2", onChangeLatex }) {
  const containerRef = useRef(null);
  const calculatorRef = useRef(null);

  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(latex);

  useEffect(() => {
    setDraft(latex);
  }, [latex]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setError("");
        setReady(false);
        setMounted(false);

        const Desmos = await loadDesmos();

        if (cancelled || !containerRef.current) return;

        if (calculatorRef.current?.destroy) {
          calculatorRef.current.destroy();
          calculatorRef.current = null;
        }

        const calculator = Desmos.GraphingCalculator(containerRef.current, {
          expressions: false,
          settingsMenu: false,
          zoomButtons: true,
          keypad: false,
          expressionsTopbar: false,
          border: false,
        });

        calculatorRef.current = calculator;

        calculator.setExpression({
          id: "main-graph",
          latex: latex || "y=x^2",
        });

        requestAnimationFrame(() => {
          calculator.resize?.();
          setMounted(true);
        });

        setTimeout(() => {
          calculator.resize?.();

          if (!cancelled) {
            setReady(true);
          }
        }, 260);
      } catch (err) {
        console.error(err);
        setError("Graph failed to load.");
      }
    }

    init();

    return () => {
      cancelled = true;

      if (calculatorRef.current?.destroy) {
        calculatorRef.current.destroy();
        calculatorRef.current = null;
      }
    };
  }, [latex]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      calculatorRef.current?.resize?.();
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  function saveGraphEdit() {
    const clean = draft.trim();
    if (!clean) return;

    onChangeLatex?.(clean);
    setEditing(false);
  }

  function cancelGraphEdit() {
    setDraft(latex);
    setEditing(false);
  }

  return (
    <motion.div
      layout
      className="relative my-4 w-full overflow-hidden rounded-[26px] border border-[var(--border-soft)] bg-[var(--surface-soft)] shadow-2xl shadow-black/15"
      initial={{
        opacity: 0,
        y: 24,
        scale: 0.965,
        filter: "blur(12px)",
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 24,
        mass: 0.9,
      }}
      whileHover={{
        y: -2,
        scale: 1.003,
        transition: { duration: 0.18 },
      }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? [0.22, 0.08, 0.18] : 0.1 }}
        transition={{
          duration: 2.4,
          repeat: ready ? Infinity : 0,
          ease: "easeInOut",
        }}
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.16), transparent 38%)",
        }}
      />

      <motion.div
        className="relative z-10 border-b border-[var(--border-soft)] px-4 py-3"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.24, ease: "easeOut" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <motion.div
              className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12, duration: 0.22 }}
            >
              <motion.span
                className="inline-block h-2 w-2 rounded-full bg-[var(--text-main)]"
                animate={
                  ready
                    ? {
                        scale: [1, 1.45, 1],
                        opacity: [0.55, 1, 0.55],
                      }
                    : {
                        scale: [1, 1.25, 1],
                        opacity: [0.35, 0.75, 0.35],
                      }
                }
                transition={{ duration: 1.1, repeat: Infinity }}
              />
              Graph
              <span className="rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-faint)]">
                beta
              </span>
            </motion.div>

            <AnimatePresence mode="wait">
              {editing ? (
                <motion.div
                  key="graph-edit"
                  className="mt-3"
                  initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                  transition={{ duration: 0.18 }}
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveGraphEdit();
                      }

                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelGraphEdit();
                      }
                    }}
                    autoFocus
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--composer-bg)] px-3 py-2 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-faint)]"
                    placeholder="y=x^2"
                  />

                  <div className="mt-2 flex justify-end gap-2">
                    <motion.button
                      onClick={cancelGraphEdit}
                      className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--text-faint)] hover:bg-[var(--surface-hover)]"
                      whileTap={{ scale: 0.95 }}
                      type="button"
                    >
                      cancel
                    </motion.button>

                    <motion.button
                      onClick={saveGraphEdit}
                      className="rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-text)] hover:opacity-90"
                      whileTap={{ scale: 0.95 }}
                      type="button"
                    >
                      update graph
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="graph-label"
                  className="mt-1 max-w-[620px] truncate rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-2.5 py-1 text-xs text-[var(--text-faint)]"
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                >
                  {formatGraphLabel(latex)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!editing && (
            <div className="flex shrink-0 items-center gap-2">
              {ready && (
                <motion.div
                  className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] text-[var(--text-faint)]"
                  initial={{ opacity: 0, x: 12, scale: 0.88 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  ready
                </motion.div>
              )}

              <motion.button
                onClick={() => setEditing(true)}
                className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] text-[var(--text-faint)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
                whileHover={{ y: -1, scale: 1.03 }}
                whileTap={{ scale: 0.94 }}
                type="button"
              >
                edit graph
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      {error ? (
        <motion.div
          className="relative z-10 p-4 text-sm text-red-300"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      ) : (
        <motion.div
          layout
          className="relative h-[390px] w-full overflow-hidden bg-white"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 390, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 170,
            damping: 24,
            mass: 0.9,
          }}
        >
          <AnimatePresence>
            {!ready && (
              <motion.div
                key="graph-loader"
                className="absolute inset-0 z-20 overflow-hidden bg-white"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                <motion.div
                  className="absolute inset-0 opacity-[0.14]"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
                    backgroundSize: "42px 42px",
                  }}
                  animate={{
                    backgroundPosition: ["0px 0px", "42px 42px"],
                  }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                <motion.div
                  className="absolute inset-y-0 w-1/2"
                  animate={{ x: ["-70%", "240%"] }}
                  transition={{
                    duration: 1.05,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.08) 50%, transparent 100%)",
                  }}
                />

                <motion.div
                  className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/5 px-3 py-1 text-xs text-black/45"
                  animate={{
                    opacity: [0.45, 0.95, 0.45],
                    y: [0, -2, 0],
                  }}
                  transition={{
                    duration: 1.1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  plotting graph
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={
              ready
                ? {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    filter: "blur(0px)",
                  }
                : {
                    opacity: 0,
                    scale: 0.96,
                    y: 20,
                    filter: "blur(10px)",
                  }
            }
            transition={{
              type: "spring",
              stiffness: 210,
              damping: 22,
              mass: 0.85,
            }}
          >
            <div
              ref={containerRef}
              className="h-full w-full min-w-[620px] overflow-hidden bg-white"
            />
          </motion.div>

          <AnimatePresence>
            {ready && mounted && (
              <motion.div
                className="pointer-events-none absolute inset-0 z-10 rounded-none"
                initial={{ opacity: 0.18 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                style={{
                  boxShadow: "inset 0 0 80px rgba(0,0,0,0.18)",
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}