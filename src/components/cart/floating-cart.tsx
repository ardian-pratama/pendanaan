"use client";

import { useCart } from "@/lib/context/cart-context";
import { formatRupiah } from "@/lib/data/menu-data";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";

export function FloatingCart() {
  const { totalItems, totalPrice, openCart } = useCart();

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          key="floating-cart"
          initial={{ opacity: 0, y: 25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          role="complementary"
          aria-label="Keranjang belanja aktif"
          className="fixed bottom-5 sm:bottom-6 left-4 sm:left-1/2 sm:-translate-x-1/2 z-40 max-w-[calc(100%-6.5rem)] sm:max-w-md w-auto"
        >
          <Button
            type="button"
            onClick={openCart}
            className="h-auto py-2.5 px-3.5 sm:px-5 rounded-2xl bg-card/95 hover:bg-card border border-border text-foreground shadow-2xl backdrop-blur-xl flex items-center gap-3 hover:-translate-y-0.5 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Badge className="size-6 p-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-xs">
                {totalItems}
              </Badge>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground">
                  Keranjang Pesanan
                </span>
                <span className="text-xs sm:text-sm font-bold text-primary">
                  {formatRupiah(totalPrice)}
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs group-hover:bg-primary/90 transition-colors ml-1">
              <span>Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
