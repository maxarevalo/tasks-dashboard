import { Landmark } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { getPfOverview } from "@/features/pf-dardo/queries";
import { PfManager } from "./pf-manager";

export const dynamic = "force-dynamic";

export default async function PfDardoPage() {
  const overview = await getPfOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="PF Dardo"
        description="Plazos fijos: tabla de vencimientos, informe de totales y simulación con ingresos/egresos."
        icon={Landmark}
      />
      <PfManager overview={overview} />
    </div>
  );
}
