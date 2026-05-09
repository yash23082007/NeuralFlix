"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Send, Sparkles, Bot, User, Film, Star, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface MovieSuggestion {
  tmdb_id?: number;
  title: string;
  overview?: string;
  poster_url?: string | null;
  rating?: number;
  year?: number | null;
  genres?: string[];
}

interface ChatMessage {
  id: number;
  text: string;
  role: "user" | "ai";
  movies?: MovieSuggestion[];
  loading?: boolean;
}

const QUICK_PROMPTS = [
  { emoji: "🔥", text: "Give me something like Interstellar" },
  { emoji: "🇮🇳", text: "Best Bollywood movies this year" },
  { emoji: "🤯", text: "Mind-bending thrillers that will blow my mind" },
  { emoji: "🇰🇷", text: "Korean cinema masterpieces" },
  { emoji: "😭", text: "Movies that will make me cry" },
  { emoji: "💎", text: "Underrated hidden gems I've never heard of" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      text: "Hey! I'm NeuralFlix AI 🎬 — your personal cinema curator. Tell me what mood you're in, a movie you loved, or a vibe you're chasing, and I'll find the perfect films for you from across the globe.",
      role: "ai",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;

    const userMessage: ChatMessage = {
      id: messages.length,
      text: msg,
      role: "user",
    };

    const loadingMessage: ChatMessage = {
      id: messages.length + 1,
      text: "",
      role: "ai",
      loading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API}/api/chat/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: messages
            .filter((m) => !m.loading)
            .slice(-6)
            .map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.loading
              ? {
                  ...m,
                  text: data.reply,
                  movies: data.movies || [],
                  loading: false,
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.loading
              ? {
                  ...m,
                  text: "Hmm, I had trouble processing that. Try rephrasing your request! 🎬",
                  loading: false,
                }
              : m
          )
        );
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.loading
            ? {
                ...m,
                text: "Connection issue — make sure the backend is running on localhost:8000. Try again!",
                loading: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col page-enter">
      {/* Header */}
      <div className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-16 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neural-crimson to-neural-purple flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-text-primary">
              NeuralFlix AI
            </h1>
            <p className="text-xs text-text-muted">
              Conversational Cinema Discovery • Powered by ML
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-500">Online</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-4xl mx-auto w-full"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                  msg.role === "ai"
                    ? "bg-gradient-to-br from-neural-crimson/20 to-neural-purple/20 border border-neural-crimson/30"
                    : "bg-accent/10 border border-accent/30"
                }`}
              >
                {msg.role === "ai" ? (
                  <Bot className="w-4.5 h-4.5 text-neural-crimson" />
                ) : (
                  <User className="w-4.5 h-4.5 text-accent" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[85%] space-y-3 ${
                  msg.role === "user" ? "text-right" : ""
                }`}
              >
                <div
                  className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "ai"
                      ? "bg-surface border border-border text-text-primary rounded-tl-md"
                      : "bg-accent text-black font-medium rounded-tr-md"
                  }`}
                >
                  {msg.loading ? (
                    <div className="flex items-center gap-2 text-text-muted">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Searching global cinema...</span>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>

                {/* Movie Cards */}
                {msg.movies && msg.movies.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 scroll-row">
                    {msg.movies.map((movie, i) => (
                      <Link
                        key={movie.tmdb_id || i}
                        href={`/movie/${movie.tmdb_id}`}
                        className="group shrink-0 w-[140px] rounded-xl overflow-hidden bg-surface border border-border hover:border-accent/40 transition-all hover:scale-[1.03] shadow-card"
                      >
                        <div className="relative aspect-[2/3] bg-bg-elevated">
                          {movie.poster_url ? (
                            <Image
                              src={movie.poster_url}
                              alt={movie.title}
                              fill
                              className="object-cover"
                              sizes="140px"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-text-muted">
                              <Film className="w-8 h-8 opacity-30" />
                            </div>
                          )}
                          {movie.rating != null && movie.rating > 0 && (
                            <div className="absolute top-1.5 right-1.5 imdb-rating text-[10px]">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              {movie.rating.toFixed(1)}
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                            {movie.title}
                          </p>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {movie.year}
                            {movie.genres && movie.genres.length > 0 &&
                              ` • ${movie.genres[0]}`}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Quick Prompts (shown only at start) */}
        {messages.length <= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3 pt-4"
          >
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider text-center">
              Try asking...
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt.text)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-text-secondary hover:text-text-primary hover:border-accent/40 hover:bg-bg-elevated transition-all"
                >
                  <span className="text-lg">{prompt.emoji}</span>
                  <span>{prompt.text}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-surface/50 backdrop-blur-xl sticky bottom-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Give me something emotional like Interstellar..."
                disabled={isLoading}
                className="w-full bg-bg-elevated px-5 py-3.5 pr-12 rounded-xl border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="p-3.5 rounded-xl bg-accent hover:bg-accent/90 text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-gold"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-text-muted mt-2">
            NeuralFlix AI recommends from 50+ cinema traditions worldwide •
            Powered by TMDB & ML
          </p>
        </div>
      </div>
    </main>
  );
}