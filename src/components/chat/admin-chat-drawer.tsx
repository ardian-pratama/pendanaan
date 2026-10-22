"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  User,
  ShieldCheck,
  Search,
  Sparkles,
  Clock,
  ArrowLeft,
  Check,
  CheckCheck,
} from "lucide-react";

export interface ChatMessageItem {
  id: string;
  session_id: string;
  sender_id?: string | null;
  sender_name: string;
  sender_role: "customer" | "admin" | "staff" | string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatSessionSummary {
  session_id: string;
  customer_name: string;
  last_message: string;
  last_activity: string;
  unread_count: number;
}

interface AdminChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminName?: string;
}

const QUICK_REPLIES = [
  "Halo! Ada yang bisa kami bantu seputar pesanan Anda?",
  "Pesanan Anda sedang kami siapkan di booth.",
  "Booth kami berlokasi di depan Gedung Dekanat FKIP UNRI.",
  "Silakan tunjukkan QR bukti ambil di stand saat pesanan sudah siap.",
];

export function AdminChatDrawer({
  open,
  onOpenChange,
  adminName = "Admin Stand Booth",
}: AdminChatDrawerProps) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load all sessions grouped from chat_messages
  const loadSessions = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) return;

      const sessionMap = new Map<string, ChatSessionSummary>();

      for (const msg of data as ChatMessageItem[]) {
        const sid = msg.session_id;
        if (!sessionMap.has(sid)) {
          const isFromCustomer = msg.sender_role !== "admin" && msg.sender_role !== "staff";
          sessionMap.set(sid, {
            session_id: sid,
            customer_name: isFromCustomer ? msg.sender_name : "Pelanggan",
            last_message: msg.message,
            last_activity: msg.created_at,
            unread_count: !msg.is_read && isFromCustomer ? 1 : 0,
          });
        } else {
          const item = sessionMap.get(sid)!;
          const isFromCustomer = msg.sender_role !== "admin" && msg.sender_role !== "staff";
          if (isFromCustomer && item.customer_name === "Pelanggan") {
            item.customer_name = msg.sender_name;
          }
          if (!msg.is_read && isFromCustomer) {
            item.unread_count += 1;
          }
        }
      }

      setSessions(Array.from(sessionMap.values()));
    } catch (err) {
      console.warn("Gagal memuat sesi chat admin:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (open) {
      loadSessions();
    }
  }, [open, loadSessions]);

  // Load messages for the active session
  const loadSessionMessages = useCallback(async (sid: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sid)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data as ChatMessageItem[]);

        // Mark unread messages from customer as read
        await (supabase.from("chat_messages") as any)
          .update({ is_read: true })
          .eq("session_id", sid)
          .neq("sender_role", "admin");
        
        // Update unread count in session list
        setSessions((prev) =>
          prev.map((s) => (s.session_id === sid ? { ...s, unread_count: 0 } : s))
        );
      }
    } catch (err) {
      console.warn("Gagal memuat pesan thread:", err);
    }
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      loadSessionMessages(activeSessionId);
    }
  }, [activeSessionId, loadSessionMessages]);

  // Realtime subscription across all chat messages
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-chat-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as ChatMessageItem;
          if (!newMsg) return;

          // If current active session is receiving message
          if (activeSessionId && newMsg.session_id === activeSessionId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              const tempIdx = prev.findIndex(
                (m) =>
                  m.id.startsWith("temp-") &&
                  m.message === newMsg.message &&
                  m.sender_role === newMsg.sender_role
              );
              if (tempIdx !== -1) {
                const copy = [...prev];
                copy[tempIdx] = newMsg;
                return copy;
              }
              return [...prev, newMsg];
            });
            // Mark as read immediately if admin has this session open
            if (newMsg.sender_role !== "admin" && newMsg.sender_role !== "staff") {
              (supabase.from("chat_messages") as any)
                .update({ is_read: true })
                .eq("id", newMsg.id)
                .then();
            }
          }

          // Update session summaries
          setSessions((prev) => {
            const isFromCustomer = newMsg.sender_role !== "admin" && newMsg.sender_role !== "staff";
            const existingIdx = prev.findIndex((s) => s.session_id === newMsg.session_id);
            if (existingIdx !== -1) {
              const updated = [...prev];
              const cur = updated[existingIdx];
              updated[existingIdx] = {
                ...cur,
                customer_name: isFromCustomer ? newMsg.sender_name : cur.customer_name,
                last_message: newMsg.message,
                last_activity: newMsg.created_at,
                unread_count:
                  activeSessionId === newMsg.session_id
                    ? 0
                    : cur.unread_count + (isFromCustomer ? 1 : 0),
              };
              // Sort to top
              return [updated[existingIdx], ...updated.filter((_, i) => i !== existingIdx)];
            } else {
              return [
                {
                  session_id: newMsg.session_id,
                  customer_name: isFromCustomer ? newMsg.sender_name : "Pelanggan Baru",
                  last_message: newMsg.message,
                  last_activity: newMsg.created_at,
                  unread_count: activeSessionId === newMsg.session_id ? 0 : 1,
                },
                ...prev,
              ];
            }
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const updatedMsg = payload.new as ChatMessageItem;
          if (!updatedMsg) return;

          // Update in message thread
          if (activeSessionId && updatedMsg.session_id === activeSessionId) {
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
            );
          }

          // Update in session summaries if needed
          if (updatedMsg.is_read) {
            setSessions((prev) =>
              prev.map((s) =>
                s.session_id === updatedMsg.session_id && s.unread_count > 0
                  ? { ...s, unread_count: Math.max(0, s.unread_count - 1) }
                  : s
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSessionId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeSessionId || sending) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessageItem = {
      id: tempId,
      session_id: activeSessionId,
      sender_name: adminName || "Admin Stand Booth",
      sender_role: "admin",
      message: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");
    setSending(true);

    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from("chat_messages") as any)
        .insert({
          session_id: activeSessionId,
          sender_name: adminName || "Admin Stand Booth",
          sender_role: "admin",
          message: text,
          is_read: false,
        })
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (data as ChatMessageItem) : m))
        );
      }
    } catch (err) {
      console.warn("Gagal mengirim pesan chat:", err);
    } finally {
      setSending(false);
    }
  };

  const filteredSessions = sessions.filter(
    (s) =>
      s.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.last_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.session_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSession = sessions.find((s) => s.session_id === activeSessionId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:!max-w-3xl md:!max-w-4xl lg:!max-w-5xl p-0 flex flex-col h-full bg-card border-l border-border shadow-2xl"
      >
        <SheetHeader className="p-4 pr-12 border-b border-border flex flex-row items-center justify-between space-y-0">
          <div>
            <SheetTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span>Live Chat Pelanggan</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Layanan konsultasi &amp; bantuan langsung pembeli stand MathBites Olimpiade 27.
            </SheetDescription>
          </div>
        </SheetHeader>

        {/* Content Body: Split view (Sessions list & Active Thread) */}
        <div className="flex-1 flex overflow-hidden">
          {/* SESSIONS LIST (Hidden on mobile if session is active) */}
          <div
            className={`w-full sm:w-80 md:w-88 border-r border-border flex flex-col bg-muted/20 shrink-0 ${
              activeSessionId ? "hidden sm:flex" : "flex"
            }`}
          >
            {/* Search Input */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari pelanggan..."
                  className="pl-8 text-xs h-8 rounded-xl bg-card"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {loading ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Memuat riwayat chat...
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs text-muted-foreground">Belum ada percakapan pelanggan.</p>
                </div>
              ) : (
                filteredSessions.map((s) => {
                  const isSelected = s.session_id === activeSessionId;
                  return (
                    <button
                      key={s.session_id}
                      type="button"
                      onClick={() => setActiveSessionId(s.session_id)}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-accent/60 ${
                        isSelected ? "bg-accent border-l-4 border-l-primary" : ""
                      }`}
                    >
                      <Avatar className="size-9 shrink-0 border border-primary/20 shadow-2xs">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {s.customer_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-semibold text-xs text-foreground truncate">
                            {s.customer_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(s.last_activity).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate line-clamp-1">
                          {s.last_message}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-muted-foreground/70 truncate">
                            {s.session_id.slice(0, 14)}...
                          </span>
                          {s.unread_count > 0 && (
                            <Badge
                              variant="destructive"
                              className="ml-auto text-[9px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center"
                            >
                              {s.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ACTIVE CHAT THREAD */}
          <div
            className={`flex-1 flex flex-col bg-card ${
              !activeSessionId ? "hidden sm:flex" : "flex"
            }`}
          >
            {activeSessionId ? (
              <>
                {/* Active Session Header */}
                <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActiveSessionId(null)}
                      className="sm:hidden size-8 rounded-lg cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Avatar className="size-8 shrink-0 border border-primary/25 shadow-2xs">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {activeSession?.customer_name.slice(0, 2).toUpperCase() || "PL"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-xs text-foreground">
                        {activeSession?.customer_name || "Pelanggan"}
                      </h4>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Sesi: {activeSessionId}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages stream with Shadcn Message Block Styling */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-muted/15">
                  {messages.map((m) => {
                    const isAdmin = m.sender_role === "admin" || m.sender_role === "staff";
                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-2.5 ${
                          isAdmin ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {/* Shadcn Avatar */}
                        <Avatar
                          className={`size-7.5 shrink-0 border shadow-2xs ${
                            isAdmin ? "border-primary/30" : "border-border"
                          }`}
                        >
                          <AvatarFallback
                            className={`text-[10px] font-bold ${
                              isAdmin
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {isAdmin ? (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            ) : (
                              (m.sender_name || "PL").slice(0, 2).toUpperCase()
                            )}
                          </AvatarFallback>
                        </Avatar>

                        {/* Message Bubble Block */}
                        <div
                          className={`flex flex-col max-w-[80%] ${
                            isAdmin ? "items-end" : "items-start"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[10px] font-semibold text-foreground/80">
                              {isAdmin
                                ? m.sender_name
                                  ? `${m.sender_name} (Panitia / Anda)`
                                  : "Panitia (Anda)"
                                : `${m.sender_name || "Pelanggan"} (Pembeli)`}
                            </span>
                          </div>

                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                              isAdmin
                                ? "bg-primary text-primary-foreground rounded-br-xs"
                                : "bg-card text-foreground border border-border rounded-bl-xs"
                            }`}
                          >
                            <p>{m.message}</p>
                            <div
                              className={`flex items-center gap-1.5 mt-1.5 ${
                                isAdmin
                                  ? "justify-end text-primary-foreground/75"
                                  : "justify-start text-muted-foreground"
                              }`}
                            >
                              <span className="text-[9px]">
                                {new Date(m.created_at).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isAdmin && (
                                <span
                                  className="inline-flex items-center gap-0.5 text-[9px]"
                                  title={m.is_read ? "Dibaca oleh pelanggan" : "Terkirim ke pelanggan"}
                                >
                                  {m.is_read ? (
                                    <>
                                      <CheckCheck className="w-3 h-3 text-sky-200" />
                                      <span className="text-sky-200 text-[8px] font-medium">Dibaca</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3 text-primary-foreground/70" />
                                      <span className="text-primary-foreground/70 text-[8px]">Terkirim</span>
                                    </>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick replies without colon */}
                <div className="px-3 py-2 border-t border-border/60 bg-muted/20 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Balas Cepat
                  </span>
                  {QUICK_REPLIES.map((qr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(qr)}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-card hover:bg-accent border border-border shrink-0 cursor-pointer text-foreground transition-colors"
                    >
                      {qr.slice(0, 32)}...
                    </button>
                  ))}
                </div>

                {/* Message input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-3 border-t border-border flex items-center gap-2 bg-card"
                >
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Tulis balasan untuk pelanggan..."
                    className="text-xs h-9 rounded-xl flex-1"
                    disabled={sending}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!inputText.trim() || sending}
                    className="h-9 px-3.5 rounded-xl cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    <span>Kirim</span>
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <MessageSquare className="w-7 h-7 text-primary" />
                </div>
                <h4 className="font-bold text-sm text-foreground">Pilih Percakapan</h4>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  Pilih salah satu sesi pelanggan di daftar kiri untuk mulai berinteraksi dan menjawab pertanyaan.
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
