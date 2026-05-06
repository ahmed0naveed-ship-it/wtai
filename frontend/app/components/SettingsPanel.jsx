"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function SettingsPanel({
  open,
  onClose,
  theme,
  setTheme,
  settings,
  setSettings,
  modes,
  onClearChats,
}) {
  const [backend, setBackend] = useState({
    loading: false,
    online: false,
    provider: "",
    model: "",
    error: "",
  });

  function updateSetting(key, value) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function checkBackend() {
    setBackend((prev) => ({
      ...prev,
      loading: true,
      error: "",
    }));

    try {
      const res = await fetch("http://127.0.0.1:8000/status", {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`);
      }

      const data = await res.json();

      setBackend({
        loading: false,
        online: true,
        provider: data.provider || "Unknown",
        model: data.model || "Unknown",
        error: "",
      });
    } catch (err) {
      setBackend({
        loading: false,
        online: false,
        provider: "",
        model: "",
        error: "Backend offline",
      });
    }
  }

  useEffect(() => {
    if (open) {
      checkBackend();
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
           className="fixed inset-x-2 bottom-2 top-auto z-50 flex max-h-[88vh] flex-col overflow-hidden rounded-[28px] border border-[var(--border-soft)] bg-[var(--popover-bg)] shadow-2xl shadow-black/30 backdrop-blur-2xl md:inset-auto md:right-4 md:top-4 md:max-h-[calc(100vh-2rem)] md:w-[min(420px,calc(100vw-2rem))]"
            initial={{
              opacity: 0,
              x: 40,
              scale: 0.96,
              filter: "blur(10px)",
            }}
            animate={{
              opacity: 1,
              x: 0,
              scale: 1,
              filter: "blur(0px)",
            }}
            exit={{
              opacity: 0,
              x: 40,
              scale: 0.96,
              filter: "blur(10px)",
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 26,
            }}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-4">
              <div>
                <div className="text-base font-semibold text-[var(--text-main)]">
                  Settings
                </div>
                <div className="text-xs text-[var(--text-faint)]">
                  Customize WTAI
                </div>
              </div>

              <motion.button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
                whileTap={{ scale: 0.94 }}
                type="button"
              >
                ×
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 wtai-scroll">
              <div className="space-y-3">
                <SettingCard title="Backend" desc="Check if your AI server is running.">
                  <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--composer-bg)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <motion.span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            backend.online ? "bg-emerald-400" : "bg-red-400"
                          )}
                          animate={{
                            opacity: backend.loading
                              ? [0.35, 1, 0.35]
                              : 1,
                            scale: backend.loading ? [1, 1.25, 1] : 1,
                          }}
                          transition={{
                            duration: 0.9,
                            repeat: backend.loading ? Infinity : 0,
                          }}
                        />

                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--text-main)]">
                            {backend.loading
                              ? "Checking..."
                              : backend.online
                              ? "Online"
                              : "Offline"}
                          </div>

                          <div className="truncate text-xs text-[var(--text-faint)]">
                            {backend.online
                              ? `${backend.provider} • ${backend.model}`
                              : backend.error || "Could not reach backend"}
                          </div>
                        </div>
                      </div>

                      <motion.button
                        onClick={checkBackend}
                        className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--text-faint)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
                        whileTap={{ scale: 0.95 }}
                        type="button"
                      >
                        Refresh
                      </motion.button>
                    </div>
                  </div>
                </SettingCard>

                <SettingCard title="Theme" desc="Change the app appearance.">
                  <Segmented
                    value={theme}
                    options={[
                      { id: "dark", label: "Dark" },
                      { id: "light", label: "Light" },
                    ]}
                    onChange={setTheme}
                  />
                </SettingCard>

                <SettingCard
                  title="Default mode"
                  desc="This mode is selected by default when you open the app."
                >
                  <select
                    value={settings.defaultMode}
                    onChange={(e) =>
                      updateSetting("defaultMode", e.target.value)
                    }
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--composer-bg)] px-3 py-2 text-sm text-[var(--text-main)] outline-none"
                  >
                    {modes.map((mode) => (
                      <option key={mode.id} value={mode.id}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </SettingCard>

                <SettingCard
                  title="Memory"
                  desc="Let WTAI use saved chats as context."
                >
                  <Segmented
                    value={settings.memoryEnabled ? "on" : "off"}
                    options={[
                      { id: "on", label: "On" },
                      { id: "off", label: "Off" },
                    ]}
                    onChange={(value) =>
                      updateSetting("memoryEnabled", value === "on")
                    }
                  />
                </SettingCard>

                <SettingCard
                  title="Graph units"
                  desc="Default units for graph prompts."
                >
                  <Segmented
                    value={settings.graphUnits}
                    options={[
                      { id: "degrees", label: "Degrees" },
                      { id: "radians", label: "Radians" },
                    ]}
                    onChange={(value) => updateSetting("graphUnits", value)}
                  />
                </SettingCard>

                <SettingCard
                  title="Clear chats"
                  desc="Delete every saved chat on this browser."
                  danger
                >
                  <motion.button
                    onClick={onClearChats}
                    className="w-full rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/15"
                    whileTap={{ scale: 0.98 }}
                    type="button"
                  >
                    Clear all chats
                  </motion.button>
                </SettingCard>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SettingCard({ title, desc, children, danger = false }) {
  return (
    <motion.div
      layout
      className={cn(
        "rounded-3xl border p-4",
        danger
          ? "border-red-400/15 bg-red-500/[0.04]"
          : "border-[var(--border-soft)] bg-[var(--surface-soft)]"
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="mb-3">
        <div className="text-sm font-semibold text-[var(--text-main)]">
          {title}
        </div>
        <div className="mt-0.5 text-xs leading-5 text-[var(--text-faint)]">
          {desc}
        </div>
      </div>

      {children}
    </motion.div>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--border-soft)] bg-[var(--composer-bg)] p-1">
      {options.map((option) => {
        const active = value === option.id;

        return (
          <motion.button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              "relative rounded-xl px-3 py-2 text-sm transition",
              active
                ? "text-[var(--primary-text)]"
                : "text-[var(--text-faint)] hover:text-[var(--text-main)]"
            )}
            whileTap={{ scale: 0.97 }}
            type="button"
          >
            {active && (
              <motion.span
                layoutId={`settings-pill-${options
                  .map((o) => o.id)
                  .join("-")}`}
                className="absolute inset-0 rounded-xl bg-[var(--primary)]"
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 28,
                }}
              />
            )}

            <span className="relative z-10">{option.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}