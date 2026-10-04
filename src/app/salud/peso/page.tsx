import { Scale } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { getWeightOverview } from "@/features/salud/queries";
import { WeightForm } from "./_components/weight-form";
import { WeightStats } from "./_components/weight-stats";
import { WeightChart } from "./_components/weight-chart";
import { WeightHistory } from "./_components/weight-history";

export const dynamic = "force-dynamic";

export default async function PesoPage() {
  const overview = await getWeightOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Peso"
        description="Registrá tu peso y seguí el progreso semana a semana."
        icon={Scale}
      />
      <WeightForm lastWeight={overview.entries[0]?.weight ?? null} />
      <WeightStats overview={overview} />
      <WeightChart weeks={overview.weeks} entries={overview.entries} />
      <WeightHistory entries={overview.entries} />
    </div>
  );
}
