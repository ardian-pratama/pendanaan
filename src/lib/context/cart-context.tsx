"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  MenuItem,
  UserProfile,
  UserRole,
  PermissionKey,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import {
  hasPermission as checkHasPermission,
  isStaffOrAdmin as checkIsStaffOrAdmin,
} from "@/lib/auth/permissions";
import type { User } from "@supabase/supabase-js";
import {
  DEFAULT_STORE_SETTINGS,
  evaluateStoreStatus,
  type StoreSettingsMap,
  type StoreStatusResult,
} from "@/lib/utils/store-schedule";

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: MenuItem, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  user: User | null;
  userProfile: UserProfile | null;
  userRole: UserRole | "guest";
  permissions: PermissionKey[];
  hasPermission: (permission: PermissionKey) => boolean;
  isStaffOrAdmin: boolean;
  loadingUser: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  storeSettings: StoreSettingsMap;
  storeStatus: StoreStatusResult;
  isStoreOpen: boolean;
  refreshSettings: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "mathbites_cart_om27";
export const ORDER_HISTORY_KEY = "mathbites_order_history_om27";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettingsMap>(DEFAULT_STORE_SETTINGS);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // 1. Load initial cart from localStorage safely on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to read cart from localStorage:", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // 2. Persist cart to localStorage ONLY AFTER initialization
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to save cart to localStorage:", e);
    }
  }, [items, isInitialized]);

  // 3. Check for URL flag to open cart (e.g. after login redirect)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("openCart") === "1" || url.hash === "#pesanan-saya") {
        setIsCartOpen(true);
        url.searchParams.delete("openCart");
        window.history.replaceState({}, "", url.pathname + (url.hash || ""));
      }
    }
  }, []);

  // Load user profile & permissions from Supabase
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from("user_profiles") as any)
        .select("*")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setUserProfile(data as UserProfile);
      }
    } catch (err) {
      console.warn("Failed to load user profile:", err);
    }
  }, []);

  // 4. Listen to Supabase auth state and real-time profile updates
  useEffect(() => {
    const supabase = createClient();

    async function checkUser() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setUser(currentUser);
        if (currentUser) {
          await loadProfile(currentUser.id);
        } else {
          setUserProfile(null);
        }
      } catch (err) {
        console.warn("Failed to get current user:", err);
      } finally {
        setLoadingUser(false);
      }
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const current = session?.user ?? null;
      setUser(current);
      if (current) {
        await loadProfile(current.id);
      } else {
        setUserProfile(null);
      }
      setLoadingUser(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Real-time listener for current user's role and permission changes
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`profile-sync-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setUserProfile(payload.new as UserProfile);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Load application settings from Supabase & keep synchronized in real-time
  const refreshSettings = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("app_settings").select("*");
      if (!error && data) {
        const map: Record<string, string> = {};
        for (const s of data as any[]) {
          map[s.key] = typeof s.value === "string" ? s.value : String(s.value ?? "");
        }
        setStoreSettings((prev) => ({ ...prev, ...map }));
      }
    } catch (e) {
      console.warn("Failed to load store settings in cart context:", e);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
    const supabase = createClient();
    const channel = supabase
      .channel("cart-realtime-app-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => {
          refreshSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshSettings]);

  const storeStatus = useMemo(() => evaluateStoreStatus(storeSettings), [storeSettings]);
  const isStoreOpen = storeStatus.isOpen;

  const addToCart = useCallback((item: MenuItem, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item.id === item.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { item, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((i) => i.item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.item.id !== itemId));
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.item.id === itemId ? { ...i, quantity } : i
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.item.price * item.quantity, 0),
    [items]
  );

  // Derived role & permissions (strictly from database user_profiles)
  const userRole: UserRole | "guest" = useMemo(() => {
    if (!user) return "guest";
    if (userProfile?.role) return userProfile.role as UserRole;
    return "user";
  }, [user, userProfile]);

  const permissions: PermissionKey[] = useMemo(() => {
    if (!userProfile) return [];
    if (userProfile.permissions && Array.isArray(userProfile.permissions)) {
      return userProfile.permissions as PermissionKey[];
    }
    return [];
  }, [userProfile]);

  const hasPermission = useCallback(
    (permission: PermissionKey) => {
      return checkHasPermission(userProfile, permission);
    },
    [userProfile]
  );

  const isStaffOrAdmin = useMemo(() => {
    return checkIsStaffOrAdmin(userRole);
  }, [userRole]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id);
    }
  }, [user, loadProfile]);

  const signOut = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Client signOut error:", e);
    }

    try {
      await fetch("/auth/signout", { method: "POST" });
    } catch (e) {
      console.warn("Server signOut error:", e);
    }

    setUser(null);
    setUserProfile(null);
    window.location.href = "/";
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        openCart,
        closeCart,
        user,
        userProfile,
        userRole,
        permissions,
        hasPermission,
        isStaffOrAdmin,
        loadingUser,
        signOut,
        refreshProfile,
        storeSettings,
        storeStatus,
        isStoreOpen,
        refreshSettings,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
