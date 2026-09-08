import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { getCards } from "@/features/gastos/queries";
import { CardManager } from "./card-manager";

export const dynamic = "force-dynamic";

export default async function TarjetasPage() {
  const cards = await getCards(true);

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
        title="Tarjetas"
        description="Tus tarjetas de crédito, con fecha de cierre y vencimiento."
        icon={CreditCard}
      />

      <CardManager cards={cards} />
    </div>
  );
}
