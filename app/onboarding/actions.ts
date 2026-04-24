"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveProfileName(name: string) {
  const clean = name.trim();
  if (clean.length < 2) return { error: "Digite um nome válido" };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      name: clean,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}
