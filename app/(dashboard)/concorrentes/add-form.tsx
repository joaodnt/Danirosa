"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, AtSign } from "lucide-react";
import { addCompetitor } from "./actions";

export function AddCompetitorForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addCompetitor(fd);
      if (res?.error) {
        setError(res.error);
      } else {
        setValue("");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor="username" className="text-xs font-medium text-ink-200 uppercase tracking-wider">
        Adicionar concorrente
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
          <Input
            id="username"
            name="username"
            placeholder="usuario.do.instagram"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={pending}
            required
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={pending || !value.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      <p className="text-xs text-ink-300">
        O perfil precisa ser <strong className="text-ink-100">Business</strong> ou{" "}
        <strong className="text-ink-100">Creator</strong> no Instagram.
      </p>
    </form>
  );
}
