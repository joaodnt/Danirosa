"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateCourseCover(courseId: string, coverUrl: string) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("courses")
    .update({ cover_url: coverUrl })
    .eq("id", courseId);

  if (error) return { error: error.message };

  revalidatePath("/membros");
  revalidatePath(`/membros/[course]`, "page");
  return { success: true };
}

export async function removeCourseCover(courseId: string) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("courses")
    .update({ cover_url: null })
    .eq("id", courseId);

  if (error) return { error: error.message };

  revalidatePath("/membros");
  return { success: true };
}
