import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./form";
import { Handwritten } from "@/components/handwritten";

export default async function OnboardingPage() {
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

  if (profile?.name) redirect("/");

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,62,36,0.4),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(200,161,75,0.08),transparent_50%)]" />
      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo.png"
            alt="Dani Rosa"
            className="h-20 w-20 rounded-full object-cover ring-1 ring-brand-600 shadow-xl shadow-black/40"
          />
          <h1 className="mt-4 text-2xl font-semibold text-ink-50 tracking-tight">
            Seja bem-vinda
          </h1>
          <Handwritten size="md" align="center" className="mt-1">
            O lado sexy dos vegetais
          </Handwritten>
        </div>
        <div className="rounded-2xl border border-brand-800 bg-brand-900/80 backdrop-blur p-8 shadow-2xl shadow-black/60">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-ink-50">Como podemos te chamar?</h2>
            <p className="text-sm text-ink-300 mt-1">
              Seu nome aparecerá no painel e nas mensagens personalizadas.
            </p>
          </div>
          <OnboardingForm />
        </div>
      </div>
    </div>
  );
}
