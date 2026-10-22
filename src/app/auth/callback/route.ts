import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/utils/site-url";
import {
  ROLE_DEFAULT_PERMISSIONS,
  isStaffOrAdmin,
} from "@/lib/auth/permissions";
import type { UserRole, PermissionKey } from "@/lib/supabase/database.types";

/**
 * Supabase OAuth callback handler dengan role & permissions setup.
 *
 * Alur Login:
 * 1. Tukar `code` dengan session Supabase
 * 2. Cek apakah user sudah punya row di `user_profiles`
 *    - Jika ADA: ambil role & permissions. Jika permissions kosong, berikan default sesuai rolenya.
 *    - Jika BARU: tentukan role (superadmin jika email admin atau panitia, atau user biasa)
 *      dan pasang default permissions.
 * 3. Update metadata sesi auth
 * 4. Redirect cerdas:
 *    - Staff / Admin (superadmin, admin, bendahara, staff) → /admin
 *    - Pelanggan biasa → / (atau parameter `next`)
 */
export async function GET(request: NextRequest) {
  // Gunakan origin request saat ini agar user tetap berada di environment yang sama (localhost vs production domain)
  const baseOrigin = request.nextUrl.origin || getSiteUrl(request);

  const createRedirect = (pathWithSearch: string) => {
    return NextResponse.redirect(new URL(pathWithSearch, baseOrigin));
  };

  const code = request.nextUrl.searchParams.get("code");
  const errorParam = request.nextUrl.searchParams.get("error");

  // Handle OAuth errors from Google
  if (errorParam) {
    return createRedirect("/login?error=oauth_denied");
  }

  if (!code) {
    return createRedirect("/login?error=no_code");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return createRedirect("/login?error=auth_callback_failed");
  }

  // ── Sync user profile & permissions on login ───────────────────
  const user = data.session.user;
  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Pengguna";
  const avatarUrl = user.user_metadata?.avatar_url ?? null;

  // 1. Fetch existing profile from user_profiles table
  const { data: existingProfile } = await (supabase.from("user_profiles") as any)
    .select("role, permissions")
    .eq("id", user.id)
    .single();

  let role: UserRole = "user";
  let permissions: PermissionKey[] = [];

  if (existingProfile) {
    role = (existingProfile.role as UserRole) || "user";
    const existingPerms = existingProfile.permissions;

    // If permissions array is empty or null, populate with default permissions for this role
    if (!existingPerms || !Array.isArray(existingPerms) || existingPerms.length === 0) {
      permissions = ROLE_DEFAULT_PERMISSIONS[role] || [];
      await (supabase.from("user_profiles") as any)
        .update({
          permissions,
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } else {
      permissions = existingPerms as PermissionKey[];
    }
  } else {
    // New user registration
    const adminEmail = process.env.ADMIN_EMAIL;
    const isFirstOrAdmin = adminEmail ? user.email === adminEmail : true;
    role = isFirstOrAdmin ? "superadmin" : "user";
    permissions = ROLE_DEFAULT_PERMISSIONS[role] || [];

    await (supabase.from("user_profiles") as any).insert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      avatar_url: avatarUrl,
      role,
      permissions,
    });
  }

  // Update auth metadata for fast edge middleware checks
  try {
    await supabase.auth.updateUser({
      data: {
        role,
        permissions,
        full_name: fullName,
        avatar_url: avatarUrl,
      },
    });
  } catch (err) {
    console.warn("Could not update auth metadata:", err);
  }

  // ── Role & Permission-based redirect ──────────────────────────
  const nextParam = request.nextUrl.searchParams.get("next");

  // If user came from a specific page or action (e.g. /?openCart=1, /#menu, /pesanan)
  if (nextParam && nextParam !== "/login") {
    // If attempting to go to admin panel, verify staff/admin role
    if (nextParam.startsWith("/admin")) {
      if (isStaffOrAdmin(role)) {
        return createRedirect(nextParam);
      }
      return createRedirect("/?unauthorized=admin");
    }

    // Return to the page they were previously browsing (e.g. cart checkout, menu, orders)
    return createRedirect(nextParam);
  }

  // Default redirect when no specific destination is requested:
  // Staff/Admin goes to /admin, customers go to storefront /
  if (isStaffOrAdmin(role)) {
    return createRedirect("/admin");
  }

  return createRedirect("/");
}
