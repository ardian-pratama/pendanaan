"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/context/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  MessageCircle,
  X,
  Send,
  ShieldCheck,
  User,
  Clock,
  Sparkles,
  Minimize2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { motion, AnimatePresence } from "motion/react";

interface ChatMessage {
  id: string;
  session_id: string;
  sender_name: string;
  sender_role: "customer" | "admin" | "staff" | string;
  message: string;
  created_at: string;
}

const CHAT_SESSION_KEY = "mathbites_customer_chat_session_v1";

export function CustomerChatWidget() {
  const { user, isStaffOrAdmin } = useCart();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionId, setSessionId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session ID & customer name
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedName = localStorage.getItem("mathbites_customer_name");
    if (user?.user_metadata?.full_name) {
      setCustomerName(user.user_metadata.full_name);
    } else if (savedName) {
      setCustomerName(savedName);
    } else if (user?.email) {
      setCustomerName(user.email.split("@")[0]);
    } else {
      setCustomerName("Pelanggan Stand");
    }

    if (user?.id) {
      setSessionId(`usr-${user.id}`);
    } else {
      let saved = localStorage.getItem(CHAT_SESSION_KEY);
      if (!saved) {
        saved = `gst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        localStorage.setItem(CHAT_SESSION_KEY, saved);
      }
      setSessionId(saved);
    }
  }, [user]);

  // Load messages & subscribe to realtime
  const loadMessages = useCallback(async (sid: string) => {
    if (!sid) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sid)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data as any);
      }
    } catch (err) {
      console.warn("Gagal memuat pesan chat:", err);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    loadMessages(sessionId);

    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            if (!open && (newMsg.sender_role === "admin" || newMsg.sender_role === "staff")) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, open, loadMessages]);

  useEffect(() => {
    if (open) {
      setUnreadCount(0);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !sessionId || sending) return;

    const text = inputText.trim();
    setInputText("");
    setSending(true);

    const effectiveSenderName = customerName.trim() || "Pelanggan Stand";
    const senderRole = isStaffOrAdmin ? "admin" : "customer";

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      sender_name: effectiveSenderName,
      sender_role: senderRole,
      message: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const supabase = createClient();
      await (supabase.from("chat_messages" as any) as any).insert({
        session_id: sessionId,
        sender_id: user?.id || null,
        sender_name: effectiveSenderName,
        sender_role: senderRole,
        message: text,
      });
    } catch (err) {
      console.warn("Gagal mengirim pesan chat:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {/* Floating Chat Button */}
        {!open && (
          <motion.div
            key="chat-btn"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-full h-12 sm:h-13 px-4 bg-primary text-primary-foreground shadow-2xl flex items-center gap-2 relative cursor-pointer group"
              aria-label="Buka Live Chat Bantuan Panitia"
            >
              <MessageCircle className="w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform group-hover:rotate-6" />
              <span className="text-xs font-bold">Chat Bantuan</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 size-5 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center ring-2 ring-background animate-bounce">
                  {unreadCount}
                </span>
              )}
            </Button>
          </motion.div>
        )}

        {/* Chat Window Container (Symmetrical mobile margin) */}
        {open && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, y: 25, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed inset-x-3 bottom-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96 h-[520px] max-h-[85vh] rounded-3xl border border-border shadow-2xl bg-card overflow-hidden flex flex-col p-0 z-50"
          >
            {/* Header: Sisi Penerima / Panitia MathBites */}
            <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between shadow-xs shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="size-9 ring-2 ring-white/30 bg-white/20 text-white shrink-0">
                  <AvatarFallback className="bg-white/20 text-white">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-sm leading-none flex items-center gap-1.5 text-white">
                    <span>Panitia MathBites</span>
                    <Badge variant="outline" className="bg-white/20 border-white/30 text-white text-[9px] px-1 py-0 rounded">
                      Official
                    </Badge>
                  </h3>
                  <span className="text-[11px] text-white/90 font-medium flex items-center gap-1.5 mt-1">
                    <span className="size-2 rounded-full bg-emerald-300 ring-2 ring-white/30 animate-pulse" />
                    Olimpiade 27 · Bantuan Stand
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setOpen(false)}
                className="text-white hover:bg-white/20 rounded-xl cursor-pointer"
                aria-label="Tutup live chat"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Sub-bar: Identitas Pengirim (Pelanggan) */}
            <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                <User className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">
                  Pengirim: <strong className="text-foreground">{customerName}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newName = prompt("Ubah nama Anda untuk chat ini:", customerName);
                  if (newName && newName.trim()) {
                    setCustomerName(newName.trim());
                    localStorage.setItem("mathbites_customer_name", newName.trim());
                  }
                }}
                className="text-primary hover:underline font-semibold shrink-0 cursor-pointer ml-2"
              >
                Ubah Nama
              </button>
            </div>

            {/* Messages Thread with Shadcn Message Block Styling */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-muted/20">
              {/* Automatic Greeting if thread is empty */}
              {messages.length === 0 && (
                <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs text-foreground space-y-1">
                  <span className="font-bold text-primary block">
                    Halo dari Panitia MathBites! 👋
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Halo {customerName}! Ada yang bisa kami bantu seputar menu, pemesanan, atau lokasi pengambilan di booth kampus?
                  </p>
                </div>
              )}

              {messages.map((msg) => {
                const isSender = msg.sender_role !== "admin" && msg.sender_role !== "staff";
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2.5 ${
                      isSender ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Shadcn Avatar */}
                    <Avatar className={`size-8 shrink-0 border shadow-2xs ${
                      isSender ? "border-primary/30" : "border-purple-300 dark:border-purple-800"
                    }`}>
                      <AvatarFallback className={`text-[11px] font-bold ${
                        isSender
                          ? "bg-primary text-primary-foreground"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                      }`}>
                        {isSender ? (
                          (msg.sender_name || customerName).slice(0, 2).toUpperCase()
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>

                    {/* Message Bubble Block */}
                    <div className={`flex flex-col max-w-[80%] ${isSender ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className={`text-[10px] font-bold ${
                          isSender ? "text-primary" : "text-foreground"
                        }`}>
                          {isSender ? `Anda (${msg.sender_name || customerName})` : (msg.sender_name || "Panitia MathBites")}
                        </span>
                        {!isSender && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 rounded border-primary/25 bg-primary/5 text-primary font-bold">
                            Panitia
                          </Badge>
                        )}
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${
                          isSender
                            ? "bg-primary text-primary-foreground rounded-br-xs"
                            : "bg-card border border-border text-foreground rounded-bl-xs"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

          {/* Footer Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-card border-t border-border flex items-center gap-2 shrink-0"
          >
            <Input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik pertanyaan untuk panitia..."
              className="text-xs rounded-xl h-10 border-border bg-muted/40"
            />
            <Button
              type="submit"
              size="sm"
              disabled={sending || !inputText.trim()}
              className="rounded-xl h-10 px-3 font-semibold gap-1 shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
