import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  name: string;
};

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("id", user.id)
    .maybeSingle();

  return data as Profile | null;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(" ")[0] ?? fullName;
}
