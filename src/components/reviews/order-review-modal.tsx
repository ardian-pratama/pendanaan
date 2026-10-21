"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle2, Sparkles, Utensils, MessageSquare } from "lucide-react";
import { createMenuReviewInSupabase } from "@/lib/data/menu-reviews";
import { motion, AnimatePresence } from "motion/react";

interface OrderItemInfo {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface OrderReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email?: string | null;
    items?: OrderItemInfo[];
  } | null;
  userId?: string | null;
  onReviewSubmitted?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "Sangat Kurang",
  2: "Kurang Memuaskan",
  3: "Cukup Baik",
  4: "Enak & Puas",
  5: "Luar Biasa Lezat!",
};

const SUGGESTED_TAGS = [
  "Rasa Juara",
  "Porsi Kenyang",
  "Bahan Segar",
  "Higienis",
  "Pelayanan Cepat",
  "Kemasan Rapi",
  "Recommended",
];

export function OrderReviewModal({
  open,
  onOpenChange,
  order,
  userId,
  onReviewSubmitted,
}: OrderReviewModalProps) {
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["Rasa Juara", "Recommended"]);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!order) return null;

  const currentItem = order.items && order.items[selectedItemIdx];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || submitting || !currentItem) return;

    setSubmitting(true);
    try {
      await createMenuReviewInSupabase(currentItem.id || "default", {
        reviewer_name: order.customer_name || "Pelanggan MathBites",
        reviewer_role: "Pembeli Terverifikasi",
        rating,
        comment: comment.trim(),
        tags: selectedTags,
        user_id: userId || undefined,
      });

      setIsSuccess(true);
      if (onReviewSubmitted) onReviewSubmitted();
      setTimeout(() => {
        setIsSuccess(false);
        setComment("");
        onOpenChange(false);
      }, 2000);
    } catch (err) {
      console.warn("Gagal mengirim ulasan:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span>Beri Ulasan Pesanan #{order.order_number}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Bantu panitia Olimpiade 27 meningkatkan kualitas hidangan &amp; layanan booth stand.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="py-10 text-center flex flex-col items-center justify-center space-y-3"
            >
              <div className="size-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="font-bold text-base text-foreground">Terima Kasih Banyak!</h4>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Ulasan dan rating Anda telah berhasil dikirimkan sebagai pembeli terverifikasi di etalase publik.
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 pt-2"
            >
              {/* Select Menu Item if multiple */}
              {order.items && order.items.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Pilih Menu yang Dinilai:
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {order.items.map((it, idx) => (
                      <button
                        key={it.id || idx}
                        type="button"
                        onClick={() => setSelectedItemIdx(idx)}
                        className={`text-xs px-3 py-1.5 rounded-xl border shrink-0 cursor-pointer transition-colors ${
                          selectedItemIdx === idx
                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                            : "bg-muted/50 border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {it.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Item Banner */}
              {currentItem && (
                <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-foreground truncate">
                      {currentItem.name}
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      Terverifikasi dari pesanan #{order.order_number}
                    </span>
                  </div>
                </div>
              )}

              {/* Star Rating Picker */}
              <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-muted/20 border border-border/60 gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">Beri Penilaian Bintang:</span>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating ?? rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        onClick={() => setRating(star)}
                        className="p-1 cursor-pointer transition-transform hover:scale-120 active:scale-95"
                        aria-label={`Beri ${star} bintang`}
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            active
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {RATING_LABELS[hoverRating ?? rating]}
                </span>
              </div>

              {/* Quick Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Kata Kunci Pengalaman (Opsional):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                          active
                            ? "bg-primary text-primary-foreground border-primary font-semibold"
                            : "bg-card border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Review Comment Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Ulasan Anda:</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Minimal 5 karakter</span>
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ceritakan rasa hidangan, porsi, dan kepuasan Anda..."
                  rows={3}
                  className="text-xs rounded-xl"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || comment.trim().length < 5}
                  className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{submitting ? "Mengirim..." : "Kirimkan Ulasan"}</span>
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
