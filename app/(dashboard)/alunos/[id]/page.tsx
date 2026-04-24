import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  ArrowLeft,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  Activity,
  LogIn,
  PlayCircle,
  CheckCircle2,
  MailOpen,
  Sparkles,
  Receipt
} from "lucide-react";

export const revalidate = 60;

type Student = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  course: string | null;
  status: string;
  enrolled_at: string;
};

type Order = {
  id: string;
  product_name: string;
  amount: number;
  status: string;
  payment_method: string | null;
  purchased_at: string;
};

type ActivityRow = {
  id: string;
  event_type: string;
  description: string | null;
  occurred_at: string;
};

const eventConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  login: { icon: LogIn, label: "Login", color: "text-brand-200 bg-brand-700/30" },
  lesson_viewed: { icon: PlayCircle, label: "Aula vista", color: "text-brand-300 bg-brand-700/30" },
  lesson_completed: { icon: CheckCircle2, label: "Aula concluída", color: "text-accent-gold bg-accent-gold/10" },
  email_opened: { icon: MailOpen, label: "E-mail aberto", color: "text-ink-200 bg-brand-800" },
  purchase: { icon: ShoppingBag, label: "Compra", color: "text-accent-gold bg-accent-gold/10" },
  signup: { icon: Sparkles, label: "Matrícula", color: "text-accent-gold bg-accent-gold/10" }
};

export default async function StudentDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: student }, { data: orders }, { data: activities }] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase.from("orders").select("*").eq("student_id", id).order("purchased_at", { ascending: false }),
    supabase.from("activities").select("*").eq("student_id", id).order("occurred_at", { ascending: false }).limit(30)
  ]);

  if (!student) notFound();

  const s = student as Student;
  const allOrders = (orders ?? []) as Order[];
  const paidOrders = allOrders.filter((o) => o.status === "paid");
  const acts = (activities ?? []) as ActivityRow[];

  const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);
  const productsCount = paidOrders.length;
  const avgTicket = productsCount > 0 ? totalSpent / productsCount : 0;
  const daysAsStudent = Math.floor(
    (Date.now() - new Date(s.enrolled_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/alunos"
        className="inline-flex items-center gap-1.5 text-sm text-ink-200 hover:text-accent-gold w-fit transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para alunos
      </Link>

      <ProfileHeader student={s} daysAsStudent={daysAsStudent} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total investido"
          value={formatCurrency(totalSpent)}
          icon={CreditCard}
          accent="gold"
        />
        <MetricCard
          label="Produtos comprados"
          value={formatNumber(productsCount)}
          icon={ShoppingBag}
          accent="brand"
        />
        <MetricCard
          label="Ticket médio"
          value={formatCurrency(avgTicket)}
          icon={TrendingUp}
          accent="sage"
        />
        <MetricCard
          label="Eventos trackeados"
          value={formatNumber(acts.length)}
          icon={Activity}
          accent="terracotta"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OrdersSection orders={allOrders} />
        <ActivitySection activities={acts} />
      </div>
    </div>
  );
}

function ProfileHeader({
  student,
  daysAsStudent
}: {
  student: Student;
  daysAsStudent: number;
}) {
  const initials = student.name
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <Card>
      <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-start">
        <div className="h-20 w-20 rounded-full bg-brand-700 ring-2 ring-brand-600 flex items-center justify-center text-2xl font-bold text-accent-gold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-ink-50">{student.name}</h1>
              <p className="text-sm text-ink-300">Matriculada há {daysAsStudent} dias</p>
            </div>
            <span
              className={
                student.status === "active"
                  ? "inline-flex items-center rounded-full bg-brand-700/40 px-3 py-1 text-xs font-medium text-accent-gold ring-1 ring-brand-600"
                  : "inline-flex items-center rounded-full bg-brand-800 px-3 py-1 text-xs font-medium text-ink-300"
              }
            >
              {student.status === "active" ? "Ativo" : student.status}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InfoItem icon={Mail} label="E-mail" value={student.email} />
            <InfoItem icon={Phone} label="Telefone" value={student.phone ?? "—"} />
            <InfoItem icon={GraduationCap} label="Curso" value={student.course ?? "—"} />
            <InfoItem
              icon={Calendar}
              label="Matrícula"
              value={new Date(student.enrolled_at).toLocaleDateString("pt-BR")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-brand-800/60 ring-1 ring-brand-800 px-3 py-2">
      <p className="text-xs text-ink-300 flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="text-sm font-medium text-ink-50 mt-0.5 truncate">{value}</p>
    </div>
  );
}

function OrdersSection({ orders }: { orders: Order[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-ink-50 text-base font-semibold">
          <Receipt className="h-4 w-4 text-accent-gold" />
          Histórico de compras
        </CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-ink-300 py-6 text-center">Nenhuma compra ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-brand-800">
            {orders.map((o) => (
              <li key={o.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-50 truncate">{o.product_name}</p>
                  <p className="text-xs text-ink-300 mt-0.5">
                    {new Date(o.purchased_at).toLocaleDateString("pt-BR")}
                    {o.payment_method && ` · ${o.payment_method === "pix" ? "Pix" : "Cartão"}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={
                      o.status === "paid"
                        ? "text-sm font-semibold text-accent-gold"
                        : "text-sm font-semibold text-ink-300"
                    }
                  >
                    {formatCurrency(Number(o.amount))}
                  </p>
                  {o.status !== "paid" && (
                    <p className="text-[10px] uppercase tracking-wider text-accent-terracotta mt-0.5">
                      {o.status}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ActivitySection({ activities }: { activities: ActivityRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-ink-50 text-base font-semibold">
          <Activity className="h-4 w-4 text-accent-gold" />
          Trackeamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-ink-300 py-6 text-center">
            Nenhum evento registrado.
          </p>
        ) : (
          <ol className="flex flex-col gap-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-brand-800">
            {activities.map((a) => {
              const cfg = eventConfig[a.event_type] ?? {
                icon: Activity,
                label: a.event_type,
                color: "text-ink-200 bg-brand-800"
              };
              const Icon = cfg.icon;
              return (
                <li key={a.id} className="flex items-start gap-3 relative">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full shrink-0 ring-2 ring-brand-900 relative z-10 ${cfg.color}`}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-ink-50">{cfg.label}</p>
                      <span className="text-xs text-ink-300">
                        {timeAgo(a.occurred_at)}
                      </span>
                    </div>
                    {a.description && (
                      <p className="text-sm text-ink-200 mt-0.5">{a.description}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `há ${days}d`;
  if (hours > 0) return `há ${hours}h`;
  if (mins > 0) return `há ${mins}min`;
  return "agora";
}
