"use client";

import "katex/dist/katex.min.css";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Sidebar from "./components/Sidebar";
import ChatMessage from "./components/ChatMessage";
import Composer from "./components/Composer";
import EmptyState from "./components/EmptyState";
import BrandMark from "./components/BrandMark";
import SettingsPanel from "./components/SettingsPanel";

const STORAGE_KEY = "wtai_chats_revamp_v2";
const THEME_KEY = "wtai_theme_v1";
const SETTINGS_KEY = "wtai_settings_v1";

const DEFAULT_SETTINGS = {
  defaultMode: "general",
  memoryEnabled: true,
  graphUnits: "degrees",
};

const MODES = [
  { id: "general", label: "General", desc: "smart everyday help" },
  { id: "math", label: "Math", desc: "steps, equations, accuracy" },
  { id: "english", label: "English", desc: "writing, essays, reading" },
  { id: "science", label: "Science", desc: "clear science help" },
];

const STARTERS = [
  "Solve this from an image",
  "Explain this problem simply",
  "Make me a practice question",
  "Check if my answer is right",
];

function uid() {
  return crypto.randomUUID();
}
function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      resolve(null);
    };

    reader.readAsDataURL(file);
  });
}

async function dataUrlToFile(dataUrl, filename = "attached-image.png") {
  if (!dataUrl) return null;

  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    return new File([blob], filename, {
      type: blob.type || "image/png",
    });
  } catch {
    return null;
  }
}

function makeMessage(role, content, extra = {}) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    imageName: null,
    imageUrl: null,
    imageSummary: null,
    graphLatex: null,
    streaming: false,
    createdAt: Date.now(),
    ...extra,
  };
}

function createChat() {
  return {
    id: uid(),
    title: "New chat",
    updatedAt: Date.now(),
    messages: [],
  };
}

function normalizeChat(chat) {
  return {
    id: chat?.id || uid(),
    title: chat?.title || "New chat",
    updatedAt: chat?.updatedAt || Date.now(),
messages: Array.isArray(chat?.messages)
  ? chat.messages.map((m) => ({
      id: m?.id || uid(),
      role: m?.role || "assistant",
      content: m?.content || "",
imageName: m?.imageName || null,
imageUrl: m?.imageUrl || null,
imageSummary: m?.imageSummary || null,
graphLatex: m?.graphLatex || null,
      streaming: Boolean(m?.streaming),
      createdAt: m?.createdAt || Date.now(),
    }))
  : [],
  };
}

function titleFrom(text, options = {}) {
  const cleaned = (text || "").trim().replace(/\s+/g, " ");
  const graphLatex = options.graphLatex || "";

  if (graphLatex) {
    const g = graphLatex.toLowerCase();

    if (g.includes("\\sin") || g.includes("sin")) return "Sine Graph";
    if (g.includes("\\cos") || g.includes("cos")) return "Cosine Graph";
    if (g.includes("\\tan") || g.includes("tan")) return "Tangent Graph";
    if (g.includes("x^2")) return "Quadratic Graph";
    if (g.includes("y=x")) return "Linear Graph";

    return "Graph";
  }

  if (!cleaned) return "New chat";

  const lower = cleaned.toLowerCase();

  if (lower.includes("photosynthesis")) return "Photosynthesis";
  if (lower.includes("cellular respiration")) return "Cellular Respiration";
  if (lower.includes("mitosis")) return "Mitosis";
  if (lower.includes("meiosis")) return "Meiosis";
  if (lower.includes("genetics")) return "Genetics";

  if (lower.includes("essay") || lower.includes("thesis")) return "Essay Help";
  if (lower.includes("paragraph")) return "Paragraph Help";
  if (lower.includes("grammar")) return "Grammar Help";
  if (lower.includes("summary") || lower.includes("summarize")) return "Summary Help";

  if (lower.includes("quadratic")) return "Quadratics";
  if (lower.includes("sine") || lower.includes("sin")) return "Sine Function";
  if (lower.includes("cosine") || lower.includes("cos")) return "Cosine Function";
  if (lower.includes("tangent") || lower.includes("tan")) return "Tangent Function";
  if (lower.includes("derivative")) return "Derivatives";
  if (lower.includes("factor")) return "Factoring";

  if (lower.includes("physics")) return "Physics Help";
  if (lower.includes("forces") || lower.includes("newton")) return "Forces";
  if (lower.includes("light") || lower.includes("refraction")) return "Light & Optics";
  if (lower.includes("chemistry")) return "Chemistry Help";

  if (lower.includes("image") || lower.includes("attached") || lower.includes("screenshot")) {
    return "Image Solver";
  }

  if (lower.startsWith("graph ") || lower.includes(" graph ")) {
    return "Graph";
  }

  if (lower.startsWith("explain ")) {
    const topic = cleaned.replace(/^explain\s+/i, "").trim();
    return smartCap(topic || "Explanation");
  }

  if (lower.startsWith("solve ")) {
    const topic = cleaned.replace(/^solve\s+/i, "").trim();
    return smartCap(topic || "Solver");
  }

  return smartCap(cleaned.length > 38 ? `${cleaned.slice(0, 38)}...` : cleaned);
}

function smartCap(text) {
  const smallWords = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
  ]);

  return text
    .split(" ")
    .map((word, index) => {
      if (!word) return word;

      const lower = word.toLowerCase();

      if (index !== 0 && smallWords.has(lower)) {
        return lower;
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function cleanEquationText(text) {
  return text
    .replace(/graph/gi, "")
    .replace(/plot/gi, "")
    .replace(/desmos/gi, "")
    .replace(/please/gi, "")
    .replace(/can you/gi, "")
    .trim();
}

function directEquationToLatex(text) {
  const cleaned = cleanEquationText(text);

  const yMatch = cleaned.match(/y\s*=\s*[^.!?]+/i);
  if (!yMatch) return null;

  return yMatch[0]
    .replace(/sin/gi, "\\sin")
    .replace(/cos/gi, "\\cos")
    .replace(/tan/gi, "\\tan")
    .replace(/pi/gi, "\\pi");
}

function numberAfter(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1] !== undefined) {
      const value = Number(match[1]);

      if (!Number.isNaN(value)) {
        return value;
      }
    }
  }

  return null;
}

function graphLatexFromPrompt(text, force = false, graphUnits = "degrees") {
  const raw = (text || "").trim();
  const lower = raw.toLowerCase();

  const wantsGraph =
    force ||
    lower.includes("graph") ||
    lower.includes("plot") ||
    lower.includes("desmos") ||
    lower.includes("function") ||
    /\by\s*=/.test(lower);

  if (!wantsGraph) return null;

  const direct = directEquationToLatex(raw);
  if (direct) return direct;

  const isSin =
    lower.includes("sine") ||
    lower.includes("sin") ||
    lower.includes("sinusoidal");

  const isCos = lower.includes("cosine") || lower.includes("cos");
  const isTan = lower.includes("tangent") || lower.includes("tan");

  const isQuadratic =
    lower.includes("quadratic") ||
    lower.includes("parabola") ||
    lower.includes("x squared") ||
    lower.includes("x^2");

  const isLinear =
    lower.includes("linear") ||
    lower.includes("line") ||
    lower.includes("slope");

const explicitlyRadian =
  lower.includes("radian") ||
  lower.includes("radians") ||
  lower.includes("rad");

const explicitlyDegree =
  lower.includes("degree") ||
  lower.includes("degrees") ||
  lower.includes("°");

const isDegree = explicitlyDegree || (!explicitlyRadian && graphUnits !== "radians");
  const amplitude =
    numberAfter(lower, [
      /amplitude\s*(?:of|is|=)?\s*(-?\d+(?:\.\d+)?)/,
      /\ba\s*value\s*(?:of|is|=)?\s*(-?\d+(?:\.\d+)?)/,
      /\ba\s*=\s*(-?\d+(?:\.\d+)?)/,
      /\ba\s*is\s*(-?\d+(?:\.\d+)?)/,
    ]) ?? 1;

  const bValue =
    numberAfter(lower, [
      /\bb\s*value\s*(?:of|is|=)?\s*(-?\d+(?:\.\d+)?)/,
      /\bb\s*=\s*(-?\d+(?:\.\d+)?)/,
      /\bb\s*is\s*(-?\d+(?:\.\d+)?)/,
      /frequency\s*(?:of|is|=)?\s*(-?\d+(?:\.\d+)?)/,
    ]) ?? null;

  const period =
    numberAfter(lower, [
      /period\s*(?:of|is|=)?\s*(-?\d+(?:\.\d+)?)/,
      /cycle\s*(?:of|is|=)?\s*(-?\d+(?:\.\d+)?)/,
      /repeats every\s*(-?\d+(?:\.\d+)?)/,
    ]) ?? null;

  const verticalShift =
    numberAfter(lower, [
      /vertical shift\s*(?:of|is|=)?\s*(-?\d+(?:\.\d+)?)/,
      /shifted up\s*(-?\d+(?:\.\d+)?)/,
      /shift up\s*(-?\d+(?:\.\d+)?)/,
      /shifted down\s*(-?\d+(?:\.\d+)?)/,
      /shift down\s*(-?\d+(?:\.\d+)?)/,
      /midline\s*(?:of|is|=)?\s*y?\s*=?\s*(-?\d+(?:\.\d+)?)/,
      /\bk\s*=\s*(-?\d+(?:\.\d+)?)/,
      /\bk\s*value\s*(?:of|is|=)?\s*(-?\d+(?:\.\d+)?)/,
    ]) ?? 0;

  const shiftedDown =
    numberAfter(lower, [
      /shifted down\s*(-?\d+(?:\.\d+)?)/,
      /shift down\s*(-?\d+(?:\.\d+)?)/,
    ]);

  const finalVerticalShift =
    shiftedDown !== null ? -Math.abs(shiftedDown) : verticalShift;

  let phaseShift =
    numberAfter(lower, [
      /phase shift\s*(?:of|is|=)?\s*(-?\d+(?:\.\d+)?)/,
      /horizontal shift\s*(?:of|is|=)?\s*(-?\d+(?:\.\d+)?)/,
      /shifted right\s*(-?\d+(?:\.\d+)?)/,
      /shift right\s*(-?\d+(?:\.\d+)?)/,
      /\bh\s*=\s*(-?\d+(?:\.\d+)?)/,
      /\bh\s*value\s*(?:of|is|=)?\s*(-?\d+(?:\.\d+)?)/,
    ]) ?? 0;

  const leftShift =
    numberAfter(lower, [
      /shifted left\s*(-?\d+(?:\.\d+)?)/,
      /shift left\s*(-?\d+(?:\.\d+)?)/,
    ]);

  if (leftShift !== null) {
    phaseShift = -Math.abs(leftShift);
  }

  const plusK =
    finalVerticalShift === 0
      ? ""
      : finalVerticalShift > 0
      ? `+${finalVerticalShift}`
      : `${finalVerticalShift}`;

  function formatNumber(value) {
    if (value === 1) return "";
    if (value === -1) return "-";
    return `${value}`;
  }

  function bExpression() {
    if (period && period !== 0) {
      if (isDegree) {
        return `\\frac{360}{${period}}`;
      }

      return `\\frac{2\\pi}{${period}}`;
    }

    if (bValue !== null) {
      return `${bValue}`;
    }

    return "";
  }

  function trigExpression(name) {
    const amp = formatNumber(amplitude);
    const b = bExpression();

    if (isDegree) {
      if (b) {
        return `y=${amp}\\${name}\\left(\\frac{\\pi}{180}\\left(${b}\\left(x-${phaseShift}\\right)\\right)\\right)${plusK}`;
      }

      return `y=${amp}\\${name}\\left(\\frac{\\pi}{180}\\left(x-${phaseShift}\\right)\\right)${plusK}`;
    }

    if (b) {
      return `y=${amp}\\${name}\\left(${b}\\left(x-${phaseShift}\\right)\\right)${plusK}`;
    }

    return `y=${amp}\\${name}\\left(x-${phaseShift}\\right)${plusK}`;
  }

  if (isSin) return trigExpression("sin");
  if (isCos) return trigExpression("cos");
  if (isTan) return trigExpression("tan");

  if (isQuadratic) return "y=x^2";
  if (isLinear) return "y=x";

  return null;
}


function shortText(text, max = 420) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}
function imageMemoryFromAnswer(answer) {
  const clean = shortText(answer || "", 520);

  if (!clean) {
    return "Image was uploaded, but no useful summary was generated.";
  }

  return clean;
}
function buildGlobalMemory(chats, activeId) {
  const otherChats = chats
    .filter((chat) => chat.id !== activeId)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 8);

  const memoryBlocks = otherChats
    .map((chat) => {
      const usefulMessages = (chat.messages || [])
        .filter((m) => m.content || m.imageName || m.imageSummary)
        .slice(-8)
        .map((m) => {
          const role = (m.role || "user").toUpperCase();
          const content = shortText(m.content || "", 360);

          if (m.imageSummary) {
            return `${role} [image memory]: ${m.imageSummary}`;
          }

          if (m.imageName) {
            return `${role} [image attached]: ${content || "Image was uploaded."}`;
          }

          return `${role}: ${content}`;
        })
        .join("\n");

      if (!usefulMessages) return "";

      return `Saved chat title: ${chat.title || "Untitled"}\n${usefulMessages}`;
    })
    .filter(Boolean);

  return memoryBlocks.join("\n\n---\n\n");
}

export default function Page() {
const [ready, setReady] = useState(false);
const [sidebarOpen, setSidebarOpen] = useState(false);
const [settingsOpen, setSettingsOpen] = useState(false);

const [theme, setTheme] = useState("dark");
const [settings, setSettings] = useState(DEFAULT_SETTINGS);
const [chats, setChats] = useState([]);
const [activeId, setActiveId] = useState(null);

  const [search, setSearch] = useState("");
  const [question, setQuestion] = useState("");
  const [file, setFile] = useState(null);

const [mode, setMode] = useState("general");
const [loading, setLoading] = useState(false);
const [dragging, setDragging] = useState(false);
const [error, setError] = useState("");

const abortRef = useRef(null);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }
const savedSettings = localStorage.getItem(SETTINGS_KEY);

if (savedSettings) {
  const parsedSettings = JSON.parse(savedSettings);

  setSettings({
    ...DEFAULT_SETTINGS,
    ...parsedSettings,
  });

  if (parsedSettings.defaultMode) {
    setMode(parsedSettings.defaultMode);
  }
}
      const saved =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem("wtai_chats_revamp_v1") ||
        localStorage.getItem("wtai_chats_v6") ||
        localStorage.getItem("wtai_chats_v5") ||
        localStorage.getItem("wtai_chats_v4") ||
        localStorage.getItem("wtai_chats_v3");

      const parsed = saved ? JSON.parse(saved) : null;

      if (Array.isArray(parsed) && parsed.length) {
        const normalized = parsed.map(normalizeChat);
        setChats(normalized);
        setActiveId(normalized[0].id);
      } else {
        const first = createChat();
        setChats([first]);
        setActiveId(first.id);
      }
    } catch {
      const first = createChat();
      setChats([first]);
      setActiveId(first.id);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    }
  }, [chats, ready]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}, [settings]);

useEffect(() => {
  if (settings.defaultMode && settings.defaultMode !== mode) {
    setMode(settings.defaultMode);
  }
}, [settings.defaultMode]);

  useEffect(() => {
    function handlePaste(e) {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));

      if (!imageItem) return;

      const pastedFile = imageItem.getAsFile();
      if (!pastedFile) return;

      e.preventDefault();

      const cleanFile = new File(
        [pastedFile],
        `pasted-image-${Date.now()}.png`,
        { type: pastedFile.type || "image/png" }
      );

      setError("");
      setFile(cleanFile);
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const activeChat = useMemo(() => {
    return chats.find((chat) => chat.id === activeId) || chats[0] || null;
  }, [chats, activeId]);

  const activeMode = useMemo(() => {
    return MODES.find((m) => m.id === mode) || MODES[0];
  }, [mode]);

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chats;

    return chats.filter((chat) => {
      const titleMatch = (chat.title || "").toLowerCase().includes(q);
      const messageMatch = (chat.messages || []).some((m) =>
        (m.content || "").toLowerCase().includes(q)
      );
      return titleMatch || messageMatch;
    });
  }, [chats, search]);

  const updateChat = useCallback((chatId, updater) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...updater(chat),
              updatedAt: Date.now(),
            }
          : chat
      )
    );
  }, []);
function clearAllChats() {
  const fresh = createChat();

  localStorage.removeItem(STORAGE_KEY);

  setChats([fresh]);
  setActiveId(fresh.id);
  setQuestion("");
  setFile(null);
  setError("");
  setSettingsOpen(false);
}
  function startNewChat() {
    const chat = createChat();
    setChats((prev) => [chat, ...prev]);
    setActiveId(chat.id);
    setQuestion("");
    setFile(null);
    setError("");
  }

  function deleteChat(chatId) {
    setChats((prev) => {
      const remaining = prev.filter((chat) => chat.id !== chatId);

      if (!remaining.length) {
        const fresh = createChat();
        setActiveId(fresh.id);
        return [fresh];
      }

      if (chatId === activeId) {
        setActiveId(remaining[0].id);
      }

      return remaining;
    });
  }

  function deleteMessage(messageId) {
    if (!activeChat) return;

    updateChat(activeChat.id, (chat) => ({
      ...chat,
      messages: chat.messages.filter((m) => m.id !== messageId),
    }));
  }

function stopResponse() {
  if (abortRef.current) {
    abortRef.current.abort();
    abortRef.current = null;
  }
}

function updateGraphLatex(messageId, nextLatex) {
  const clean = (nextLatex || "").trim();

  if (!clean) {
    setError("Graph equation cannot be empty.");
    return;
  }

  if (!activeChat) return;

  updateChat(activeChat.id, (chat) => ({
    ...chat,
    messages: chat.messages.map((m) =>
      m.id === messageId
        ? {
            ...m,
            graphLatex: clean,
          }
        : m
    ),
  }));
}


  async function copyMessage(content) {
    try {
      await navigator.clipboard.writeText(content || "");
    } catch {
      setError("Copy failed.");
    }
  }

  const attachFile = useCallback((nextFile) => {
    if (!nextFile) return;

    if (!nextFile.type.startsWith("image/")) {
      setError("Only image files are supported right now.");
      return;
    }

    setError("");
    setFile(nextFile);
  }, []);

async function streamAssistantResponse({
  chatId,
  text,
  attached = null,
  userMessageId,
  assistantMessageId,
  existingMessages,
  autoGraphLatex = null,
}) {
  const formData = new FormData();

  formData.append(
    "question",
    text || "The user uploaded an image. Respond naturally based on the image."
  );
  formData.append("mode", mode);
  formData.append("course", mode);
  formData.append("graph_latex", autoGraphLatex || "");
formData.append(
  "global_memory",
  settings.memoryEnabled ? buildGlobalMemory(chats, activeChat.id) : ""
);
  formData.append(
    "history",
    JSON.stringify(
      existingMessages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }))
    )
  );

  if (attached) {
    formData.append("file", attached);
  }

  const controller = new AbortController();
  abortRef.current = controller;

  try {
    const res = await fetch("http://127.0.0.1:8000/stream", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Backend stream error:", errorText);
      throw new Error(errorText);
    }

    if (!res.body) {
      throw new Error("No response body");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) continue;

      fullText += chunk;

      updateChat(chatId, (chat) => ({
        ...chat,
        messages: chat.messages.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: fullText,
                streaming: true,
              }
            : m
        ),
      }));
    }

    updateChat(chatId, (chat) => ({
      ...chat,
      messages: chat.messages.map((m) => {
        if (m.id === assistantMessageId) {
          return {
            ...m,
            content: fullText || "No response returned.",
            streaming: false,
          };
        }

        if (attached && m.id === userMessageId) {
          return {
            ...m,
            imageSummary: imageMemoryFromAnswer(fullText),
          };
        }

        return m;
      }),
    }));
  } catch (err) {
    if (err.name === "AbortError") {
      updateChat(chatId, (chat) => ({
        ...chat,
        messages: chat.messages.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: m.content || "Stopped.",
                streaming: false,
              }
            : m
        ),
      }));
    } else {
      console.error(err);

      updateChat(chatId, (chat) => ({
        ...chat,
        messages: chat.messages.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content:
                  "Request failed. Check your backend terminal for the real error.",
                streaming: false,
              }
            : m
        ),
      }));

      setError("Streaming request failed.");
    }
  } finally {
    abortRef.current = null;
    setLoading(false);
  }
}

async function send(options = {}) {
  if (!activeChat || loading) return;

  const hasText = question.trim().length > 0;
  const hasImage = Boolean(file);

  if (!hasText && !hasImage) {
    setError("Type a question or attach an image first.");
    return;
  }

  setError("");
  setLoading(true);

  const chatId = activeChat.id;
  const existingMessages = activeChat.messages || [];

  const text = question.trim();
  const attached = file;

  const imageUrl = attached ? await fileToDataUrl(attached) : null;

  const userMessage = makeMessage("user", text, {
    imageName: attached?.name || null,
    imageUrl,
  });

  const shouldForceGraph = Boolean(options.forceGraph);
  const autoGraphLatex = graphLatexFromPrompt(text, shouldForceGraph, settings.graphUnits);

  if (shouldForceGraph && !autoGraphLatex) {
    setLoading(false);
    setError("I couldn’t infer a graphable function from that prompt.");
    return;
  }

  const assistantMessage = makeMessage("assistant", "", {
    streaming: true,
    graphLatex: autoGraphLatex || null,
  });

  updateChat(chatId, (chat) => ({
    ...chat,
    title:
      chat.title === "New chat"
        ? titleFrom(text || "Image", { graphLatex: autoGraphLatex })
        : chat.title,
    messages: [...chat.messages, userMessage, assistantMessage],
  }));

  setQuestion("");
  setFile(null);

  await streamAssistantResponse({
    chatId,
    text,
    attached,
    userMessageId: userMessage.id,
    assistantMessageId: assistantMessage.id,
    existingMessages,
    autoGraphLatex,
  });
}

async function regenerateMessage(assistantMessageId) {
  if (!activeChat || loading) return;

  const messages = activeChat.messages || [];
  const assistantIndex = messages.findIndex((m) => m.id === assistantMessageId);

  if (assistantIndex === -1) return;

  const previousUser = [...messages]
    .slice(0, assistantIndex)
    .reverse()
    .find((m) => m.role === "user");

  if (!previousUser) {
    setError("No previous user message found to regenerate from.");
    return;
  }

  setError("");
  setLoading(true);

  const chatId = activeChat.id;
  const text = previousUser.content || "";
  const autoGraphLatex =
    messages[assistantIndex]?.graphLatex ||
  graphLatexFromPrompt(text, false, settings.graphUnits);

  const newAssistantMessage = makeMessage("assistant", "", {
    streaming: true,
    graphLatex: autoGraphLatex || null,
  });

  const historyBeforeOldAssistant = messages.slice(0, assistantIndex);

  updateChat(chatId, (chat) => ({
    ...chat,
    messages: chat.messages.map((m) =>
      m.id === assistantMessageId ? newAssistantMessage : m
    ),
  }));

  await streamAssistantResponse({
    chatId,
    text,
    attached: null,
    userMessageId: previousUser.id,
    assistantMessageId: newAssistantMessage.id,
    existingMessages: historyBeforeOldAssistant,
    autoGraphLatex,
  });
}
async function editAndRerunUserMessage(userMessageId, newContent) {
  if (!activeChat || loading) return;

  const clean = (newContent || "").trim();

  if (!clean) {
    setError("Message cannot be empty.");
    return;
  }

  const messages = activeChat.messages || [];
  const userIndex = messages.findIndex(
    (m) => m.id === userMessageId && m.role === "user"
  );

  if (userIndex === -1) {
    setError("Could not find that user message.");
    return;
  }

  setError("");
  setLoading(true);

  const chatId = activeChat.id;
  const oldUserMessage = messages[userIndex];
  const historyBeforeUser = messages.slice(0, userIndex);

  const updatedUserMessage = {
    ...oldUserMessage,
    content: clean,
    imageSummary: null,
  };

  const autoGraphLatex = graphLatexFromPrompt(clean, false, settings.graphUnits);

  const assistantMessage = makeMessage("assistant", "", {
    streaming: true,
    graphLatex: autoGraphLatex || null,
  });

  let attached = null;

  if (oldUserMessage.imageUrl) {
    attached = await dataUrlToFile(
      oldUserMessage.imageUrl,
      oldUserMessage.imageName || "attached-image.png"
    );
  }

  updateChat(chatId, (chat) => ({
    ...chat,
    title:
      chat.title === "New chat"
        ? titleFrom(clean || "Image", { graphLatex: autoGraphLatex })
        : chat.title,
    messages: [...chat.messages.slice(0, userIndex), updatedUserMessage, assistantMessage],
  }));

  await streamAssistantResponse({
    chatId,
    text: clean,
    attached,
    userMessageId: updatedUserMessage.id,
    assistantMessageId: assistantMessage.id,
    existingMessages: historyBeforeUser,
    autoGraphLatex,
  });
}
  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    attachFile(droppedFile);
  }

  if (!ready || !activeChat) {
    return (
      <main className="grid h-screen place-items-center bg-[var(--app-bg)] text-[var(--text-main)] wtai-theme-dark">
        <BrandMark size="lg" />
      </main>
    );
  }

  return (
    <main
      data-theme={theme}
      className="wtai-theme relative flex h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text-main)]"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[var(--app-bg)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,var(--soft-glow),transparent_35%)]" />
      </div>

      <Sidebar
        open={sidebarOpen}
        chats={filteredChats}
        activeId={activeId}
        search={search}
        onSearch={setSearch}
        onSelect={setActiveId}
        onNewChat={startNewChat}
        onDeleteChat={deleteChat}
        onClose={() => setSidebarOpen(false)}
      />

      <motion.section
        layout
        className="relative z-10 flex min-w-0 flex-1 flex-col"
        transition={{ type: "spring", stiffness: 260, damping: 34 }}
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-soft)] bg-[var(--header-bg)] px-4 backdrop-blur-xl md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {!sidebarOpen && (
              <motion.button
                onClick={() => setSidebarOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
                whileTap={{ scale: 0.94 }}
              >
                ☰
              </motion.button>
            )}

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--text-main)]">
                {activeChat.title}
              </div>
              <div className="text-xs text-[var(--text-faint)]">
                {activeMode.label}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
  onClick={() => setSettingsOpen(true)}
  className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
  whileTap={{ scale: 0.95 }}
  type="button"
>
  Settings
</motion.button>

            <div className="flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-xs text-[var(--text-faint)]">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]"
                animate={{ opacity: loading ? [0.35, 1, 0.35] : 0.55 }}
                transition={{ duration: 1.15, repeat: loading ? Infinity : 0 }}
              />
              {loading ? "thinking" : "ready"}
            </div>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-8 md:py-6 wtai-scroll">
          <AnimatePresence>
            {dragging && (
              <motion.div
                className="absolute inset-5 z-30 grid place-items-center rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[var(--overlay)] backdrop-blur-2xl"
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.985 }}
              >
                <div className="flex flex-col items-center text-center">
                  <BrandMark size="lg" />
                  <div className="mt-4 text-lg font-semibold text-[var(--text-main)]">
                    Drop image here
                  </div>
                  <div className="mt-1 text-sm text-[var(--text-faint)]">
                    WTAI will attach it
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {activeChat.messages.length === 0 ? (
            <EmptyState starters={STARTERS} onPick={setQuestion} />
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-48 md:gap-7 md:pb-44">
              <AnimatePresence initial={false}>
                {activeChat.messages.map((message) => (
<ChatMessage
  key={message.id}
  message={message}
  onCopy={() => copyMessage(message.content)}
  onDelete={() => deleteMessage(message.id)}
  onRegenerate={() => regenerateMessage(message.id)}
  onEdit={(newText) => editAndRerunUserMessage(message.id, newText)}
  onGraphEdit={(newLatex) => updateGraphLatex(message.id, newLatex)}
/>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {error && (
          <div className="pointer-events-none absolute bottom-36 left-1/2 z-30 w-full max-w-3xl -translate-x-1/2 px-4 md:px-0">
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-xl">
              {error}
            </div>
          </div>
        )}
<SettingsPanel
  open={settingsOpen}
  onClose={() => setSettingsOpen(false)}
  theme={theme}
  setTheme={setTheme}
  settings={settings}
  setSettings={setSettings}
  modes={MODES}
  onClearChats={clearAllChats}
/>

<Composer
  question={question}
  setQuestion={setQuestion}
  file={file}
  setFile={setFile}
  mode={mode}
  setMode={setMode}
  modes={MODES}
  loading={loading}
  onAttach={attachFile}
  onSend={() => send({ forceGraph: false })}
  onStop={stopResponse}
  onGraphRequest={() => send({ forceGraph: true })}
/>
      </motion.section>
    </main>
  );
}