import { Car } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { getAutoOverview } from "@/features/auto/queries";
import { FuelLogSection } from "./_components/fuel-log-section";
import { UpcomingServiceSection } from "./_components/upcoming-service-section";
import { ServiceRecordSection } from "./_components/service-record-section";

export const dynamic = "force-dynamic";

export default async function AutoPage() {
  const overview = await getAutoOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto"
        description="Cargas de combustible, próximos services y su historial, por patente."
        icon={Car}
      />

      <datalist id="auto-plates">
        {overview.plates.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      <FuelLogSection logs={overview.fuelLogs} />
      <UpcomingServiceSection items={overview.upcomingServices} />
      <ServiceRecordSection records={overview.serviceRecords} />
    </div>
  );
}
