import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/utils/site-url";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  const { searchParams } = new URL(request.url);
  const origin = getSiteUrl(request);
  const next = searchParams.get("next") || "/login";
  
  return NextResponse.redirect(`${origin}${next}`, { status: 302 });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  const { searchParams } = new URL(request.url);
  const origin = getSiteUrl(request);
  const next = searchParams.get("next") || "/login";
  
  return NextResponse.redirect(`${origin}${next}`, { status: 302 });
}
