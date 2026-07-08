"use client";

import React from "react";
import {
  Send,
  Sparkles,
  ChevronDown,
  Terminal,
  CheckCircle2,
  RefreshCw,
  Zap,
  Plus,
  MessageSquare,
  Trash2,
  History,
  X,
  Clock,
  Wrench,
  Square,
} from "lucide-react";
import { ChatMessage, ChatSession } from "@repo/shared";
import { BOLT_STACK_LABEL } from "../lib/defaultProject";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  isGenerating: boolean;
  lastCompileError?: string | null;
  activeModel: string;
  onSelectModel: (model: string) => void;
  onSendMessage: (text: string) => void;
  onCancelMessage?: () => void;
  onNewSession: () => void;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onFixError?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STARTER_PROMPTS = [
  { text: "Build a SaaS landing page with hero and pricing", icon: "🚀" },
  { text: "Create an ecommerce dashboard with charts", icon: "📊" },
  { text: "Add authentication with login & signup pages", icon: "🔐" },
  { text: "Design a dark portfolio with project cards", icon: "✨" },
];

function relativeTime(date: Date): string {
  const delta = Date.now() - new Date(date).getTime();
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function groupByDate(
  sessions: ChatSession[],
): { label: string; items: ChatSession[] }[] {
  const now = Date.now();
  const today = new Date(now).setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;
  const lastWeek = today - 7 * 86400000;

  const buckets: Record<string, ChatSession[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    Older: [],
  };

  for (const s of sessions) {
    const t = new Date(s.updatedAt).getTime();
    if (t >= today) buckets["Today"].push(s);
    else if (t >= yesterday) buckets["Yesterday"].push(s);
    else if (t >= lastWeek) buckets["Last 7 days"].push(s);
    else buckets["Older"].push(s);
  }

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  activeSessionId,
  messages,
  isGenerating,
  lastCompileError,
  activeModel,
  onSelectModel,
  onSendMessage,
  onCancelMessage,
  onNewSession,
  onSwitchSession,
  onDeleteSession,
  onFixError,
}) => {
  const [inputText, setInputText] = React.useState("");
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [hoverDeleteId, setHoverDeleteId] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText);
    setInputText("");
    inputRef.current?.focus();
  };

  const handleSessionClick = (id: string) => {
    onSwitchSession(id);
    setHistoryOpen(false);
  };

  const grouped = groupByDate(sessions);
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0a0d1a] border-r border-white/[0.06] overflow-hidden">
      {/* ── History slide-over drawer ─────────────────────────────────── */}
      {historyOpen && (
        <>
          {/* Backdrop */}
          <div
            className="absolute inset-0 z-20 bg-black/40 backdrop-blur-sm"
            onClick={() => setHistoryOpen(false)}
          />

          {/* Drawer panel */}
          <div className="absolute inset-y-0 left-0 z-30 w-72 flex flex-col bg-[#0d1020] border-r border-white/[0.06] shadow-2xl shadow-black/60 animate-in slide-in-from-left duration-200">
            {/* Drawer header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <History size={14} className="text-purple-400" />
                <span className="text-[13px] font-semibold text-white">
                  Chat History
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* New Chat button */}
            <div className="shrink-0 px-3 pt-3 pb-2">
              <button
                type="button"
                onClick={() => {
                  onNewSession();
                  setHistoryOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/20 hover:border-purple-500/40 text-purple-300 text-[11px] font-medium transition-all"
              >
                <Plus size={13} />
                Start a new chat
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-3 space-y-4 aura-scroll">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <Clock size={22} className="text-slate-700 mb-2" />
                  <p className="text-[11px] text-slate-600 font-medium">
                    No chats yet
                  </p>
                  <p className="text-[10px] text-slate-700 mt-1">
                    Send a message to get started
                  </p>
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.label}>
                    <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((s) => (
                        <div
                          key={s.id}
                          className={`group relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                            s.id === activeSessionId
                              ? "bg-purple-600/15 border border-purple-500/20"
                              : "border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]"
                          }`}
                          onClick={() => handleSessionClick(s.id)}
                          onMouseEnter={() => setHoverDeleteId(s.id)}
                          onMouseLeave={() => setHoverDeleteId(null)}
                        >
                          {/* Icon */}
                          <div
                            className={`shrink-0 mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center ${
                              s.id === activeSessionId
                                ? "bg-purple-600/30"
                                : "bg-slate-800/60"
                            }`}
                          >
                            <MessageSquare
                              size={11}
                              className={
                                s.id === activeSessionId
                                  ? "text-purple-300"
                                  : "text-slate-500"
                              }
                            />
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-[12.5px] font-medium truncate leading-tight ${
                                s.id === activeSessionId
                                  ? "text-purple-200"
                                  : "text-slate-300"
                              }`}
                            >
                              {s.title}
                            </p>
                            <p className="text-[10.5px] text-slate-600 mt-0.5">
                              {relativeTime(s.updatedAt)} · {s.messages.length}{" "}
                              msg{s.messages.length !== 1 ? "s" : ""}
                            </p>
                          </div>

                          {/* Delete */}
                          {hoverDeleteId === s.id && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(s.id);
                              }}
                              className="shrink-0 p-1 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              title="Delete chat"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Main chat panel ───────────────────────────────────────────── */}

      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-3 h-[46px] border-b border-white/[0.06] bg-[#0a0d1a]">
        {/* History toggle */}
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.07] transition-colors"
          title="Chat history"
        >
          <History size={15} />
        </button>

        {/* Session title */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-slate-300 truncate">
            {activeSession?.title ?? "Build with AI"}
          </p>
        </div>

        {/* Model selector */}
        <div className="relative shrink-0">
          <select
            value={activeModel}
            onChange={(e) => onSelectModel(e.target.value)}
            className="appearance-none bg-slate-800/60 border border-white/[0.06] rounded-lg pl-2 pr-6 py-1 text-[10px] text-slate-400 cursor-pointer hover:border-white/10 focus:border-purple-500/40 outline-none transition-colors"
          >
            <option>Claude Sonnet</option>
            <option>GPT-4o</option>
            <option>Gemini Pro</option>
          </select>
          <ChevronDown
            size={9}
            className="absolute right-1.5 top-[5px] text-slate-600 pointer-events-none"
          />
        </div>

        {/* New chat */}
        <button
          type="button"
          onClick={onNewSession}
          className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.07] transition-colors"
          title="New chat"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Error banner */}
      {lastCompileError && (
        <div className="shrink-0 mx-3 mt-2 rounded-xl border border-red-500/25 bg-red-950/20 px-3 py-2.5 flex items-start gap-2.5">
          <div className="shrink-0 w-5 h-5 rounded-md bg-red-500/20 flex items-center justify-center mt-0.5">
            <Wrench size={10} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-red-300 mb-0.5">
              Build Error
            </p>
            <p className="text-[9px] text-red-400/70 font-mono leading-relaxed line-clamp-2">
              {lastCompileError}
            </p>
          </div>
          {onFixError && (
            <button
              type="button"
              onClick={onFixError}
              className="shrink-0 mt-0.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 text-[10px] font-semibold transition-colors"
            >
              Fix with AI
            </button>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto aura-scroll">
        {messages.length === 0 ? (
          /* ── Empty state ── */
          <div className="h-full flex flex-col items-center justify-center px-4 py-8">
            <div className="w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br from-purple-500/25 to-indigo-600/10 border border-purple-500/20 flex items-center justify-center">
              <Zap size={22} className="text-purple-400" />
            </div>
            <h2 className="text-[14px] font-semibold text-white mb-1.5 text-center">
              What should we build?
            </h2>
            <p className="text-[13px] text-slate-500 text-center leading-relaxed mb-6 max-w-[240px]">
              Describe your app. Using {BOLT_STACK_LABEL}.
            </p>

            {/* Starter prompts */}
            <div className="w-full space-y-2">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p.text}
                  type="button"
                  onClick={() => onSendMessage(p.text)}
                  className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-purple-500/20 transition-all group"
                >
                  <span className="text-base leading-none mt-0.5">
                    {p.icon}
                  </span>
                  <span className="text-[13px] text-slate-400 group-hover:text-slate-200 leading-snug transition-colors">
                    {p.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Messages ── */
          <div className="py-4 space-y-4 px-3">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isLast={idx === messages.length - 1}
                isGenerating={isGenerating}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-3 pt-2">
        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 focus-within:border-purple-500/40 focus-within:bg-slate-900/80 transition-all shadow-lg shadow-black/20 overflow-hidden">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isGenerating}
              rows={3}
              placeholder="How can I help you build today?"
              className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-[13.5px] text-white placeholder:text-slate-600 outline-none disabled:opacity-50 leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <span className="text-[10.5px] text-slate-700">
                Enter to send · Shift+Enter for new line
              </span>
              {isGenerating ? (
                <button
                  type="button"
                  onClick={onCancelMessage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-[12px] font-medium transition-colors"
                >
                  <Square size={10} className="fill-current" />
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700/40 disabled:text-slate-600 text-white text-[12px] font-semibold transition-all shadow-md shadow-purple-500/20 disabled:shadow-none"
                >
                  <Send size={11} />
                  Send
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Message Bubble Sub-component ────────────────────────────────────────────

function MessageBubble({
  msg,
  isLast,
  isGenerating,
}: {
  msg: ChatMessage;
  isLast: boolean;
  isGenerating: boolean;
}) {
  const isUser = msg.role === "user";
  const showTyping = isLast && isGenerating && !isUser && !msg.content;

  return (
    <div
      className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}
    >
      {/* Bubble */}
      <div
        className={`max-w-[88%] px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
          isUser
            ? "bg-purple-600/20 border border-purple-500/25 text-purple-50 rounded-2xl rounded-br-md"
            : "bg-slate-800/50 border border-white/[0.06] text-slate-200 rounded-2xl rounded-bl-md"
        }`}
      >
        {showTyping ? (
          <span className="flex items-center gap-1 h-4">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        ) : (
          msg.content || (isLast && isGenerating && !isUser ? "Thinking…" : "")
        )}
      </div>

      {/* Action log */}
      {msg.statusLogs && msg.statusLogs.length > 0 && (
        <div
          className={`w-full max-w-[88%] rounded-xl border border-white/[0.05] bg-black/30 p-2.5 font-mono text-[9px] text-slate-500 space-y-1 ${isUser ? "self-end" : "self-start"}`}
        >
          <div className="flex items-center gap-1.5 text-purple-400/80 font-semibold uppercase tracking-wider mb-1.5">
            <Terminal size={8} />
            Actions
          </div>
          {msg.statusLogs.map((log, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <CheckCircle2
                size={8}
                className="text-emerald-500/70 shrink-0 mt-0.5"
              />
              <span className="text-slate-500">{log}</span>
            </div>
          ))}
          {isLast && isGenerating && !isUser && !msg.content && (
            <div className="flex items-center gap-1.5 text-purple-400/60 mt-1">
              <RefreshCw size={8} className="animate-spin" />
              <span>Running…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
