"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import ModePicker from "./ModePicker";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Composer({
  question,
  setQuestion,
  file,
  setFile,
  mode,
  setMode,
  modes,
  loading,
  onAttach,
  onSend,
  onStop,
  onGraphRequest,
}) {
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const toolsRef = useRef(null);

  const [toolsOpen, setToolsOpen] = useState(false);

  const canSend = question.trim().length > 0 || file;

  const previewUrl = useMemo(() => {
    if (!file || !file.type?.startsWith("image/")) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    function handleClick(e) {
      if (!toolsRef.current) return;

      if (!toolsRef.current.contains(e.target)) {
        setToolsOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [question]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      if (!loading && canSend) {
        onSend();
      }
    }
  }

  function handleAddImage() {
    fileRef.current?.click();
    setToolsOpen(false);
  }

  function handleGraph() {
    onGraphRequest();
    setToolsOpen(false);
  }

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 p-4 md:p-6">
      <motion.div
        className="pointer-events-auto mx-auto w-full max-w-3xl rounded-[28px] border border-[var(--border-soft)] bg-[var(--composer-bg)] shadow-2xl shadow-black/20 backdrop-blur-2xl"
        initial={{ opacity: 0, y: 16, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28 }}
      >
        {file && (
          <motion.div
            className="mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-2.5"
            initial={{ opacity: 0, y: 6, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
          >
            {previewUrl && (
              <img
                src={previewUrl}
                alt="attachment preview"
                className="h-14 w-14 rounded-xl object-cover"
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-[var(--text-main)]">
                {file.name}
              </div>
              <div className="text-xs text-[var(--text-faint)]">
                attached image
              </div>
            </div>

            <button
              onClick={() => setFile(null)}
              className="rounded-full px-3 py-1.5 text-xs text-[var(--text-faint)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
            >
              remove
            </button>
          </motion.div>
        )}

        <div className="flex items-end gap-2 px-3 py-3">
          <div ref={toolsRef} className="relative mb-1">
            <motion.button
              onClick={() => setToolsOpen((p) => !p)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xl text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.93 }}
              type="button"
            >
              +
            </motion.button>

            <AnimatePresence>
              {toolsOpen && (
                <motion.div
                  className="absolute bottom-12 left-0 z-50 w-64 overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--popover-bg)] p-1.5 shadow-2xl shadow-black/20"
                  initial={{
                    opacity: 0,
                    y: 8,
                    scale: 0.98,
                    filter: "blur(8px)",
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    filter: "blur(0px)",
                  }}
                  exit={{
                    opacity: 0,
                    y: 8,
                    scale: 0.98,
                    filter: "blur(8px)",
                  }}
                  transition={{ duration: 0.16 }}
                >
                  <button
                    onClick={handleAddImage}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
                    type="button"
                  >
                    <span>Add image</span>
                    <span className="text-xs text-[var(--text-faint)]">
                      upload
                    </span>
                  </button>

                  <button
                    onClick={handleGraph}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
                    type="button"
                  >
                    <span>Graph</span>
                    <span className="rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[10px] text-[var(--text-faint)]">
                      beta
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onAttach(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask WTAI anything..."
            rows={1}
            className="max-h-[180px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-[16px] leading-6 text-[var(--text-main)] outline-none placeholder:text-[var(--text-faint)]"
          />

          <div className="mb-1 shrink-0">
            <ModePicker mode={mode} setMode={setMode} modes={modes} />
          </div>

          <motion.button
            onClick={loading ? onStop : onSend}
            disabled={!loading && !canSend}
            className={cn(
              "mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-base font-semibold transition",
              loading
                ? "bg-red-500/90 text-white hover:bg-red-500"
                : canSend
                ? "bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90"
                : "bg-[var(--surface-soft)] text-[var(--text-faint)]"
            )}
            whileHover={loading || canSend ? { scale: 1.04, y: -1 } : {}}
            whileTap={loading || canSend ? { scale: 0.93 } : {}}
            type="button"
          >
            {loading ? "■" : "↑"}
          </motion.button>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-2 text-[11px] text-[var(--text-faint)]">
          <span>Shift + Enter for new line</span>
          <span>Graph beta can read your prompt</span>
        </div>
      </motion.div>
    </div>
  );
}