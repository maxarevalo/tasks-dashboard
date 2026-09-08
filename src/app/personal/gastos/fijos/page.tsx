import Link from "next/link";
import { ArrowLeft, Repeat } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { getFixedExpenses, getCards } from "@/features/gastos/queries";
import { FixedManager } from "./fixed-manager";

export const dynamic = "force-dynamic";

export default async function FijosPage() {
  const [fixed, cards] = await Promise.all([getFixedExpenses(), getCards(true)]);

  return (
    <div className="space-y-6">
      <Link
        href="/personal/gastos"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a gastos
      </Link>

      <PageHeader
        title="Gastos fijos"
        description="Plantillas de gastos que se repiten todos los meses."
        icon={Repeat}
      />

      <FixedManager fixed={fixed} cards={cards} />
    </div>
  );
}
