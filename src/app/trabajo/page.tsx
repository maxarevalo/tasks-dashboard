import { Briefcase } from "lucide-react";
import { PageHeader, ComingSoon } from "@/components/page-parts";

export default function TrabajoHome() {
  return (
    <div>
      <PageHeader
        title="Trabajo"
        description="Todo lo relacionado con tu actividad laboral."
        icon={Briefcase}
      />
      <ComingSoon note="Esta sección todavía no tiene módulos. La vamos a desarrollar más adelante." />
    </div>
  );
}
