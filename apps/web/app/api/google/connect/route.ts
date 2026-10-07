import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthUrl, isGoogleCalendarConfigured } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(`${origin}/login`);
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(`${origin}/agenda?google=nao_configurado`);
  }

  return NextResponse.redirect(getGoogleAuthUrl());
}
