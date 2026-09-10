import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { formatMoney } from "@/lib/money";
import { periodLabel } from "@/lib/period";
import {
  getUnifiedOverview,
  getUnifiedProjection,
} from "@/features/contable/queries";
import { ProjectionChart } from "../_components/projection-chart";
import { ProjectionTable } from "../_components/projection-table";
import { ExchangeRateCard } from "./_components/exchange-rate-card";
import { UnifiedControls } from "./_components/unified-controls";

export const dynamic = "force-dynamic";

export default async function UnificadoPage({
  searchParams,
}: {
  searchParams: Promise<{ en?: string; h?: string }>;
}) {
  const { en, h } = await searchParams;
  const displayCurrency = en === "USD" ? "USD" : "ARS";
  const horizon = [6, 12, 24].includes(Number(h)) ? Number(h) : 12;

  const [overview, { projection }] = await Promise.all([
    getUnifiedOverview(displayCurrency),
    getUnifiedProjection(horizon, displayCurrency),
  ]);

  const fmt = (v: number) => formatMoney(v, displayCurrency);
  const other = displayCurrency === "ARS" ? "USD" : "ARS";

  return (
    <div className="space-y-6">
      <Link
        href="/personal/estado-contable"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a estado contable
      </Link>

      <PageHeader
        title="Vista unificada"
        description="Ahorros, ingresos, gastos y proyección con todo convertido a una sola moneda."
        icon={Layers}
      />

      <ExchangeRateCard rate={overview.rate} />

      {!overview.rate.ready ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-6 text-center text-sm text-amber-800">
          Definí una cotización arriba para ver los números unificados.
        </div>
      ) : (
        <>
          <UnifiedControls currency={displayCurrency} horizon={horizon} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">
                Ahorros totales
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {fmt(overview.savingsTotal)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                de {other}: {fmt(overview.savingsFrom[other])}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">
                Disponible en {periodLabel(overview.period)}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {fmt(overview.availableThisMonth)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">
                Ingresos del mes
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {fmt(overview.incomeThisMonth)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">
                Gastos del mes
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {fmt(overview.expenseThisMonth)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Proyección de saldo acumulado ({displayCurrency})
            </h3>
            <ProjectionChart
              title={`Saldo acumulado unificado (${displayCurrency})`}
              currency={displayCurrency}
              startingBalance={projection.startingBalance}
              months={projection.months}
            />
            <ProjectionTable
              data={{
                currency: displayCurrency,
                startingBalance: projection.startingBalance,
                months: projection.months,
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
