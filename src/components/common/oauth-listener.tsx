"use client";

import { useEffect } from "react";

/**
 * Client-side safety listener: jika browser diarahkan ke halaman dengan ?code=
 * (misalnya http://localhost:3000/?code=...), segera alihkan ke /auth/callback
 * agar session Supabase berhasil ditukarkan.
 */
export function OAuthCodeListener() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code && window.location.pathname !== "/auth/callback") {
        window.location.replace(`/auth/callback${window.location.search}`);
      }
    }
  }, []);

  return null;
}
