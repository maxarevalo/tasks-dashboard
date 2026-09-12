import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { formatMoney } from "@/lib/money";
import { periodLabel } from "@/lib/period";
import {
  getContableOverview,
  getProjection,
} from "@/features/contable/queries";
import { AVAILABILITY_LABELS } from "@/features/contable/types";
import { AVAILABILITY } from "@/models/contable";
import { HorizonSelector } from "../_components/horizon-selector";
import { HORIZONS } from "../_components/horizons";
import { ProjectionTable } from "../_components/projection-table";
import { ProjectionChart } from "../_components/projection-chart";

export const dynamic = "force-dynamic";

function Money({ ars, usd }: { ars: number; usd: number }) {
  return (
    <div>
      <p className="text-lg font-semibold text-slate-900 tabular-nums">
        {formatMoney(ars, "ARS")}
      </p>
      {usd !== 0 && (
        <p className="text-sm text-slate-500 tabular-nums">
          {formatMoney(usd, "USD")}
        </p>
      )}
    </div>
  );
}

export default async function DetallePage({
  searchParams,
}: {
  searchParams: Promise<{ h?: string }>;
}) {
  const { h } = await searchParams;
  const horizon = HORIZONS.includes(Number(h) as (typeof HORIZONS)[number])
    ? Number(h)
    : 3;

  const [overview, projection] = await Promise.all([
    getContableOverview(),
    getProjection(horizon),
  ]);

  const activeProjections = projection.projections.filter(
    (p) => p.startingBalance !== 0 || p.months.some((m) => m.income || m.expense),
  );

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
        title="Detalle por moneda"
        description="Ahorros, ingresos y proyección de tu saldo mes a mes, sin convertir."
        icon={Wallet}
      />

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Ahorros totales</p>
          <div className="mt-1">
            <Money
              ars={overview.savingsTotal.ARS}
              usd={overview.savingsTotal.USD}
            />
          </div>
          <div className="mt-2 border-t border-slate-100 pt-2">
            <p className="text-xs font-medium text-slate-500">
              Ahorros REALES
            </p>
            <div className="mt-1">
              <Money
                ars={overview.savingsRealTotal.ARS}
                usd={overview.savingsRealTotal.USD}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Ahorros totales − plazos fijos (PF Dardo)
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Disponible en {periodLabel(overview.period)}
          </p>
          <div className="mt-1">
            <Money
              ars={overview.availableThisMonth.ARS}
              usd={overview.availableThisMonth.USD}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Ahorros + ingresos − gastos del mes
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Ingresos del mes</p>
          <div className="mt-1">
            <Money
              ars={overview.incomeThisMonth.ARS}
              usd={overview.incomeThisMonth.USD}
            />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Gastos del mes</p>
          <div className="mt-1">
            <Money
              ars={overview.expenseThisMonth.ARS}
              usd={overview.expenseThisMonth.USD}
            />
          </div>
        </div>
      </div>

      {/* Ahorros por disponibilidad */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <header className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Por disponibilidad
          </header>
          <table className="w-full text-sm">
            <tbody>
              {AVAILABILITY.map((a) => {
                const v = overview.savingsByAvailability[a];
                return (
                  <tr
                    key={a}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-2 text-slate-700">
                      {AVAILABILITY_LABELS[a]}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-900">
                      {v.ARS ? formatMoney(v.ARS, "ARS") : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                      {v.USD ? formatMoney(v.USD, "USD") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <header className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Por categoría
          </header>
          {overview.savingsByCategory.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500">
              Todavía no cargaste ahorros.
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {overview.savingsByCategory.map((c) => (
                  <tr
                    key={c.category}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-2 text-slate-700">{c.category}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-900">
                      {c.ARS ? formatMoney(c.ARS, "ARS") : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                      {c.USD ? formatMoney(c.USD, "USD") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Proyección */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Proyección de saldo acumulado
          </h3>
          <HorizonSelector value={horizon} />
        </div>

        {activeProjections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Cargá ahorros e ingresos para ver la proyección.
          </div>
        ) : (
          activeProjections.map((p) => (
            <div key={p.currency} className="space-y-3">
              <ProjectionChart
                title={`Saldo acumulado ${p.currency}`}
                currency={p.currency}
                startingBalance={p.startingBalance}
                months={p.months}
                realOffset={
                  overview.savingsTotal[p.currency] -
                  overview.savingsRealTotal[p.currency]
                }
              />
              <ProjectionTable data={p} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
