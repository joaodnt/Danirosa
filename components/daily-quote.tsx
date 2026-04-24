import { getDailyMessage } from "@/lib/messages";
import { Quote } from "lucide-react";

export function DailyQuote({ name }: { name?: string }) {
  const { text, author, role } = getDailyMessage();
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-700 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 p-8 shadow-xl shadow-black/40">
      <div className="absolute -right-8 -top-8 opacity-[0.07]">
        <Quote className="h-40 w-40 text-accent-gold" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,161,75,0.15),transparent_50%)] pointer-events-none" />
      <p className="relative text-xs font-medium uppercase tracking-[0.2em] text-accent-gold">
        {today}
      </p>
      {name && (
        <p className="relative mt-2 text-sm text-ink-100">
          Para começar o dia, <span className="text-accent-gold font-semibold">{name}</span>:
        </p>
      )}
      <blockquote className="relative mt-3 text-xl font-medium leading-snug sm:text-2xl max-w-3xl text-ink-50">
        "{text}"
      </blockquote>
      <div className="relative mt-5 flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-semibold text-accent-gold">— {author}</span>
        <span className="text-ink-200">{role}</span>
      </div>
    </div>
  );
}
