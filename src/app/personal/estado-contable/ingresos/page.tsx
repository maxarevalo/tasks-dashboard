import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { getIncomes, getSavingsAccounts } from "@/features/contable/queries";
import { IncomeManager } from "./income-manager";

export const dynamic = "force-dynamic";

export default async function IngresosPage({
  searchParams,
}: {
  searchParams: Promise<{ accion?: string }>;
}) {
  const { accion } = await searchParams;
  const [incomes, accounts] = await Promise.all([
    getIncomes(),
    getSavingsAccounts(false),
  ]);

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

      <IncomeManager
        incomes={incomes}
        accounts={accounts}
        initialAction={
          accion === "cargar" || accion === "cobrar" ? accion : undefined
        }
      />
    </div>
  );
}
