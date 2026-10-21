"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { AdminTopBar } from "@/components/admin/admin-sidebar";
import { getCurrentUserProfile, getFriendlyErrorMessage } from "@/lib/supabase/admin";
import { ErrorBanner } from "@/components/admin/error-banner";
import { hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/supabase/database.types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Star,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  User,
  Reply,
  RefreshCw,
  Sparkles,
  Award,
  Clock,
  Heart,
  Send,
  CornerDownRight,
  UtensilsCrossed,
} from "lucide-react";

export interface ReviewRecord {
  id: string;
  menu_id: string;
  user_id?: string | null;
  reviewer_name: string;
  reviewer_role?: string | null;
  rating: number;
  comment: string;
  tags?: string[] | null;
  is_verified_buyer: boolean;
  helpful_count: number;
  created_at: string;
}

export interface ReviewCommentRecord {
  id: string;
  review_id: string;
  user_id?: string | null;
  user_name: string;
  user_role?: string | null;
  is_admin: boolean;
  comment: string;
  created_at: string;
}

export default function AdminReviewsPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [comments, setComments] = useState<ReviewCommentRecord[]>([]);
  const [menuMap, setMenuMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");

  // Reply states
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Delete modal
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const [profile, { data: revData }, { data: comData }, { data: menuData }] =
        await Promise.all([
          getCurrentUserProfile(),
          supabase.from("menu_reviews").select("*").order("created_at", { ascending: false }),
          supabase.from("review_comments").select("*").order("created_at", { ascending: true }),
          supabase.from("menu_items").select("id, name"),
        ]);

      if (profile) setCurrentUser(profile);
      if (revData) setReviews(revData as ReviewRecord[]);
      if (comData) setComments(comData as ReviewCommentRecord[]);

      if (menuData) {
        const map: Record<string, string> = {};
        for (const m of menuData as Array<{ id: string; name: string }>) {
          map[m.id] = m.name;
        }
        setMenuMap(map);
      }
    } catch (err: unknown) {
      setErrorMessage(
        getFriendlyErrorMessage(err, "Gagal memuat daftar ulasan pelanggan dari Supabase.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const supabase = createClient();
    const revChannel = supabase
      .channel("admin-reviews-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_reviews" },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "review_comments" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(revChannel);
    };
  }, [loadData]);

  const canManage = hasPermission(currentUser, "menu:update") || hasPermission(currentUser, "menu:view");

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    let result = reviews;
    if (ratingFilter !== "all") {
      result = result.filter((r) => r.rating === ratingFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const menuName = menuMap[r.menu_id]?.toLowerCase() || "";
        return (
          r.reviewer_name.toLowerCase().includes(q) ||
          r.comment.toLowerCase().includes(q) ||
          menuName.includes(q)
        );
      });
    }
    return result;
  }, [reviews, ratingFilter, searchQuery, menuMap]);

  // Statistics
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const fiveStarCount = useMemo(
    () => reviews.filter((r) => r.rating === 5).length,
    [reviews]
  );

  const totalAdminReplies = useMemo(
    () => comments.filter((c) => c.is_admin).length,
    [comments]
  );

  // Submit Official Admin Reply
  const handleSendReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("review_comments") as any).insert({
        review_id: reviewId,
        user_id: currentUser?.id ?? null,
        user_name: currentUser?.full_name || "Admin MathBites",
        user_role: "admin",
        is_admin: true,
        comment: replyText.trim(),
      });

      if (error) throw error;
      showToast("Balasan resmi admin berhasil dipublikasikan.");
      setReplyText("");
      setReplyingReviewId(null);
      loadData();
    } catch (err: unknown) {
      alert(getFriendlyErrorMessage(err, "Gagal mengirim balasan ulasan."));
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Delete Review
  const handleDeleteReview = async () => {
    if (!deleteReviewId) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("menu_reviews").delete().eq("id", deleteReviewId);
      if (error) throw error;

      showToast("Ulasan berhasil dihapus dari sistem.");
      setDeleteReviewId(null);
      loadData();
    } catch (err: unknown) {
      alert(getFriendlyErrorMessage(err, "Gagal menghapus ulasan."));
    }
  };

  // Delete Comment
  const handleDeleteComment = async () => {
    if (!deleteCommentId) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("review_comments").delete().eq("id", deleteCommentId);
      if (error) throw error;

      showToast("Komentar balasan berhasil dihapus.");
      setDeleteCommentId(null);
      loadData();
    } catch (err: unknown) {
      alert(getFriendlyErrorMessage(err, "Gagal menghapus komentar balasan."));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background text-foreground">
      <AdminTopBar title="Ulasan & Komentar" />

      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {errorMessage && (
          <ErrorBanner message={errorMessage} onRetry={loadData} />
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Moderasi Ulasan & Komentar Pelanggan
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Kelola feedback, testimoni pembeli terverifikasi, dan kirim balasan resmi panitia.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shrink-0 shadow-2xs self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sinkron Data</span>
          </Button>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-3xl border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Rating Rata-rata</span>
              <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Star className="w-4 h-4 fill-amber-500" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-foreground">{averageRating}</h3>
              <span className="text-xs text-muted-foreground">/ 5.0</span>
            </div>
          </Card>

          <Card className="rounded-3xl border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Ulasan Masuk</span>
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-foreground">{reviews.length} Ulasan</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Dari pembeli dan civitas kampus</p>
            </div>
          </Card>

          <Card className="rounded-3xl border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Ulasan Bintang 5</span>
              <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-foreground">{fiveStarCount} Ulasan</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {reviews.length > 0 ? `${Math.round((fiveStarCount / reviews.length) * 100)}% kepuasan sempurna` : "0%"}
              </p>
            </div>
          </Card>

          <Card className="rounded-3xl border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Balasan Resmi Panitia</span>
              <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-foreground">{totalAdminReplies} Balasan</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Responsif melayani pertanyaan</p>
            </div>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card className="rounded-3xl border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari nama reviewer, isi ulasan, atau nama menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl text-xs bg-muted/30"
              />
            </div>

            {/* Rating Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <Button
                variant={ratingFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setRatingFilter("all")}
                className="rounded-xl text-xs font-semibold h-8"
              >
                Semua Bintang
              </Button>
              {[5, 4, 3, 2, 1].map((stars) => (
                <Button
                  key={stars}
                  variant={ratingFilter === stars ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRatingFilter(stars)}
                  className="rounded-xl text-xs font-semibold h-8 gap-1"
                >
                  <span>{stars}</span>
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Review Cards List */}
        <div className="space-y-4">
          {loading ? (
            <Card className="p-12 text-center rounded-3xl border-border">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-xs text-muted-foreground">Memuat data ulasan pelanggan...</p>
            </Card>
          ) : filteredReviews.length === 0 ? (
            <Card className="p-12 text-center rounded-3xl border-border">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">Tidak ada ulasan yang sesuai</p>
              <p className="text-xs text-muted-foreground mt-1">Coba sesuaikan kata kunci pencarian atau filter bintang.</p>
            </Card>
          ) : (
            filteredReviews.map((review) => {
              const menuName = menuMap[review.menu_id] || "Menu MathBites";
              const reviewComments = comments.filter((c) => c.review_id === review.id);

              return (
                <Card
                  key={review.id}
                  className="rounded-3xl border-border bg-card p-5 sm:p-6 shadow-sm space-y-4"
                >
                  {/* Review Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {review.reviewer_name.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-foreground">
                            {review.reviewer_name}
                          </h4>
                          {review.is_verified_buyer && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Pembeli Terverifikasi
                            </Badge>
                          )}
                          {review.reviewer_role && (
                            <span className="text-[11px] text-muted-foreground">
                              &middot; {review.reviewer_role}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      <Badge variant="secondary" className="gap-1 text-xs font-semibold rounded-lg">
                        <UtensilsCrossed className="w-3 h-3 text-primary" />
                        {menuName}
                      </Badge>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteReviewId(review.id)}
                          className="size-8 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Hapus Ulasan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Comment Text & Tags */}
                  <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed pl-0 sm:pl-13">
                    <p>{review.comment}</p>
                    {review.tags && review.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-2">
                        {review.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comments Thread (Sub-comments) */}
                  <div className="pl-0 sm:pl-13 space-y-2.5 pt-1">
                    {reviewComments.length > 0 && (
                      <div className="space-y-2 rounded-2xl bg-muted/40 p-3.5 border border-border/80">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Balasan Komentar ({reviewComments.length})
                        </span>
                        <div className="space-y-2.5">
                          {reviewComments.map((com) => (
                            <div
                              key={com.id}
                              className={`p-3 rounded-xl text-xs space-y-1 ${
                                com.is_admin
                                  ? "bg-primary/5 border border-primary/20"
                                  : "bg-background border border-border"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  {com.is_admin ? (
                                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                  ) : (
                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                  )}
                                  <span className="font-bold text-foreground">
                                    {com.user_name}
                                  </span>
                                  {com.is_admin && (
                                    <Badge className="text-[9px] font-bold py-0 px-1.5 rounded bg-primary text-primary-foreground">
                                      Panitia Resmi
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(com.created_at).toLocaleDateString("id-ID", {
                                      day: "numeric",
                                      month: "short",
                                    })}
                                  </span>
                                  {canManage && (
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => setDeleteCommentId(com.id)}
                                      className="size-6 rounded text-muted-foreground hover:text-destructive cursor-pointer"
                                      title="Hapus Komentar"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <p className="text-foreground/90 leading-relaxed text-[11px]">
                                {com.comment}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reply Action Form */}
                    {replyingReviewId === review.id ? (
                      <div className="p-3.5 rounded-2xl bg-card border border-primary/30 space-y-2.5 shadow-sm animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-primary flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4" />
                            Kirim Balasan Resmi Panitia
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReplyingReviewId(null);
                              setReplyText("");
                            }}
                            className="h-6 text-[11px] text-muted-foreground cursor-pointer"
                          >
                            Batal
                          </Button>
                        </div>
                        <Input
                          placeholder="Tulis ucapan terima kasih atau jawaban atas ulasan ini..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="rounded-xl text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply(review.id);
                            }
                          }}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSendReply(review.id)}
                            disabled={isSubmittingReply || !replyText.trim()}
                            className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isSubmittingReply ? "Mengirim..." : "Kirim Balasan"}</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyingReviewId(review.id);
                          setReplyText("");
                        }}
                        className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5 text-primary" />
                        <span>Balas Ulasan Ini</span>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Modal Delete Review */}
        <Dialog open={!!deleteReviewId} onOpenChange={(open) => !open && setDeleteReviewId(null)}>
          <DialogContent className="max-w-sm p-6 text-center rounded-3xl">
            <div className="size-12 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogHeader className="p-0 text-center space-y-1">
              <DialogTitle className="text-base font-bold text-foreground">
                Hapus Ulasan Pelanggan?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Ulasan beserta rating dan seluruh komentar balasannya akan dihapus permanen dari Supabase.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-3 gap-2 sm:gap-0 flex-row justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteReviewId(null)}
                className="rounded-xl text-xs font-semibold cursor-pointer flex-1"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteReview}
                className="rounded-xl text-xs font-bold cursor-pointer flex-1"
              >
                Hapus Ulasan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Delete Comment */}
        <Dialog open={!!deleteCommentId} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
          <DialogContent className="max-w-sm p-6 text-center rounded-3xl">
            <div className="size-12 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogHeader className="p-0 text-center space-y-1">
              <DialogTitle className="text-base font-bold text-foreground">
                Hapus Komentar Balasan?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Komentar balasan ini akan dihapus dari thread ulasan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-3 gap-2 sm:gap-0 flex-row justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteCommentId(null)}
                className="rounded-xl text-xs font-semibold cursor-pointer flex-1"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteComment}
                className="rounded-xl text-xs font-bold cursor-pointer flex-1"
              >
                Hapus Komentar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
