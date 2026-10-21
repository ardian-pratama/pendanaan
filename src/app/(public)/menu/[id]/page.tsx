"use client";

import { useState, useEffect, useMemo, use, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MenuItem } from "@/lib/supabase/database.types";
import { fallbackMenuItems, formatRupiah } from "@/lib/data/menu-data";
import {
  fetchMenuReviewsFromSupabase,
  createMenuReviewInSupabase,
  getRatingSummary,
  type MenuReview,
} from "@/lib/data/menu-reviews";
import { useCart } from "@/lib/context/cart-context";
import {
  Star,
  Plus,
  Minus,
  Check,
  ChevronRight,
  Home,
  MapPin,
  Clock,
  Loader2,
  ShieldCheck,
  HeartHandshake,
  ShoppingCart,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  BadgeCheck,
  LogIn,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BoothLocationModal } from "@/components/common/booth-location-modal";
import { ReviewComments } from "@/components/reviews/review-comments";

function MenuItemDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const itemId = resolvedParams.id;
  const router = useRouter();

  const { addToCart, openCart, storeSettings, isStoreOpen, storeStatus, user, isStaffOrAdmin } = useCart();
  const [mapModalOpen, setMapModalOpen] = useState(false);

  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<MenuReview[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Purchase verification state
  const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);
  const [checkingPurchase, setCheckingPurchase] = useState(false);

  const [otherItems, setOtherItems] = useState<MenuItem[]>([]);

  // Fetch Menu Item & Recommendations from Supabase
  useEffect(() => {
    let cancelled = false;

    async function loadItem() {
      try {
        const supabase = createClient();
        const [{ data, error }, { data: recData }] = await Promise.all([
          supabase.from("menu_items").select("*").eq("id", itemId).single(),
          supabase
            .from("menu_items")
            .select("*")
            .neq("id", itemId)
            .eq("is_available", true)
            .limit(3),
        ]);

        if (!cancelled) {
          if (!error && data) {
            setItem(data);
          } else {
            setItem(null);
          }
          if (recData && recData.length > 0) {
            setOtherItems(recData);
          } else {
            setOtherItems([]);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setItem(null);
          setOtherItems([]);
          setLoading(false);
        }
      }
    }

    loadItem();
    // Load reviews from Supabase
    fetchMenuReviewsFromSupabase(itemId).then((revs) => {
      if (!cancelled) {
        setReviews(revs);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const ratingSummary = useMemo(() => getRatingSummary(reviews), [reviews]);

  const handleAddToCart = () => {
    if (!item) return;
    addToCart(item, qty);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCart();
    }, 450);
  };

  // Check if current user has completed a purchase containing this menu item
  useEffect(() => {
    let cancelled = false;

    async function checkPurchaseEligibility() {
      if (!user) {
        setHasPurchased(false);
        return;
      }
      setCheckingPurchase(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("orders")
          .select("id, status, order_items(menu_item_id)")
          .or(`customer_email.eq.${user.email},user_id.eq.${user.id}`)
          .in("status", ["selesai", "completed"]);

        if (!cancelled) {
          let bought = false;
          if (!error && data) {
            bought = data.some((order: any) =>
              order.order_items?.some((oi: any) => oi.menu_item_id === itemId)
            );
          }
          // Local storage order history fallback for offline/local flow
          if (!bought && typeof window !== "undefined") {
            try {
              const saved = localStorage.getItem("mathbites_order_history_v1");
              if (saved) {
                const localOrders = JSON.parse(saved);
                bought = localOrders.some((o: any) =>
                  (o.status === "selesai" || o.status === "completed") &&
                  o.items?.some((i: any) => i.id === itemId || i.name === item?.name)
                );
              }
            } catch {}
          }
          setHasPurchased(bought);
        }
      } catch {
        if (!cancelled) setHasPurchased(false);
      } finally {
        if (!cancelled) setCheckingPurchase(false);
      }
    }

    checkPurchaseEligibility();
    return () => {
      cancelled = true;
    };
  }, [user, itemId, item?.name]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmittingReview(true);
    try {
      const displayName =
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Pembeli Terverifikasi";

      const addedItem = await createMenuReviewInSupabase(itemId, {
        reviewer_name: displayName,
        reviewer_role: "Pembeli Terverifikasi",
        rating: newRating,
        comment: newComment.trim(),
        tags: ["Pembeli Terverifikasi"],
        user_id: user.id,
      });

      setReviews((prev) => [addedItem, ...prev]);
      setNewComment("");
      setReviewSubmitted(true);
      setTimeout(() => setReviewSubmitted(false), 4000);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <main className="w-full pt-28 pb-20 bg-surface min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Memuat detail menu...</p>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="w-full pt-28 pb-20 bg-surface min-h-[70vh] flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center flex flex-col items-center gap-4">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Menu Tidak Ditemukan</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Menu yang Anda cari mungkin telah dinonaktifkan atau tautan yang Anda tuju kurang tepat.
          </p>
          <Button asChild className="rounded-xl mt-2">
            <Link href="/menu">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Katalog Menu
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="w-full pt-20 sm:pt-24 pb-20 bg-surface min-h-screen" tabIndex={-1}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 flex-wrap">
          <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          <Link href="/menu" className="hover:text-primary transition-colors">
            Katalog Menu
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-none">
            {item.name}
          </span>
        </nav>

        {/* ========================================================
            1. PRODUCT DETAILS HERO (Two columns responsive)
        ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">

          {/* Left: Product Image */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-[4/3] sm:aspect-square w-full rounded-3xl overflow-hidden bg-surface-container-low border border-border shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover"
                loading="eager"
              />

              {/* Badges Overlay */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                {item.badge && (
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold shadow-xs ${
                      item.badge_style ?? "bg-primary text-primary-foreground"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                <span className="px-3 py-1 rounded-xl bg-card/90 backdrop-blur-md text-xs font-semibold text-foreground border border-border shadow-xs">
                  {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : ""}
                </span>
              </div>

              {/* Status Stock */}
              <div className="absolute bottom-3 left-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-card/90 backdrop-blur-md text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-border shadow-xs">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Stok Siap Dipesan
                </span>
              </div>
            </div>

            {/* Quick info */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Higienis &amp; Dikelola Panitia</span>
            </div>
          </div>

          {/* Right: Product Details & Purchase Actions */}
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span>{ratingSummary.average}</span>
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  ({reviews.length} Ulasan Pelanggan)
                </span>
                <span className="text-xs text-muted-foreground opacity-50">·</span>
                <span className="text-xs text-muted-foreground font-medium">
                  {item.sold_count} Terjual
                </span>
              </div>

              <h1
                className="text-2xl sm:text-3xl font-bold text-foreground leading-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {item.name}
              </h1>

              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-primary">
                  {formatRupiah(item.price)}
                </span>
                <span className="text-xs text-muted-foreground">/ porsi</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 border-t border-border pt-4">
              <h3 className="text-xs font-semibold text-muted-foreground">
                Deskripsi Hidangan
              </h3>
              <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Location & Time Info with Shadcn Card */}
            <Card className="rounded-2xl bg-muted/40 border-border p-3.5 sm:p-4 flex flex-col gap-2.5 text-xs py-3.5 sm:py-4 shadow-2xs">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground block">Lokasi Pengambilan</span>
                    <span className="text-muted-foreground">
                      {storeSettings.pickup_location || "Kampus Pendidikan Matematika FKIP UNRI"}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setMapModalOpen(true)}
                  className="rounded-xl text-[11px] font-semibold text-primary border-primary/20 hover:bg-primary/5 cursor-pointer shrink-0"
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  Buka Peta Booth
                </Button>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground block">Jadwal Pengambilan Stand</span>
                  <span className="text-muted-foreground">
                    {storeSettings.pickup_date || "Kamis, 24 Oktober"} ({storeSettings.pickup_hours || "11:30 – 14:00 WIB"})
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <HeartHandshake className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground block">Tujuan Penggalangan Dana</span>
                  <span className="text-muted-foreground">
                    100% laba penjualan dialokasikan untuk operasional &amp; fasilitas Olimpiade 27.
                  </span>
                </div>
              </div>
            </Card>

            {/* Quantity Stepper & Add to Cart */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-foreground">Jumlah Pesanan</span>
                <div className="inline-flex items-center bg-muted/70 rounded-xl p-0.5 border border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                    disabled={qty <= 1}
                    className="size-7 rounded-lg hover:bg-card text-foreground"
                    aria-label="Kurangi jumlah"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <span className="w-8 text-center text-xs font-bold text-foreground tabular-nums">
                    {qty}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setQty((prev) => prev + 1)}
                    className="size-7 rounded-lg hover:bg-card text-foreground"
                    aria-label="Tambah jumlah"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground ml-auto">
                  Subtotal <strong className="text-primary font-bold text-sm">{formatRupiah(item.price * qty)}</strong>
                </div>
              </div>

              {/* Add Button */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={handleAddToCart}
                  disabled={!isStoreOpen}
                  size="lg"
                  className={`flex-1 rounded-2xl h-12 text-sm font-bold shadow-md transition-all gap-2 cursor-pointer ${
                    added ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Berhasil Ditambahkan!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      <span>Tambah ke Keranjang Pesanan</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={openCart}
                  size="lg"
                  className="rounded-2xl h-12 px-4 border-border hover:bg-muted"
                  aria-label="Buka Keranjang"
                >
                  <ShoppingCart className="w-4 h-4" />
                </Button>
              </div>

              {!isStoreOpen && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pemesanan sedang ditutup: {storeStatus.reason || "Sesuai jadwal operasional panitia."}</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ========================================================
            2. REVIEWS & CUSTOMER COMMENTS SECTION
        ========================================================= */}
        <section
          aria-labelledby="reviews-heading"
          className="border-t border-border pt-10 sm:pt-12 flex flex-col gap-8"
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ulasan &amp; Komentar Pembeli</span>
              </div>
              <h2
                id="reviews-heading"
                className="text-xl sm:text-2xl font-bold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Apa Kata Mereka Tentang {item.name}?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Ulasan asli dari mahasiswa, dosen, dan pengunjung yang telah menikmati menu ini di kampus.
              </p>
            </div>
          </div>

          {/* Rating Summary Card with Shadcn Card */}
          <Card className="rounded-3xl bg-surface-container-low border-border p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center py-5 sm:py-6">
            {/* Big Score */}
            <div className="flex flex-col items-center justify-center text-center sm:border-r border-border pr-0 sm:pr-6">
              <span className="text-4xl sm:text-5xl font-black text-foreground">
                {ratingSummary.average}
              </span>
              <div className="flex items-center gap-1 mt-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= Math.round(ratingSummary.average)
                        ? "text-amber-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground mt-1.5">
                Berdasarkan <strong>{reviews.length}</strong> ulasan pembeli
              </span>
            </div>

            {/* Star Distribution Bars */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const percent = ratingSummary.breakdown[star] || 0;
                return (
                  <div key={star} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <span className="w-6 font-semibold flex items-center gap-0.5">
                      {star} <Star className="w-3 h-3 text-amber-500" />
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-medium text-[11px] tabular-nums">
                      {percent}%
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Reviews List & Submission Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

            {/* Review Cards (Left 2 cols) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-foreground">
                Daftar Ulasan &amp; Testimoni ({reviews.length})
              </h3>

              {reviews.map((rev) => (
                <Card
                  key={rev.id}
                  className="rounded-2xl bg-card border-border p-4 sm:p-5 flex flex-col gap-3 shadow-2xs hover:shadow-xs transition-shadow py-4 sm:py-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9 shrink-0 border border-primary/20 shadow-2xs">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {rev.reviewer_name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">
                            {rev.reviewer_name}
                          </h4>
                          {rev.is_verified_buyer && (
                            <Badge variant="outline" className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 px-1.5 py-0">
                              <BadgeCheck className="w-3 h-3" />
                              Pembeli Terverifikasi
                            </Badge>
                          )}
                        </div>
                        {rev.reviewer_role && (
                          <p className="text-[10px] text-muted-foreground">{rev.reviewer_role}</p>
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] text-muted-foreground shrink-0">{rev.created_at}</span>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.rating
                            ? "text-amber-500"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  {/* Tags */}
                  {rev.tags && rev.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {rev.tags.map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                        >
                          #{t}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Helpful Button with Shadcn Button */}
                  <div className="flex items-center justify-end pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>Membantu ({rev.helpful_count})</span>
                    </Button>
                  </div>

                  {/* Thread Komentar & Balasan pada Ulasan */}
                  <ReviewComments
                    reviewId={rev.id}
                    user={user}
                    userRole={user ? "customer" : undefined}
                    isStaffOrAdmin={isStaffOrAdmin}
                  />
                </Card>
              ))}
            </div>

            {/* Submit Review Form (Right 1 col) with Shadcn Card */}
            {/* Submit Review Form (Right 1 col) with Shadcn Card */}
            {!user ? (
              <Card className="rounded-2xl bg-card border-border p-5 flex flex-col gap-3.5 shadow-xs sticky top-24 py-5 text-center items-center">
                <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <LogIn className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">Tulis Ulasan &amp; Komentar</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Masuk ke akun Anda untuk memberikan ulasan. Ulasan hanya dapat diisi oleh pembeli yang telah menyelesaikan pesanan menu ini.
                  </p>
                </div>
                <Button asChild size="sm" className="rounded-xl w-full mt-1 gap-2 font-semibold text-xs">
                  <Link href={`/login?next=/menu/${itemId}`}>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Masuk Akun Sekarang</span>
                  </Link>
                </Button>
              </Card>
            ) : checkingPurchase ? (
              <Card className="rounded-2xl bg-card border-border p-6 flex flex-col items-center justify-center gap-3 shadow-xs sticky top-24 text-center">
                <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-xs text-muted-foreground font-medium">Memverifikasi riwayat pembelian...</p>
              </Card>
            ) : !hasPurchased ? (
              <Card className="rounded-2xl bg-card border-border p-5 flex flex-col gap-3.5 shadow-xs sticky top-24 py-5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Khusus Pembeli Terverifikasi</h3>
                    <p className="text-[11px] text-muted-foreground">Status Pembelian Belum Selesai</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ulasan hanya dapat diisi setelah Anda memesan dan pesanan menu ini telah diselesaikan oleh panitia.
                </p>
                <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Akun Masuk</span>
                  <span className="font-semibold text-foreground truncate">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                </div>
                <Button asChild variant="outline" size="sm" className="rounded-xl w-full text-xs">
                  <Link href="/pesanan">Lihat Status Pesanan Saya</Link>
                </Button>
              </Card>
            ) : (
              <Card className="rounded-2xl bg-card border-border p-5 flex flex-col gap-4 shadow-xs sticky top-24 py-5">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Tulis Ulasan &amp; Komentar</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bagikan pengalaman rasa, porsi, dan kepuasan Anda kepada pembeli lainnya.
                  </p>
                </div>

                {/* Account identity chip */}
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs flex items-center gap-2.5">
                  <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-foreground block truncate">
                      {user.user_metadata?.full_name || user.email?.split("@")[0] || "Pembeli"}
                    </span>
                    <span className="text-[11px] text-muted-foreground block truncate">
                      {user.email} · Pembeli Terverifikasi
                    </span>
                  </div>
                </div>

                {reviewSubmitted && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Terima kasih! Ulasan Anda berhasil diterbitkan.</span>
                  </div>
                )}

                <form onSubmit={handleSubmitReview} className="flex flex-col gap-3.5">
                  {/* Rating Picker */}
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Skor Bintang
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setNewRating(star)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                          aria-label={`Beri bintang ${star}`}
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= newRating
                                ? "text-amber-500 stroke-[2]"
                                : "text-muted-foreground/30 hover:text-amber-400"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-2">
                        {newRating} / 5 Bintang
                      </span>
                    </div>
                  </div>

                  {/* Comment */}
                  <div>
                    <label htmlFor="rev-comment" className="text-xs font-semibold text-foreground block mb-1">
                      Ulasan &amp; Komentar
                    </label>
                    <Textarea
                      id="rev-comment"
                      rows={3}
                      placeholder="Ceritakan rasa, porsi, atau kemasan menu ini..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="text-xs rounded-xl bg-muted/30 resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submittingReview || !newComment.trim()}
                    className="w-full rounded-xl text-xs font-bold gap-2 cursor-pointer mt-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{submittingReview ? "Mengirim Ulasan..." : "Kirim Ulasan"}</span>
                  </Button>
                </form>
              </Card>
            )}

          </div>
        </section>

        {/* ========================================================
            3. OTHER RECOMMENDED MENUS
        ========================================================= */}
        <section aria-labelledby="related-heading" className="border-t border-border pt-10 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="related-heading" className="text-base sm:text-lg font-bold text-foreground">
                Rekomendasi Menu Lainnya
              </h2>
              <p className="text-xs text-muted-foreground">
                Pilihan menu favorit lainnya untuk santap siang Anda.
              </p>
            </div>
            <Button asChild variant="link" size="xs" className="text-primary font-bold">
              <Link href="/menu" className="flex items-center gap-1">
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {otherItems.map((rec) => (
              <Card
                key={rec.id}
                className="group p-3 rounded-2xl bg-card border-border hover:border-primary/40 hover:shadow-xs transition-all py-3 shadow-2xs"
              >
                <Link
                  href={`/menu/${rec.id}`}
                  className="flex items-center gap-3 w-full"
                >
                  <div className="size-16 rounded-xl overflow-hidden bg-muted shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rec.image_url}
                      alt={rec.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {rec.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {rec.description}
                    </p>
                    <span className="text-xs font-bold text-primary block mt-1">
                      {formatRupiah(rec.price)}
                    </span>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </section>

      </div>

      {/* Modal Peta Interaktif Lokasi Booth */}
      <BoothLocationModal open={mapModalOpen} onOpenChange={setMapModalOpen} />
    </main>
  );
}

export default function MenuItemDetailPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="max-w-5xl mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      }
    >
      <MenuItemDetailContent {...props} />
    </Suspense>
  );
}
