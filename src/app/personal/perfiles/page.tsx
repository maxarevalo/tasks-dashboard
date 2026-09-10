import { PageHeader } from "@/components/page-parts";
import { Database } from "lucide-react";
import { getActiveProfile } from "@/lib/profile";
import { ProfilesManager } from "./profiles-manager";

export const dynamic = "force-dynamic";

export default async function PerfilesPage() {
  const { active, profiles } = await getActiveProfile();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfiles de datos"
        description="Ambientes separados (real, ficticio, prueba…) sobre la misma base."
        icon={Database}
      />
      <ProfilesManager profiles={profiles} activeKey={active.key} />
    </div>
  );
}
