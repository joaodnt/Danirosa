"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";
import { saveProfileName } from "./actions";

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Digite um nome válido.");
      return;
    }
    startTransition(async () => {
      const res = await saveProfileName(name.trim());
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="name"
          className="text-xs font-medium text-ink-200 uppercase tracking-wider"
        >
          Seu nome
        </label>
        <Input
          id="name"
          type="text"
          autoFocus
          autoComplete="name"
          placeholder="Ex: Dani"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
          required
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/50 border border-red-900 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" disabled={pending || !name.trim()}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
        Entrar no painel
      </Button>
    </form>
  );
}
