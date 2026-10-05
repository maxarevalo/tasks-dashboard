import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import {
  getReconciliations,
  getSavingsAccounts,
} from "@/features/contable/queries";
import { CierreForm } from "./cierre-form";
import { CierreHistory } from "./cierre-history";

export const dynamic = "force-dynamic";

export default async function CierrePage() {
  const [accounts, history] = await Promise.all([
    getSavingsAccounts(false),
    getReconciliations(),
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
        title="Cierre de mes"
        description="Compará el saldo de cada cuenta en la app con el real del banco. Lo que falte queda como gasto “No registrado”."
        icon={ClipboardCheck}
      />

      <CierreForm accounts={accounts} />
      <CierreHistory history={history} />
    </div>
  );
}
