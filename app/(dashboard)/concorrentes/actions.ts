"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchCompetitor } from "@/lib/integrations/instagram";
import { revalidatePath } from "next/cache";

export async function addCompetitor(formData: FormData) {
  const rawUsername = String(formData.get("username") ?? "").trim();
  const username = rawUsername.replace(/^@/, "").toLowerCase();

  if (!username || !/^[a-z0-9._]{1,30}$/.test(username)) {
    return { error: "Usuário inválido. Use apenas letras, números, . e _" };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { count } = await supabase
    .from("competitors")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= 10) {
    return { error: "Você já atingiu o limite de 10 concorrentes." };
  }

  let profile;
  try {
    const data = await fetchCompetitor(username);
    profile = data.profile;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao buscar perfil no Instagram."
    };
  }

  const { error } = await supabase.from("competitors").insert({
    user_id: user.id,
    username: profile.username,
    display_name: profile.name,
    profile_pic_url: profile.profile_picture_url,
    followers_count: profile.followers_count,
    media_count: profile.media_count,
    last_synced_at: new Date().toISOString()
  });

  if (error) {
    if (error.code === "23505") return { error: "Esse concorrente já foi cadastrado." };
    return { error: error.message };
  }

  revalidatePath("/concorrentes");
  return { success: true };
}

export async function removeCompetitor(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("competitors").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/concorrentes");
  return { success: true };
}
