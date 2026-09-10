import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { getIncomes } from "@/features/contable/queries";
import { IncomeManager } from "./income-manager";

export const dynamic = "force-dynamic";

export default async function IngresosPage() {
  const incomes = await getIncomes();

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
        title="Ingresos"
        description="Ingresos por origen: mensuales fijos o únicos, confirmados o posibles."
        icon={TrendingUp}
      />

      <IncomeManager incomes={incomes} />
    </div>
  );
}
