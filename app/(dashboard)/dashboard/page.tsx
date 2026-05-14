import { redirect } from "next/navigation";

export default async function DashboardIndex({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const query = qs.toString();
  redirect(query ? `/dashboard/vendas?${query}` : "/dashboard/vendas");
}
