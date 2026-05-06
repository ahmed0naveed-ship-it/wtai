"use client";

import { motion } from "framer-motion";
import BrandMark from "./BrandMark";

export default function EmptyState({ starters, onPick }) {
  return (
    <motion.div
      className="mx-auto flex min-h-[62vh] max-w-3xl flex-col items-center justify-center text-center"
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <BrandMark size="lg" />

      <h1 className="mt-7 text-4xl font-semibold tracking-tight text-[var(--text-main)] md:text-5xl">
        What can I help with?
      </h1>

      <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-faint)] md:text-base">
        Ask anything, paste a screenshot, or attach an image.
      </p>

      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        {starters.map((starter, i) => (
          <motion.button
            key={starter}
            onClick={() => onPick(starter)}
            className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-4 text-left text-sm text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {starter}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}