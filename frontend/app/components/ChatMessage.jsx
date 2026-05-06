"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import BrandMark from "./BrandMark";
import MarkdownMessage from "./MarkdownMessage";
import GraphCard from "./GraphCard";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function extractGraph(content, fallbackLatex) {
  if (fallbackLatex) {
    return {
      graphLatex: fallbackLatex,
      cleanContent: content || "",
    };
  }

  const text = content || "";
  const match = text.match(/\[Graph:\s*([^\]]+)\]/i);

  if (!match) {
    return {
      graphLatex: null,
      cleanContent: text,
    };
  }

  return {
    graphLatex: match[1].trim(),
    cleanContent: text.replace(match[0], "").trim(),
  };
}

function StreamingText({ content }) {
  if (!content) {
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

  return (
    <div className="whitespace-pre-wrap break-words leading-8 text-[var(--text-main)]">
      {content}
    </div>
  );
}

function ActionButton({ children, danger = false, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[11px] font-medium transition backdrop-blur-xl",
        danger
          ? "border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/15 hover:text-red-200"
          : "border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-faint)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
      )}
      whileHover={{ y: -1, scale: 1.03 }}
      whileTap={{ scale: 0.94 }}
      type="button"
    >
      {children}
    </motion.button>
  );
}

export default function ChatMessage({
  message,
  onCopy,
  onDelete,
  onRegenerate,
  onEdit,
  onGraphEdit,
}) {
  const user = message.role === "user";

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content || "");
  const textareaRef = useRef(null);

  const { graphLatex, cleanContent } = extractGraph(
    message.content,
    message.graphLatex
  );

  useEffect(() => {
    if (!editing) return;

    setDraft(message.content || "");

    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;

      el.focus();
      el.style.height = "0px";
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    });
  }, [editing, message.content]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [draft]);

  function saveEdit() {
    const clean = draft.trim();
    if (!clean) return;

    setEditing(false);
    onEdit?.(clean);
  }

  function cancelEdit() {
    setDraft(message.content || "");
    setEditing(false);
  }

  return (
    <motion.div
      layout
      className={cn("group", user ? "self-end" : "self-start")}
      initial={{ opacity: 0, y: 18, scale: 0.985, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <div className={cn("flex gap-3", user && "flex-row-reverse")}>
        {!user && <BrandMark />}

        <motion.div
          whileHover={{ y: -1 }}
          className={cn(
            "max-w-[86vw] text-[15px] md:max-w-[760px]",
            !user && graphLatex && "w-[min(760px,calc(100vw-40px))] md:w-[min(760px,calc(100vw-120px))]",
            user
              ? "rounded-[28px] bg-[var(--user-bubble)] px-4 py-3 text-[var(--user-text)] shadow-lg shadow-black/10"
              : "px-1 py-1 text-[var(--text-main)]"
          )}
        >
          {message.imageUrl && (
            <motion.div
              className={cn(
                "mb-3 overflow-hidden rounded-2xl border",
                user
                  ? "border-black/10 bg-black/5"
                  : "border-[var(--border-soft)] bg-[var(--surface-soft)]"
              )}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22 }}
            >
              <img
                src={message.imageUrl}
                alt={message.imageName || "attached image"}
                className="max-h-[320px] w-full object-contain"
              />
            </motion.div>
          )}

          {!message.imageUrl && message.imageName && (
            <div
              className={cn(
                "mb-2 inline-flex rounded-full px-3 py-1.5 text-xs",
                user
                  ? "bg-black/10 text-black/58"
                  : "bg-[var(--surface-soft)] text-[var(--text-faint)]"
              )}
            >
              attached image
            </div>
          )}

          {!user && graphLatex && (
            <GraphCard
              latex={graphLatex}
              onChangeLatex={(nextLatex) => onGraphEdit?.(nextLatex)}
            />
          )}

          {user && editing ? (
            <div className="w-[min(620px,78vw)]">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit();
                  }

                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEdit();
                  }
                }}
                rows={1}
                className="max-h-[180px] w-full resize-none bg-transparent text-[15px] leading-7 text-[var(--user-text)] outline-none"
              />

              <div className="mt-3 flex justify-end gap-2">
                <motion.button
                  onClick={cancelEdit}
                  className="rounded-full bg-black/10 px-3 py-1.5 text-xs text-black/55 hover:bg-black/15"
                  whileTap={{ scale: 0.95 }}
                  type="button"
                >
                  cancel
                </motion.button>

                <motion.button
                  onClick={saveEdit}
                  className="rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/85"
                  whileTap={{ scale: 0.95 }}
                  type="button"
                >
                  save & rerun
                </motion.button>
              </div>
            </div>
          ) : user ? (
            <div className="whitespace-pre-wrap break-words leading-7">
              {message.content}
            </div>
          ) : message.streaming ? (
            <StreamingText content={cleanContent} />
          ) : cleanContent ? (
            <MarkdownMessage content={cleanContent} />
          ) : null}
        </motion.div>
      </div>

      {!message.streaming && !editing && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100",
            user ? "justify-end pr-1" : "justify-start pl-[44px]"
          )}
        >
          <ActionButton onClick={onCopy}>copy</ActionButton>

          {user ? (
            <>
              <ActionButton onClick={() => setEditing(true)}>edit</ActionButton>
              <ActionButton danger onClick={onDelete}>
                delete
              </ActionButton>
            </>
          ) : (
            <ActionButton onClick={onRegenerate}>regenerate</ActionButton>
          )}
        </div>
      )}
    </motion.div>
  );
}