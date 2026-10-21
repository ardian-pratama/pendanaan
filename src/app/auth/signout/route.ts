import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") || "/login";
  
  return NextResponse.redirect(`${origin}${next}`, { status: 302 });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") || "/login";
  
  return NextResponse.redirect(`${origin}${next}`, { status: 302 });
}
