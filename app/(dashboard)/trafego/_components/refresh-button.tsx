// MOCKUP — botão sem revalidate real. Na implementação vai usar server action com revalidatePath.
"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2 } from "lucide-react";

export function RefreshButton() {
  const [isPending, startTransition] = useTransition();
  const [justDone, setJustDone] = useState(false);

  function refresh() {
    startTransition(() => {
      setTimeout(() => {
        setJustDone(true);
        setTimeout(() => setJustDone(false), 2000);
      }, 1200);
    });
  }

  if (justDone) {
    return (
      <Button variant="outline" disabled>
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        Atualizado
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={refresh} disabled={isPending}>
      <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Atualizando..." : "Atualizar agora"}
    </Button>
  );
}
