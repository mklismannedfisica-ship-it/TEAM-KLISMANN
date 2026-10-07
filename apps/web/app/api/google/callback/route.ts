import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeGoogleCode } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(`${origin}/login`);
  if (!code) return NextResponse.redirect(`${origin}/agenda?google=erro`);

  try {
    const refreshToken = await exchangeGoogleCode(code);
    const { error } = await supabase
      .from("google_accounts")
      .upsert({ trainer_id: user.id, refresh_token: refreshToken });
    if (error) throw new Error(error.message);
    return NextResponse.redirect(`${origin}/agenda?google=conectado`);
  } catch (error) {
    console.error("Falha ao conectar Google Calendar:", error);
    return NextResponse.redirect(`${origin}/agenda?google=erro`);
  }
}
