import Link from "next/link";
import { CreditCard, Repeat, Receipt } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { normalizePeriod } from "@/lib/period";
import { getMonthData } from "@/features/gastos/queries";
import { MonthNav } from "./_components/month-nav";
import { Summary } from "./_components/summary";
import { ExpensesPanel } from "./_components/expenses-panel";
import { GenerateFixedButton } from "./_components/generate-fixed-button";
import { AutoFixedSync } from "./_components/auto-fixed-sync";

export const dynamic = "force-dynamic";

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const period = normalizePeriod(mes);
  const data = await getMonthData(period);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gastos mensuales"
        description="Tarjetas, préstamos, gastos fijos y previstos, mes a mes."
        icon={Receipt}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav period={period} />
        <div className="flex gap-2">
          <Link
            href="/personal/gastos/tarjetas"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <CreditCard className="h-4 w-4" />
            Tarjetas
          </Link>
          <Link
            href="/personal/gastos/fijos"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Repeat className="h-4 w-4" />
            Gastos fijos
          </Link>
        </div>
      </div>

      <AutoFixedSync period={period} count={data.pendingAutoFixedCount} />
      <GenerateFixedButton
        period={period}
        count={data.pendingManualFixedCount}
      />

      <Summary summary={data.summary} />

      <ExpensesPanel
        period={period}
        expenses={data.expenses}
        cards={data.cards}
      />
    </div>
  );
}
