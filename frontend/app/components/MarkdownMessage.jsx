"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

function ThinkingDots() {
  return (
    <div className="flex min-w-[52px] items-center gap-1.5 py-1.5">
      {[0, 1, 2].map((d) => (
        <motion.span
          key={d}
          className="h-2 w-2 rounded-full bg-[var(--text-muted)]"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -4, 0] }}
          transition={{ duration: 0.75, repeat: Infinity, delay: d * 0.12 }}
        />
      ))}
    </div>
  );
}

export default function MarkdownMessage({ content }) {
  if (!content) return <ThinkingDots />;

  return (
    <div className="markdown-body break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}