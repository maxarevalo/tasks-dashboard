import Link from "next/link";
import { ArrowLeft, Table2 } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import {
  addMonths,
  currentPeriod,
  isValidPeriod,
  periodRange,
} from "@/lib/period";
import { getExpenseMatrix } from "@/features/gastos/queries";
import { MatrixNav } from "./_components/matrix-nav";
import { MatrixTable } from "./matrix-table";

export const dynamic = "force-dynamic";

const WINDOW = 10;

export default async function TablaGastosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; moneda?: string }>;
}) {
  const { desde, moneda } = await searchParams;
  const currency = moneda === "USD" ? "USD" : "ARS";
  const from =
    desde && isValidPeriod(desde)
      ? desde
      : addMonths(currentPeriod(), -(WINDOW - 1));
  const periods = periodRange(from, WINDOW);

  const matrix = await getExpenseMatrix(periods, currency);

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
        currency={currency}
        hasOtherCurrency={matrix.hasOtherCurrency}
      />

      <MatrixTable matrix={matrix} />

      <p className="text-xs text-slate-400">
        Los valores en <span className="italic">cursiva con *</span> son gastos
        fijos que todavía no se cargaron en ese mes (estimados desde la
        plantilla).
      </p>
    </div>
  );
}
