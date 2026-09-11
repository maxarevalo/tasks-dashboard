import Link from "next/link";
import { ArrowLeft, Table2, ArrowRightLeft } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { formatMoney } from "@/lib/money";
import {
  addMonths,
  currentPeriod,
  isValidPeriod,
  periodRange,
} from "@/lib/period";
import {
  getExpenseMatrix,
  getUnifiedExpenseMatrix,
} from "@/features/gastos/queries";
import { getExchangeRate } from "@/features/contable/queries";
import { MatrixNav, type MatrixMode } from "./_components/matrix-nav";
import { MatrixTable } from "./matrix-table";

export const dynamic = "force-dynamic";

const WINDOW = 10;

export default async function TablaGastosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; moneda?: string; en?: string }>;
}) {
  const { desde, moneda, en } = await searchParams;
  const mode: MatrixMode =
    moneda === "USD" ? "USD" : moneda === "unificado" ? "unificado" : "ARS";
  const displayCurrency = en === "USD" ? "USD" : "ARS";
  const from =
    desde && isValidPeriod(desde)
      ? desde
      : addMonths(currentPeriod(), -(WINDOW - 1));
  const periods = periodRange(from, WINDOW);

  const rate = mode === "unificado" ? await getExchangeRate() : null;
  const matrix =
    mode === "unificado"
      ? rate?.ready
        ? await getUnifiedExpenseMatrix(periods, displayCurrency, rate.value)
        : null
      : await getExpenseMatrix(periods, mode);

  return (
    <div className="space-y-5">
      <Link
        href="/personal/gastos"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a gastos
      </Link>

      <PageHeader
        title="Tabla mensual"
        description="Todos los gastos, un mes por columna. 10 meses a la vez; ‹ › avanza de a un mes."
        icon={Table2}
      />

      <MatrixNav
        from={from}
        periods={periods}
        mode={mode}
        displayCurrency={displayCurrency}
      />

      {mode === "unificado" && rate && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <ArrowRightLeft className="h-3.5 w-3.5 text-slate-400" />
          {rate.ready ? (
            <span>
              Cotización usada: {formatMoney(rate.value, "ARS")} por USD
              {" · "}
              <Link
                href="/personal/estado-contable/unificado"
                className="font-medium text-slate-700 underline underline-offset-2"
              >
                cambiar
              </Link>
            </span>
          ) : (
            <span>
              Todavía no definiste una cotización.{" "}
              <Link
                href="/personal/estado-contable/unificado"
                className="font-medium text-slate-700 underline underline-offset-2"
              >
                Configurala acá
              </Link>{" "}
              para ver la tabla unificada.
            </span>
          )}
        </div>
      )}

      {matrix ? (
        <MatrixTable matrix={matrix} />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Configurá la cotización USD/ARS para ver la tabla unificada.
        </div>
      )}

      <p className="text-xs text-slate-400">
        Los valores en <span className="italic">cursiva con *</span> son gastos
        fijos que todavía no se cargaron en ese mes (estimados desde la
        plantilla).
      </p>
    </div>
  );
}
