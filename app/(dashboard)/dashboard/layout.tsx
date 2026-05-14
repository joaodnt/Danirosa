import { PeriodSelector } from "@/components/period-selector";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <PeriodSelector />
      </div>
      {children}
    </div>
  );
}
