import Link from "next/link";
import { CreditCard, Repeat, Receipt, CalendarX, Table2 } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { normalizePeriod, addMonths, periodLabel } from "@/lib/period";
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
        <div className="flex flex-wrap gap-2">
          <Link
            href="/personal/gastos/tabla"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Table2 className="h-4 w-4" />
            Tabla mensual
          </Link>
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
      <GenerateFixedButton period={period} items={data.pendingManualFixed} />

      {data.notContinuingNextMonth.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-medium">
            <CalendarX className="h-4 w-4" />
            {data.notContinuingNextMonth.length === 1
              ? "1 gasto fijo no continúa"
              : `${data.notContinuingNextMonth.length} gastos fijos no continúan`}{" "}
            en {periodLabel(addMonths(period, 1))}
          </p>
          <ul className="mt-1 list-inside list-disc text-xs text-amber-800">
            {data.notContinuingNextMonth.map((f, i) => (
              <li key={i}>
                {f.description}
                {f.reason === "orphan" ? " (plantilla eliminada)" : ""}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-amber-700">
            Si lo necesitás más adelante, editá el gasto fijo (fecha “hasta”) o
            creá uno nuevo.
          </p>
        </div>
      )}

      <Summary summary={data.summary} />

      <ExpensesPanel
        period={period}
        expenses={data.expenses}
        cards={data.cards}
        fixedTemplates={data.fixedTemplates}
      />
    </div>
  );
}
