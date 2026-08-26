import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function generateTempPassword() {
  return `Treino${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 100)}`;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: trainerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (trainerProfile?.role !== "trainer") {
    return NextResponse.json({ error: "Apenas trainers podem cadastrar alunos." }, { status: 403 });
  }

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const full_name = String(body.full_name ?? "").trim();
  const phone = String(body.phone ?? "").trim() || null;

  if (!email || !full_name) {
    return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
  }

  const admin = createAdminClient();
  const temp_password = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,
    user_metadata: {
      role: "student",
      full_name,
      trainer_id: user.id,
    },
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Não foi possível criar o aluno." },
      { status: 400 }
    );
  }

  if (phone) {
    await admin.from("profiles").update({ phone }).eq("id", created.user.id);
  }

  return NextResponse.json({
    student: { id: created.user.id, email, full_name },
    temp_password,
  });
}
