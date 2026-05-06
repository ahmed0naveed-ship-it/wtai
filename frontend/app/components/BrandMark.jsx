"use client";

import { motion } from "framer-motion";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function BrandMark({ size = "md" }) {
  const large = size === "lg";

  return (
    <motion.div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden border border-white/10 bg-white text-black shadow-xl shadow-black/35",
        large ? "h-14 w-14 rounded-[20px]" : "h-8 w-8 rounded-xl"
      )}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.95),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.25),transparent)]"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <span
        className={cn(
          "relative font-black tracking-tight",
          large ? "text-2xl" : "text-[15px]"
        )}
      >
        W
      </span>
    </motion.div>
  );
}