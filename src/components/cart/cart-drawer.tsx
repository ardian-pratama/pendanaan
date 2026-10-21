"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart, ORDER_HISTORY_KEY } from "@/lib/context/cart-context";
import { formatRupiah } from "@/lib/data/menu-data";
import { createClient } from "@/lib/supabase/client";
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  LogIn,
  AlertCircle,
  Phone,
  FileText,
  CreditCard,
  QrCode,
  Banknote,
  Send,
  Loader2,
  Upload,
  Download,
  Copy,
  Check,
  ImageIcon,
} from "lucide-react";
import QRCode from "qrcode";
import { OrderQrCode } from "@/components/orders/order-qr-code";
import { GoogleLogo } from "@/components/common/google-logo";
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
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function CartDrawer() {
  const {
    items,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalItems,
    totalPrice,
    user,
    loadingUser,
    storeStatus,
    isStoreOpen,
    storeSettings,
  } = useCart();

  // Checkout form state
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "transfer" | "tunai">("qris");
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [copiedRekening, setCopiedRekening] = useState(false);
  const [copiedNominal, setCopiedNominal] = useState(false);
  const [qrisDataUrl, setQrisDataUrl] = useState<string>("");
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNumber: string;
    total: number;
    phone: string;
    customerName: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Generate official static QRIS image
  useEffect(() => {
    const staticQrisPayload =
      "00020101021226680016ID.CO.BANK.WWW011893600918000000000102150000000000000000303UMI51440014ID.LINKAJA.WWW011893600918000000000102150000000000000000303UMI5204581253033605802ID5919MATHBITES FKIP UNRI6010PEKANBARU61052829362070703A016304";
    QRCode.toDataURL(staticQrisPayload, {
      width: 280,
      margin: 1.5,
      color: {
        dark: "#1e1b4b",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrisDataUrl(url))
      .catch((err) => console.error("Failed to generate static QRIS:", err));
  }, []);

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Hanya file foto atau gambar bukti pembayaran yang diperbolehkan.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Ukuran file bukti pembayaran maksimal 5MB.");
      return;
    }

    setProofFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setFormError(null);
  };

  // Auto-close cart drawer QR immediately if scanned and completed by admin
  useEffect(() => {
    if (!orderSuccess?.orderNumber) return;
    const targetOrderNumber = orderSuccess.orderNumber;
    const supabase = createClient();

    const handleCompleted = () => {
      setOrderSuccess(null);
      closeCart();
    };

    window.addEventListener("mathbites_orders_updated", handleCompleted);

    const channel = supabase
      .channel(`order_complete_drawer_${targetOrderNumber}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `order_number=eq.${targetOrderNumber}`,
        },
        (payload: any) => {
          const newStatus = payload.new?.status;
          if (newStatus === "completed" || newStatus === "selesai") {
            handleCompleted();
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("mathbites_orders_updated", handleCompleted);
      supabase.removeChannel(channel);
    };
  }, [orderSuccess?.orderNumber, closeCart]);

  // Handle Checkout submission
  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!isStoreOpen) {
      setFormError(`Pemesanan sedang ditutup: ${storeStatus.reason || "Jadwal operasional berakhir."}`);
      return;
    }

    if (!user) {
      setFormError("Silakan masuk (login) terlebih dahulu untuk melanjutkan checkout.");
      return;
    }

    if (items.length === 0) {
      setFormError("Keranjang belanja Anda masih kosong.");
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setFormError("Nomor WhatsApp wajib diisi untuk konfirmasi pesanan.");
      return;
    }

    if ((paymentMethod === "qris" || paymentMethod === "transfer") && !proofFile) {
      setFormError(
        `Wajib mengunggah bukti pembayaran untuk metode ${
          paymentMethod === "qris" ? "QRIS" : "Transfer Bank"
        }.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      const customerName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Pelanggan MathBites";

      const orderNumber = `MB-${Date.now().toString().slice(-6)}`;

      // Upload proof file if present
      let uploadedProofUrl: string | null = null;
      if (proofFile) {
        try {
          const fileExt = proofFile.name.split(".").pop() || "jpg";
          const fileName = `${orderNumber}_${Date.now()}.${fileExt}`;
          const filePath = `receipts/${fileName}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from("payment-proofs")
            .upload(filePath, proofFile, { upsert: true });

          if (!uploadErr && uploadData) {
            const { data: pubData } = supabase.storage
              .from("payment-proofs")
              .getPublicUrl(filePath);
            uploadedProofUrl = pubData.publicUrl;
          } else {
            uploadedProofUrl = proofPreview;
          }
        } catch {
          uploadedProofUrl = proofPreview;
        }
      }

      // Insert Order record
      const { data: newOrder, error: orderErr } = await (supabase.from("orders") as any)
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          customer_name: customerName,
          customer_phone: cleanPhone,
          customer_email: user.email ?? null,
          total_amount: totalPrice,
          payment_method: paymentMethod,
          payment_proof_url: uploadedProofUrl,
          pickup_time: "-",
          notes: notes.trim() || null,
          status: "pending",
        })
        .select()
        .single();

      if (orderErr) {
        throw new Error(orderErr.message);
      }

      // Insert Order Items
      if (newOrder && items.length > 0) {
        const orderItemsPayload = items.map((cartItem) => ({
          order_id: newOrder.id,
          menu_item_id: cartItem.item.id,
          quantity: cartItem.quantity,
          unit_price: cartItem.item.price,
        }));

        const { error: itemsErr } = await (supabase.from("order_items") as any).insert(
          orderItemsPayload
        );

        if (itemsErr) {
          console.error("Error inserting order items:", itemsErr);
        }
      }

      // Save order to LocalStorage history
      try {
        const existing = localStorage.getItem(ORDER_HISTORY_KEY);
        const history = existing ? JSON.parse(existing) : [];
        history.unshift({
          id: newOrder?.id || orderNumber,
          order_number: orderNumber,
          created_at: new Date().toISOString(),
          customer_name: customerName,
          customer_phone: cleanPhone,
          customer_email: user.email ?? null,
          total_amount: totalPrice,
          payment_method: paymentMethod,
          payment_proof_url: uploadedProofUrl,
          pickup_time: "-",
          notes: notes.trim() || null,
          status: "pending",
          items: items.map((ci) => ({
            id: ci.item.id,
            name: ci.item.name,
            price: ci.item.price,
            quantity: ci.quantity,
            image_url: ci.item.image_url,
            category: ci.item.category,
          })),
        });
        localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("mathbites_orders_updated"));
        }
      } catch (e) {
        console.warn("Failed to save order to localStorage history:", e);
      }

      // Success
      setOrderSuccess({
        orderNumber,
        total: totalPrice,
        phone: cleanPhone,
        customerName,
      });

      clearCart();
    } catch {
      setFormError("Terjadi kendala saat memproses pesanan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  // Pre-filled WhatsApp confirmation URL
  const waMessage = orderSuccess
    ? encodeURIComponent(
        `Halo Panitia Olimpiade 27 MathBites! 👋\n` +
          `Saya ingin konfirmasi pesanan:\n\n` +
          `*Nomor Order:* ${orderSuccess.orderNumber}\n` +
          `*Nama:* ${orderSuccess.customerName}\n` +
          `*WhatsApp:* ${orderSuccess.phone}\n` +
          `*Total:* ${formatRupiah(orderSuccess.total)}\n` +
          `*Metode Pembayaran:* ${paymentMethod.toUpperCase()}\n\n` +
          `Mohon dicek ya, terima kasih!`
      )
    : "";

  return (
    <Sheet
      open={isCartOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeCart();
        }
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col h-full bg-card border-border shadow-2xl"
      >
        {/* Sheet Header */}
        <SheetHeader className="px-5 py-4 pr-12 border-b border-border bg-card shrink-0 text-left">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-foreground leading-tight">
                Keranjang Pesanan
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Olimpiade Matematika 27 · Dukung Penggalangan Dana
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* SUCCESS VIEW */}
          {orderSuccess ? (
            <div className="flex flex-col items-center text-center py-4 space-y-4">
              <div className="size-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 font-semibold text-xs mb-2">
                  Pesanan Berhasil Dicatat
                </Badge>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                  Terima Kasih, {orderSuccess.customerName}!
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm">
                  Pesanan Anda telah tersimpan dan siap diproses oleh panitia kegiatan Olimpiade 27.
                </p>
              </div>

              {/* Order Card Info */}
              <Card className="w-full border-border bg-muted/30 rounded-2xl py-0">
                <CardContent className="p-4 space-y-2.5 text-left text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground font-medium">Nomor Pesanan</span>
                    <span className="font-mono text-sm font-bold text-primary">
                      {orderSuccess.orderNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Pembayaran</span>
                    <span className="font-bold text-foreground text-sm">
                      {formatRupiah(orderSuccess.total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Metode Bayar</span>
                    <Badge variant="secondary" className="font-semibold text-xs">
                      {paymentMethod === "qris" ? "QRIS" : paymentMethod === "transfer" ? "Transfer Bank" : "Tunai"}
                    </Badge>
                  </div>
                  <div className="pt-2 border-t border-border flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Ambil di <strong>Booth MathBites</strong> ({storeSettings.pickup_location || "Kampus Pendidikan Matematika FKIP UNRI"}) saat status pesanan siap.
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="w-full space-y-2 pt-2">
                <Button asChild className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-sm">
                  <a
                    href={`https://wa.me/?text=${waMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Send className="w-4 h-4" />
                    Konfirmasi via WhatsApp Panitia
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-xl border-border hover:bg-muted"
                >
                  <Link
                    href="/pesanan"
                    onClick={() => {
                      setOrderSuccess(null);
                      closeCart();
                    }}
                  >
                    Lihat Riwayat Pemesanan
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setOrderSuccess(null);
                    closeCart();
                  }}
                  className="w-full rounded-xl text-muted-foreground hover:text-foreground"
                >
                  Kembali ke Beranda
                </Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            /* EMPTY CART */
            <div className="flex flex-col items-center justify-center text-center py-16 space-y-4">
              <div className="size-20 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground/50">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Keranjang Masih Kosong
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Pilih menu makanan &amp; minuman favorit Anda untuk mendukung dana kegiatan Olimpiade 27.
                </p>
              </div>
              <Button asChild className="rounded-xl gap-2 mt-2">
                <Link
                  href="/menu"
                  onClick={() => closeCart()}
                >
                  Pilih Menu Pesanan
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          ) : (
            /* CART ITEMS & CHECKOUT FORM */
            <>
              {/* Item List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Daftar Pesanan ({totalItems})
                  </span>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                  >
                    Kosongkan
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map(({ item, quantity }) => (
                    <Card
                      key={item.id}
                      className="border-border bg-card p-3 rounded-2xl flex flex-row items-center gap-3 shadow-2xs py-3"
                    >
                      <div className="relative size-14 rounded-xl overflow-hidden shrink-0 bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs font-semibold text-primary mt-0.5">
                          {formatRupiah(item.price)}
                        </p>
                      </div>

                      {/* Stepper with Shadcn Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          onClick={() => updateQuantity(item.id, quantity - 1)}
                          className="size-7 rounded-lg"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center text-xs font-bold text-foreground tabular-nums">
                          {quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          onClick={() => updateQuantity(item.id, quantity + 1)}
                          className="size-7 rounded-lg"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeFromCart(item.id)}
                          className="size-7 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 ml-0.5"
                          aria-label="Hapus item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Booth & Pickup Information */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Pengambilan di Booth Kampus FKIP UNRI</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {storeSettings.pickup_location || "Kampus Pendidikan Matematika FKIP UNRI"} · {storeSettings.pickup_date || "Kamis, 24 Okt"} ({storeSettings.pickup_hours || "11:30–14:00 WIB"}).
                </p>
              </div>

              {/* STORE CLOSED BANNER IF NOT OPEN */}
              {!isStoreOpen && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>{storeStatus.statusText}</span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    {storeStatus.reason || "Pemesanan sedang dinonaktifkan sementara oleh panitia."}
                  </p>
                </div>
              )}

              {/* AUTH CHECK & FORM */}
              {loadingUser ? (
                <div className="py-8 flex items-center justify-center text-muted-foreground gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Memeriksa status akun...</span>
                </div>
              ) : !user ? (
                /* USER NOT LOGGED IN: REQUIRE LOGIN PROMPT */
                <Card className="border-primary/30 bg-primary/5 rounded-2xl py-0">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                        <LogIn className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground">
                          Wajib Masuk (Login) Akun
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          Untuk mencatat bukti pesanan dan menerbitkan QR Code, masuk menggunakan akun Google terlebih dahulu.
                        </p>
                      </div>
                    </div>

                    <Button asChild className="w-full rounded-xl gap-2 font-bold text-xs">
                      <Link href="/login?next=/?openCart=1">
                        <GoogleLogo className="w-4 h-4 shrink-0" />
                        <span>Masuk dengan Google untuk Checkout</span>
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* USER IS LOGGED IN: SHOW CHECKOUT FORM */
                <form onSubmit={handleCreateOrder} className="space-y-4">
                  {/* Customer Badge */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border">
                    <Avatar className="size-8 shrink-0 border border-primary/20 shadow-2xs">
                      {user.user_metadata?.avatar_url && (
                        <AvatarImage src={user.user_metadata.avatar_url} alt={user.user_metadata?.full_name || "User"} />
                      )}
                      <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                        {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground truncate">
                          {user.user_metadata?.full_name || user.email?.split("@")[0]}
                        </span>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] px-1.5 py-0">
                          Akun Terhubung
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* WhatsApp Field with Shadcn Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="tel"
                      placeholder="Contoh: 081234567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="rounded-xl text-xs sm:text-sm bg-muted/30"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Untuk konfirmasi status pesanan saat makanan siap diambil.
                    </p>
                  </div>

                  {/* Notes Field with Shadcn Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Catatan Pesanan (Opsional)
                    </label>
                    <Input
                      type="text"
                      placeholder="Contoh: sambal dipisah, es batu sedikit"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="rounded-xl text-xs sm:text-sm bg-muted/30"
                    />
                  </div>

                  {/* Payment Methods */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" />
                      Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "qris", label: "QRIS", icon: QrCode },
                        { key: "transfer", label: "Transfer", icon: CreditCard },
                        { key: "tunai", label: "Tunai Booth", icon: Banknote },
                      ].map((pm) => {
                        const selected = paymentMethod === pm.key;
                        return (
                          <Button
                            key={pm.key}
                            type="button"
                            variant={selected ? "default" : "outline"}
                            onClick={() => {
                              setPaymentMethod(pm.key as any);
                              setFormError(null);
                            }}
                            className="flex flex-col items-center gap-1 h-auto py-2.5 rounded-xl border-border text-xs cursor-pointer"
                          >
                            <pm.icon className="w-4 h-4" />
                            <span>{pm.label}</span>
                          </Button>
                        );
                      })}
                    </div>

                    {/* QRIS PAYMENT METHOD CARD */}
                    {paymentMethod === "qris" && (
                      <Card className="rounded-2xl border bg-muted/20 p-4 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                              QRIS RESMI
                            </Badge>
                            <span className="text-[11px] font-semibold text-foreground">MathBites FKIP UNRI</span>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">NMID: ID102439812903</span>
                        </div>

                        {/* QR Code Container */}
                        <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-xs border">
                          {qrisDataUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={qrisDataUrl}
                              alt="QRIS MathBites Olimpiade 27"
                              className="w-44 h-44 rounded-lg object-contain"
                            />
                          ) : (
                            <div className="w-44 h-44 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                          )}
                          <div className="mt-2 text-center">
                            <p className="text-xs font-bold text-slate-900">
                              Total: {formatRupiah(totalPrice)}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              BCA · Mandiri · BRI · BNI · GoPay · OVO · ShopeePay · DANA
                            </p>
                          </div>
                        </div>

                        {/* Upload Proof for QRIS */}
                        <div className="space-y-1.5 pt-1">
                          <label className="text-xs font-bold text-foreground flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Upload className="w-3.5 h-3.5 text-primary" />
                              Unggah Bukti Pembayaran QRIS <span className="text-rose-500">*</span>
                            </span>
                            {proofFile && (
                              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Foto Terpilih
                              </span>
                            )}
                          </label>

                          {proofPreview ? (
                            <div className="relative p-2.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={proofPreview}
                                alt="Preview Bukti"
                                className="size-14 rounded-lg object-cover border bg-background shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">
                                  {proofFile?.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {((proofFile?.size || 0) / 1024).toFixed(1)} KB · Siap diunggah
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => {
                                  setProofFile(null);
                                  setProofPreview(null);
                                }}
                                className="size-7 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-background/50 hover:bg-muted/40 transition-colors cursor-pointer group">
                              <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mb-1.5" />
                              <span className="text-xs font-semibold text-foreground">
                                Pilih Foto / Screenshot Struk QRIS
                              </span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                Format JPG, PNG atau WEBP (Maksimal 5MB)
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleProofChange}
                              />
                            </label>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* BANK TRANSFER PAYMENT METHOD CARD */}
                    {paymentMethod === "transfer" && (
                      <Card className="rounded-2xl border bg-muted/20 p-4 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                            TRANSFER BANK RESMI
                          </Badge>
                          <span className="text-[11px] font-semibold text-foreground">Bank BNI</span>
                        </div>

                        <div className="p-3 rounded-xl bg-background border space-y-2 text-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-border">
                            <span className="text-muted-foreground">Bank Tujuan</span>
                            <span className="font-bold text-foreground">Bank BNI (Kode: 009)</span>
                          </div>
                          <div className="flex items-center justify-between pb-2 border-b border-border">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Nomor Rekening</p>
                              <p className="font-mono font-bold text-sm text-foreground">1829 4719 23</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText("1829471923");
                                setCopiedRekening(true);
                                setTimeout(() => setCopiedRekening(false), 2000);
                              }}
                              className="h-7 text-[11px] gap-1 rounded-lg cursor-pointer"
                            >
                              {copiedRekening ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Salin No. Rek</span>
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="flex items-center justify-between pb-2 border-b border-border">
                            <span className="text-muted-foreground">Atas Nama</span>
                            <span className="font-bold text-foreground">BENDAHARA OLIMPIADE 27</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Jumlah yang Ditransfer</p>
                              <p className="font-bold text-sm text-primary">{formatRupiah(totalPrice)}</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(totalPrice.toString());
                                setCopiedNominal(true);
                                setTimeout(() => setCopiedNominal(false), 2000);
                              }}
                              className="h-7 text-[11px] gap-1 rounded-lg cursor-pointer"
                            >
                              {copiedNominal ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Salin Nominal</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Upload Proof for Bank Transfer */}
                        <div className="space-y-1.5 pt-1">
                          <label className="text-xs font-bold text-foreground flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Upload className="w-3.5 h-3.5 text-primary" />
                              Unggah Bukti Transfer Bank <span className="text-rose-500">*</span>
                            </span>
                            {proofFile && (
                              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Foto Terpilih
                              </span>
                            )}
                          </label>

                          {proofPreview ? (
                            <div className="relative p-2.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={proofPreview}
                                alt="Preview Bukti"
                                className="size-14 rounded-lg object-cover border bg-background shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">
                                  {proofFile?.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {((proofFile?.size || 0) / 1024).toFixed(1)} KB · Siap diunggah
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => {
                                  setProofFile(null);
                                  setProofPreview(null);
                                }}
                                className="size-7 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-background/50 hover:bg-muted/40 transition-colors cursor-pointer group">
                              <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mb-1.5" />
                              <span className="text-xs font-semibold text-foreground">
                                Pilih Foto Bukti Transfer M-Banking / Struk ATM
                              </span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                Format JPG, PNG atau WEBP (Maksimal 5MB)
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleProofChange}
                              />
                            </label>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* TUNAI PAYMENT METHOD CARD */}
                    {paymentMethod === "tunai" && (
                      <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs space-y-1">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <Banknote className="w-3.5 h-3.5 text-primary" />
                          <span>Pembayaran Tunai Booth</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Pembayaran dilakukan secara tunai langsung di Booth Panitia FKIP UNRI saat Anda mengambil pesanan makanan.
                        </p>
                      </div>
                    )}
                  </div>

                  {formError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={submitting || !isStoreOpen}
                    className="w-full h-12 rounded-xl font-bold text-sm shadow-md gap-2 cursor-pointer"
                  >
                    {!isStoreOpen ? (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>Pemesanan Ditutup ({storeStatus.statusText})</span>
                      </>
                    ) : submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Memproses Pesanan...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Konfirmasi &amp; Buat Pesanan ({formatRupiah(totalPrice)})
                      </>
                    )}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer Summary (if not empty & not success) */}
        {!orderSuccess && items.length > 0 && (
          <div className="p-4 border-t border-border bg-muted/20 shrink-0 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">Total Pembayaran</p>
              <p className="text-base sm:text-lg font-bold text-primary">
                {formatRupiah(totalPrice)}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
                100% Dukung Olimpiade 27
              </Badge>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
