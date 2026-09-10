import Link from "next/link";
import { ArrowLeft, PiggyBank } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { getSavingsAccounts } from "@/features/contable/queries";
import { SavingsManager } from "./savings-manager";

export const dynamic = "force-dynamic";

export default async function AhorrosPage() {
  const accounts = await getSavingsAccounts(true);

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
        title="Ahorros"
        description="Tus cuentas de ahorro por categoría, disponibilidad y rendimiento."
        icon={PiggyBank}
      />

      <SavingsManager accounts={accounts} />
    </div>
  );
}
