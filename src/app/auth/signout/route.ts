import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/utils/site-url";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  const next = request.nextUrl.searchParams.get("next") || "/login";
  const siteUrl = getSiteUrl(request);
  const baseOrigin =
    process.env.NODE_ENV === "production" &&
    request.nextUrl.origin.includes("localhost") &&
    siteUrl &&
    !siteUrl.includes("localhost")
      ? siteUrl
      : request.nextUrl.origin;
  
  return NextResponse.redirect(new URL(next, baseOrigin), { status: 302 });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  const next = request.nextUrl.searchParams.get("next") || "/login";
  const siteUrl = getSiteUrl(request);
  const baseOrigin =
    process.env.NODE_ENV === "production" &&
    request.nextUrl.origin.includes("localhost") &&
    siteUrl &&
    !siteUrl.includes("localhost")
      ? siteUrl
      : request.nextUrl.origin;
  
  return NextResponse.redirect(new URL(next, baseOrigin), { status: 302 });
}
