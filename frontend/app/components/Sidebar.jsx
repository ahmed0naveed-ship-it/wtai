"use client";

import { AnimatePresence, motion } from "framer-motion";
import BrandMark from "./BrandMark";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(ts) {
  if (!ts) return "";

  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function SidebarContent({
  chats,
  activeId,
  search,
  onSearch,
  onSelect,
  onNewChat,
  onDeleteChat,
  onClose,
  mobile = false,
}) {
  return (
    <div className="flex h-full w-[280px] flex-col">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <div className="text-sm font-semibold text-[var(--text-main)]">
              WTAI
            </div>
            <div className="text-xs text-[var(--text-faint)]">
              workspace
            </div>
          </div>
        </div>

        <motion.button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-faint)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
          whileTap={{ scale: 0.92 }}
          type="button"
        >
          {mobile ? "×" : "←"}
        </motion.button>
      </div>

      <div className="px-4">
        <motion.button
          onClick={() => {
            onNewChat();
            if (mobile) onClose();
          }}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-sm font-semibold text-[var(--primary-text)] shadow-lg shadow-black/10 hover:opacity-90"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          type="button"
        >
          <span className="text-base">＋</span>
          New chat
        </motion.button>
      </div>

      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2.5">
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-faint)]"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3 wtai-scroll">
        <div className="space-y-1.5">
          {chats.map((chat) => {
            const active = chat.id === activeId;
            const preview =
              chat.messages
                ?.slice()
                .reverse()
                .find((m) => m.role === "user")?.content || "No messages yet";

            return (
              <motion.div
                key={chat.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "group overflow-hidden rounded-2xl border transition",
                  active
                    ? "border-[var(--border-strong)] bg-[var(--surface-active)]"
                    : "border-transparent hover:bg-[var(--surface-hover)]"
                )}
              >
                <button
                  onClick={() => {
                    onSelect(chat.id);
                    if (mobile) onClose();
                  }}
                  className="w-full px-3 py-3 text-left"
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-medium text-[var(--text-main)]">
                      {chat.title}
                    </div>
                    <div className="shrink-0 text-[11px] text-[var(--text-faint)]">
                      {formatDate(chat.updatedAt)}
                    </div>
                  </div>

                  <div className="mt-1 truncate text-xs leading-5 text-[var(--text-faint)]">
                    {preview}
                  </div>
                </button>

                <div className="px-2 pb-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  <button
                    onClick={() => onDeleteChat(chat.id)}
                    className="rounded-full px-2 py-1 text-xs text-[var(--text-faint)] hover:bg-red-500/12 hover:text-red-300"
                    type="button"
                  >
                    delete
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({
  open,
  chats,
  activeId,
  search,
  onSearch,
  onSelect,
  onNewChat,
  onDeleteChat,
  onClose,
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        className="relative z-20 hidden shrink-0 overflow-hidden border-r border-[var(--border-soft)] bg-[var(--sidebar-bg)] md:block"
        initial={false}
        animate={{
          width: open ? 280 : 0,
          opacity: open ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 34 }}
      >
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              className="h-full w-[280px]"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <SidebarContent
                chats={chats}
                activeId={activeId}
                search={search}
                onSearch={onSearch}
                onSelect={onSelect}
                onNewChat={onNewChat}
                onDeleteChat={onDeleteChat}
                onClose={onClose}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {open && (
          <div className="md:hidden">
            <motion.div
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <motion.aside
              className="fixed bottom-0 left-0 top-0 z-50 w-[min(86vw,320px)] overflow-hidden border-r border-[var(--border-soft)] bg-[var(--sidebar-bg)] shadow-2xl shadow-black/30"
              initial={{ x: "-105%", opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-105%", opacity: 0.6 }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 30,
              }}
            >
              <SidebarContent
                mobile
                chats={chats}
                activeId={activeId}
                search={search}
                onSearch={onSearch}
                onSelect={onSelect}
                onNewChat={onNewChat}
                onDeleteChat={onDeleteChat}
                onClose={onClose}
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}