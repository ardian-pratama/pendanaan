import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isStaffOrAdmin } from "@/lib/auth/permissions";

/**
 * Next.js Middleware — refresh sesi Supabase + proteksi route.
 *
 * Logika:
 * - /admin/**  → wajib login DAN role staf/admin (superadmin, admin, bendahara, staff)
 *               berdasarkan tabel database user_profiles (single source of truth).
 *               Jika role berubah ke "user", segera redirect ke /?unauthorized=admin
 * - /login     → jika sudah login sebagai admin → redirect /admin
 *               jika sudah login sebagai user biasa → redirect /
 * - Semua lain → hanya refresh sesi
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // IMPORTANT: getUser() must be called immediately after createServerClient
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Protect /admin routes ─────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!user) {
      // Not logged in → go to login with return redirect
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }

    // ALWAYS query database user_profiles table as the authoritative source of truth
    // Do NOT rely on cached user_metadata, which can be stale after role changes in DB
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "user";

    if (!isStaffOrAdmin(role)) {
      // Logged in but role is not staff/admin (e.g., changed to user) → redirect to storefront
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "unauthorized=admin";
      return NextResponse.redirect(url);
    }
  }

  // ── Redirect already-logged-in users from /login ─────────────
  if (pathname === "/login" && user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "user";
    const next = request.nextUrl.searchParams.get("next");
    const hasAdminAccess = isStaffOrAdmin(role);

    // Prioritize returning to original location if specified (e.g. /?openCart=1, /pesanan, /#menu)
    if (next && next !== "/login") {
      if (next.startsWith("/admin") && !hasAdminAccess) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "unauthorized=admin";
        return NextResponse.redirect(url);
      }
      const targetUrl = new URL(next, request.nextUrl.origin);
      return NextResponse.redirect(targetUrl);
    }

    // Default redirect when no explicit next is specified:
    if (hasAdminAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }

    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, images
     * - auth/callback (must be public for OAuth flow)
     */
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|auth/callback).*)",
  ],
};
