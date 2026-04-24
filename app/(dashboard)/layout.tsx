import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { firstName } from "@/lib/profile";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.name) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-brand-950">
      <Sidebar />
      <div className="lg:pl-64">
        <Header name={firstName(profile.name)} />
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
