"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  fetchReviewComments,
  addReviewComment,
  type ReviewComment,
} from "@/lib/data/menu-reviews";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  LogIn,
  Check,
} from "lucide-react";

interface ReviewCommentsProps {
  reviewId: string;
  user: any;
  userRole?: string;
  isStaffOrAdmin?: boolean;
}

export function ReviewComments({
  reviewId,
  user,
  userRole = "pelanggan",
  isStaffOrAdmin = false,
}: ReviewCommentsProps) {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReviewComments(reviewId);
      setComments(data);
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    // Load initial comments count
    loadComments();

    // Setup realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`comments-${reviewId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "review_comments",
          filter: `review_id=eq.${reviewId}`,
        },
        (payload) => {
          const newComm = payload.new as any;
          if (newComm) {
            setComments((prev) => {
              if (prev.some((c) => c.id === newComm.id)) return prev;
              return [
                ...prev,
                {
                  id: newComm.id,
                  review_id: newComm.review_id,
                  user_id: newComm.user_id,
                  user_name: newComm.user_name,
                  user_role: newComm.user_role,
                  is_admin: Boolean(newComm.is_admin),
                  comment: newComm.comment,
                  created_at: "Baru saja",
                },
              ];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reviewId, loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !user) return;

    setSubmitting(true);
    try {
      const displayName =
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Pelanggan";

      const added = await addReviewComment(reviewId, {
        user_id: user.id,
        user_name: displayName,
        user_role: isStaffOrAdmin ? "Panitia Olimpiade 27" : "Pembeli",
        is_admin: isStaffOrAdmin,
        comment: replyText.trim(),
      });

      setComments((prev) => [...prev, added]);
      setReplyText("");
      setJustSubmitted(true);
      setTimeout(() => setJustSubmitted(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full pt-1.5 border-t border-border/40">
      {/* Toggle button */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer px-2 h-7 rounded-lg"
          aria-expanded={expanded}
        >
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium">
            {comments.length > 0
              ? `${comments.length} Komentar & Tanggapan`
              : "Beri Tanggapan"}
          </span>
          {expanded ? (
            <ChevronUp className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Expanded Thread */}
      {expanded && (
        <div className="mt-2.5 pt-2 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Comments List */}
          {comments.length > 0 ? (
            <div className="space-y-2">
              {comments.map((comm) => (
                <div
                  key={comm.id}
                  className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                    comm.is_admin
                      ? "bg-primary/5 border-primary/20"
                      : "bg-muted/40 border-border"
                  }`}
                >
                  <Avatar className="size-6 shrink-0 mt-0.5 border border-border">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                      {comm.user_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-foreground">
                          {comm.user_name}
                        </span>
                        {comm.is_admin ? (
                          <Badge
                            variant="default"
                            className="text-[9px] px-1.5 py-0 font-bold bg-primary text-primary-foreground"
                          >
                            <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                            Panitia Olimpiade 27
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            {comm.user_role || "Pelanggan"}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {comm.created_at}
                      </span>
                    </div>

                    <p className="text-foreground/90 text-[11px] sm:text-xs leading-relaxed">
                      {comm.comment}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic px-1">
              Belum ada tanggapan pada ulasan ini. Jadilah yang pertama memberikan komentar!
            </p>
          )}

          {/* Reply form */}
          {user ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-1">
              <Textarea
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Tulis balasan atau komentar Anda..."
                className="text-xs rounded-xl bg-card border-border resize-none"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground truncate">
                  Membalas sebagai <strong className="text-foreground">{user.user_metadata?.full_name || user.email}</strong>
                </span>

                <Button
                  type="submit"
                  size="xs"
                  disabled={submitting || !replyText.trim()}
                  className="rounded-xl text-xs font-semibold gap-1.5 shrink-0 cursor-pointer h-7 px-3"
                >
                  {submitting ? (
                    <span>Mengirim...</span>
                  ) : justSubmitted ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Terkirim</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      <span>Kirim</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3 text-xs">
              <span className="text-[11px] text-muted-foreground">
                Masuk akun untuk menambahkan komentar pada ulasan ini.
              </span>
              <Button asChild size="xs" variant="outline" className="rounded-xl text-xs font-semibold shrink-0 gap-1 h-7">
                <Link href="/login">
                  <LogIn className="w-3 h-3" />
                  <span>Masuk</span>
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
