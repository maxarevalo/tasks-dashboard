import { Droplet } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { getGlucoseEntries } from "@/features/salud/queries";
import { GlucoseForm } from "./_components/glucose-form";
import { GlucoseStats } from "./_components/glucose-stats";
import { GlucoseChart } from "./_components/glucose-chart";
import { GlucoseHistory } from "./_components/glucose-history";

export const dynamic = "force-dynamic";

export default async function GlucosaPage() {
  const entries = await getGlucoseEntries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Glucosa"
        description="Registrá tu glucosa en sangre (mg/dL) y seguí cómo evoluciona."
        icon={Droplet}
      />
      <GlucoseForm />
      <GlucoseStats entries={entries} />
      <GlucoseChart entries={entries} />
      <GlucoseHistory entries={entries} />
    </div>
  );
}
